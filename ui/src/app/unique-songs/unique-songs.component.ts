import { CommonModule } from '@angular/common';
import { Component, OnInit, Signal, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { UniqueSongsService, UniqueSong } from '../services/unique-songs.service';

type UniqueForm = FormGroup<{
  title: FormControl<string>;
  author: FormControl<string>;
  aliases: FormControl<string>;
  notes: FormControl<string>;
}>;

@Component({
  selector: 'app-unique-songs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatSortModule, MatDialogModule, MatButtonModule],
  templateUrl: './unique-songs.component.html',
  styleUrl: './unique-songs.component.scss'
})
export class UniqueSongsComponent implements OnInit {
  songs = signal<UniqueSong[]>([]);
  dataSource = new MatTableDataSource<UniqueSong>([]);
  displayedColumns: Array<'title' | 'author' | 'aliases' | 'notes' | 'updated' | 'actions'> = ['title', 'author', 'aliases', 'notes', 'updated', 'actions'];

  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  editingId = signal<string | null>(null);

  form!: UniqueForm;

  constructor(private readonly fb: FormBuilder, private readonly uniqueSongs: UniqueSongsService, private readonly dialog: MatDialog) {
    this.form = this.fb.nonNullable.group({
      title: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      author: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      aliases: this.fb.nonNullable.control(''),
      notes: this.fb.nonNullable.control('')
    });

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'title':
          return item.title?.toLowerCase?.() ?? '';
        case 'author':
          return item.author?.toLowerCase?.() ?? '';
        case 'aliases':
          return item.aliases.join(' ').toLowerCase();
        case 'notes':
          return item.notes?.toLowerCase?.() ?? '';
        case 'updated':
          return item.updatedAt ?? '';
        default:
          return '';
      }
    };
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.uniqueSongs.list().subscribe({
      next: (data) => {
            this.songs.set(data);
            this.dataSource.data = data;
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Failed to load unique songs.');
        this.loading.set(false);
      }
    });
  }

  startEdit(song: UniqueSong): void {
    this.editingId.set(song.id);
    this.form.patchValue({
      title: song.title,
      author: song.author,
      aliases: song.aliases.join(', '),
      notes: song.notes ?? ''
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ title: '', author: '', aliases: '', notes: '' });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    const payload = {
      id: this.editingId() ?? undefined,
      title: value.title.trim(),
      author: value.author.trim(),
      aliases: this.parseAliases(value.aliases),
      notes: value.notes?.trim() ?? ''
    };

    this.saving.set(true);
    this.error.set(null);

    this.uniqueSongs.save(payload).subscribe({
      next: (saved) => {
        const current = this.songs();
        const idx = current.findIndex((s) => s.id === saved.id);
        const updated = idx >= 0 ? [...current.slice(0, idx), saved, ...current.slice(idx + 1)] : [...current, saved];
        const sorted = updated.sort((a, b) => a.title.localeCompare(b.title));
        this.songs.set(sorted);
        this.dataSource.data = sorted;
        this.saving.set(false);
        this.editingId.set(null);
        this.form.reset({ title: '', author: '', aliases: '', notes: '' });
      },
      error: (err) => {
        console.error(err);
        this.error.set('Failed to save song.');
        this.saving.set(false);
      }
    });
  }

  delete(song: UniqueSong): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialog, {
      width: '400px',
      data: { title: song.title }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      
      if (this.saving()) return;
      this.saving.set(true);
      this.uniqueSongs.delete(song.id).subscribe({
        next: () => {
          const filtered = this.songs().filter((s) => s.id !== song.id);
          this.songs.set(filtered);
          this.dataSource.data = filtered;
          if (this.editingId() === song.id) {
            this.editingId.set(null);
            this.form.reset({ title: '', author: '', aliases: '', notes: '' });
          }
          this.saving.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Failed to delete song.');
          this.saving.set(false);
        }
      });
    });
  }

  private parseAliases(input: string | null | undefined): string[] {
    if (!input) return [];
    return input
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }
}

import { Inject } from '@angular/core';

@Component({
  selector: 'app-confirm-delete',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirm Delete</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete "{{ data.title }}"?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDeleteDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
