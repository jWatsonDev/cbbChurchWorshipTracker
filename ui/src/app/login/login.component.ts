import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  status = signal<'idle' | 'loading' | 'error' | 'ok'>('idle');
  error = signal<string | null>(null);
  user = this.auth.username;
  authed = this.auth.isAuthenticated;

  ngOnInit(): void {
    // noop
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.status() === 'loading') return;

    this.status.set('loading');
    this.error.set(null);

    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        this.status.set('ok');
        this.form.patchValue({ password: '' });
      },
      error: (err) => {
        console.error(err);
        this.status.set('error');
        this.error.set('Login failed. Check username/password.');
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.status.set('idle');
    this.error.set(null);
  }
}
