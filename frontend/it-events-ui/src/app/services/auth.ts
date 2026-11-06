import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AccountResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest
} from '../models/auth.models';

const ACCOUNT_KEY = 'account';
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private baseUrl = '/api/auth';

  currentAccount = signal<AccountResponse | null>(this.loadAccount());

  register(body: RegisterRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.baseUrl}/register`, body);
  }

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, body).pipe(
      tap(res => {
        this.currentAccount.set(res.account);
        this.write(ACCOUNT_KEY, JSON.stringify(res.account));
        this.write(ACCESS_KEY, res.accessToken);
        this.write(REFRESH_KEY, res.refreshToken);
      })
    );
  }

  logout(): void {
    this.currentAccount.set(null);
    [ACCOUNT_KEY, ACCESS_KEY, REFRESH_KEY].forEach(k => this.remove(k));
  }

  getAccessToken(): string | null {
    return this.read(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return this.read(REFRESH_KEY);
  }

  private loadAccount(): AccountResponse | null {
    try {
      const raw = this.read(ACCOUNT_KEY);
      return raw ? (JSON.parse(raw) as AccountResponse) : null;
    } catch {
      return null;
    }
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private write(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch {}
  }

  private remove(key: string): void {
    try { localStorage.removeItem(key); } catch {}
  }
}