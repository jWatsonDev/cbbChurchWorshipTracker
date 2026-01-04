import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  accessToken: string;
  username: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBase = environment.apiUrl;
  private readonly storageKey = 'auth_token';
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
          this.persist(res.accessToken, res.username);
        })
      );
  }

  logout(): void {
    this.persist(null, null);
  }

  private persist(token: string | null, username: string | null): void {
    this.tokenSignal.set(token);
    this.userSignal.set(username);
    if (token) {
      localStorage.setItem(this.storageKey, token);
    } else {
      localStorage.removeItem(this.storageKey);
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

  private readUser(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.userKey);
  }
}
