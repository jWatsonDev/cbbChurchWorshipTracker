import { CommonModule } from '@angular/common';
import { Component, ViewChild, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SongsService, SongEntry } from '../services/songs.service';
import { UniqueSongsService, UniqueSong } from '../services/unique-songs.service';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-songs-table',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './songs-table.component.html',
  styleUrl: './songs-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongsTableComponent implements OnInit {
  displayedColumns: Array<'date' | 'songs' | 'count' | 'actions'> = ['date', 'songs', 'count', 'actions'];
  dataSource = new MatTableDataSource<SongEntry>([]);
  loading = true;
  error: string | null = null;
  createError: string | null = null;
  creating = false;

  uniqueSongs: UniqueSong[] = [];
  filteredSongs$!: Observable<UniqueSong[]>;
  createForm: FormGroup;
  private dialogRef: MatDialogRef<unknown> | null = null;
  editing: SongEntry | null = null;
  songInput = '';

  private sortRef: MatSort | null = null;

  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    this.sortRef = sort ?? null;
    this.applySort();
  }

  @ViewChild('createDialog') createDialog?: TemplateRef<unknown>;
  constructor(
    private readonly songsService: SongsService,
    private readonly uniqueSongsService: UniqueSongsService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog
  ) {
    this.createForm = this.fb.group({
      date: [null, Validators.required],
      songs: [[], Validators.required],
      songInput: ['']
    });

    this.filteredSongs$ = this.createForm.get('songInput')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterSongs(value || ''))
    );
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data, filter) => {
      // Match on songs or date (case-insensitive)
      const normalizedFilter = filter.trim().toLowerCase();
      const songText = data.songs.join(' ').toLowerCase();
      const dateText = data.date.toLowerCase();
      return songText.includes(normalizedFilter) || dateText.includes(normalizedFilter);
    };

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'count':
          return item.songs.length;
        case 'songs':
          return item.songs.join(' ').toLowerCase();
        case 'date':
          return item.date.toLowerCase();
        default:
          return '';
      }
    };

    this.songsService.getSongs().subscribe({
      next: (songs) => {
        this.dataSource.data = songs;
        console.info('Songs loaded:', songs.length);
        this.applySort();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Songs load failed', err);
        this.error = 'Failed to load songs. Check that CBBChurch_Songs.json is available in assets.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    this.uniqueSongsService.list().subscribe({
      next: (songs) => {
        this.uniqueSongs = songs.sort((a, b) => a.title.localeCompare(b.title));
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Unique songs load failed', err);
        this.cdr.markForCheck();
      }
    });
  }

  private applySort(): void {
    if (this.sortRef) {
      this.dataSource.sort = this.sortRef;
    }
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    const normalized = value.trim().toLowerCase();
    // MatTableDataSource only re-runs filterPredicate when the filter value changes.
    // Use a single space when empty to force an update and hit the predicate.
    this.dataSource.filter = normalized || ' ';
  }

  openCreateDialog(): void {
    if (!this.createDialog) return;
    this.editing = null;
    const today = new Date();
    this.createForm.reset({ date: today, songs: [], songInput: '' });
    this.songInput = '';
    this.createError = null;
    this.dialogRef = this.dialog.open(this.createDialog, {
      width: '70vw',
      maxWidth: '1200px',
      height: '70vh',
      panelClass: 'songs-dialog-panel'
    });
  }

  closeCreateDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  openEditDialog(entry: SongEntry): void {
    if (!this.createDialog) return;
    this.editing = entry;
    this.createForm.reset({ date: this.parseDate(entry.date), songs: [...entry.songs], songInput: '' });
    this.songInput = '';
    this.createError = null;
    this.dialogRef = this.dialog.open(this.createDialog, {
      width: '70vw',
      maxWidth: '1200px',
      height: '70vh',
      panelClass: 'songs-dialog-panel'
    });
  }

  saveSunday(): void {
    if (this.createForm.invalid) return;
    this.creating = true;
    this.createError = null;

    const { date, songs } = this.createForm.value as { date: string | Date; songs: string[] };
    const trimmedSongs = (songs ?? []).map((s) => s.trim()).filter(Boolean);
    const apiDate = this.formatDate(date);
    const isEditing = !!this.editing;
    const keyDate = this.editing?.date ?? apiDate;

    const request$ = isEditing
      ? this.songsService.updateSunday(keyDate, trimmedSongs, apiDate)
      : this.songsService.createSunday({ date: apiDate, songs: trimmedSongs });

    request$.subscribe({
      next: (entry) => {
        let updated: SongEntry[];
        if (isEditing) {
          updated = this.dataSource.data.map((row) => (row.date === keyDate ? entry : row));
        } else {
          updated = [...this.dataSource.data, entry];
        }
        this.dataSource.data = updated.sort((a, b) => b.date.localeCompare(a.date));
        this.createForm.reset({ date: '', songs: [], songInput: '' });
        this.songInput = '';
        this.creating = false;
        this.editing = null;
        if (this.dialogRef) {
          this.dialogRef.close();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Create Sunday failed', err);
        this.createError = isEditing ? 'Failed to update Sunday entry' : 'Failed to create Sunday entry';
        this.creating = false;
        this.cdr.markForCheck();
      }
    });
  }

  addSong(): void {
    const raw = (this.createForm.value as { songInput?: string }).songInput ?? this.songInput;
    const value = (raw ?? '').trim();
    if (!value) return;

    const current = ((this.createForm.value as { songs?: string[] }).songs ?? []).slice();
    if (!current.includes(value)) {
      current.push(value);
      this.createForm.patchValue({ songs: current });
    }

    this.songInput = '';
    this.createForm.patchValue({ songInput: '' });
    this.cdr.markForCheck();
  }

  addSongFromSelection(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value?.toString() ?? '';
    this.createForm.patchValue({ songInput: value });
    this.songInput = value;
    this.addSong();
  }

  removeSong(song: string): void {
    const current = ((this.createForm.value as { songs?: string[] }).songs ?? []).filter((s) => s !== song);
    this.createForm.patchValue({ songs: current });
    this.cdr.markForCheck();
  }

  reorderSongs(event: CdkDragDrop<string[]>): void {
    const current = ((this.createForm.value as { songs?: string[] }).songs ?? []).slice();
    moveItemInArray(current, event.previousIndex, event.currentIndex);
    this.createForm.patchValue({ songs: current });
    this.cdr.markForCheck();
  }

  private parseDate(value: string | Date | null | undefined): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  private formatDate(value: string | Date | null | undefined): string {
    const d = value instanceof Date ? value : this.parseDate(value ?? null);
    // Keep it date-only YYYY-MM-DD to avoid TZ drift
    const iso = d.toISOString();
    return iso.slice(0, 10);
  }

  private filterSongs(query: string): UniqueSong[] {
    if (!query || !query.trim()) return this.uniqueSongs;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return this.uniqueSongs.filter(song => {
      const title = song.title.toLowerCase();
      const author = song.author.toLowerCase();
      const aliases = song.aliases.map(a => a.toLowerCase());
      
      // Exact substring match
      if (title.includes(normalizedQuery) || author.includes(normalizedQuery)) {
        return true;
      }
      
      // Check aliases
      if (aliases.some(alias => alias.includes(normalizedQuery))) {
        return true;
      }
      
      // Fuzzy match: check if all characters in query appear in order in title
      let titleIndex = 0;
      for (let i = 0; i < normalizedQuery.length; i++) {
        const char = normalizedQuery[i];
        const foundIndex = title.indexOf(char, titleIndex);
        if (foundIndex === -1) return false;
        titleIndex = foundIndex + 1;
      }
      
      return true;
    });
  }

  deleteSunday(entry: SongEntry): void {
    const dialogRef = this.dialog.open(ConfirmDeleteSundayDialog, {
      width: '400px',
      data: { date: entry.date }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.songsService.deleteSunday(entry.date).subscribe({
        next: () => {
          this.dataSource.data = this.dataSource.data.filter((row) => row.date !== entry.date);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Delete Sunday failed', err);
        }
      });
    });
  }
}

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-delete-sunday',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirm Delete</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete the Sunday for {{ data.date }}?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDeleteSundayDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteSundayDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { date: string }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

