import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBase = environment.apiUrl;
  private readonly storageKey = 'auth_token';
  private readonly refreshKey = 'auth_refresh_token';
  private readonly userKey = 'auth_user';

  private tokenSignal = signal<string | null>(this.readToken());
  private userSignal = signal<string | null>(this.readUser());

  readonly token = computed(() => this.tokenSignal());
  readonly username = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiBase}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          this.persist(res.accessToken, res.refreshToken, res.username);
        })
      );
  }

  logout(): void {
    this.persist(null, null, null);
  }

  /** Attempt silent renewal using the stored refresh token. */
  refresh(): Observable<LoginResponse> {
    const refreshToken = this.readRefreshToken();
    if (!refreshToken) {
      this.logout();
      return new Observable((sub) => sub.error(new Error('No refresh token')));
    }
    return this.http
      .post<LoginResponse>(`${this.apiBase}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          this.persist(res.accessToken, res.refreshToken, res.username);
        })
      );
  }

  private persist(token: string | null, refreshToken: string | null, username: string | null): void {
    this.tokenSignal.set(token);
    this.userSignal.set(username);
    if (token) {
      localStorage.setItem(this.storageKey, token);
    } else {
      localStorage.removeItem(this.storageKey);
    }

    if (refreshToken) {
      localStorage.setItem(this.refreshKey, refreshToken);
    } else {
      localStorage.removeItem(this.refreshKey);
    }

    if (username) {
      localStorage.setItem(this.userKey, username);
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  private readToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.storageKey);
  }

  private readRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.refreshKey);
  }

  private readUser(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.userKey);
  }
}
