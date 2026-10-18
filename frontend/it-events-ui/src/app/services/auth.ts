import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AccountResponse,
  LoginRequest,
  RegisterOrganizerRequest,
  RegisterUserRequest
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private baseUrl = '/api/auth';

  currentAccount = signal<AccountResponse | null>(this.load());

  registerUser(body: RegisterUserRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.baseUrl}/register/user`, body);
  }

  registerOrganizer(body: RegisterOrganizerRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.baseUrl}/register/organizer`, body);
  }

  login(body: LoginRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(`${this.baseUrl}/login`, body).pipe(
      tap(account => {
        this.currentAccount.set(account);
        try { localStorage.setItem('account', JSON.stringify(account)); } catch {}
      })
    );
  }

  logout(): void {
    this.currentAccount.set(null);
    try { localStorage.removeItem('account'); } catch {}
  }

  private load(): AccountResponse | null {
    try {
      const raw = localStorage.getItem('account');
      return raw ? (JSON.parse(raw) as AccountResponse) : null;
    } catch {
      return null;
    }
  }
}