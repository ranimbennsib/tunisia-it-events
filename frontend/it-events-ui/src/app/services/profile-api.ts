import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountResponse } from '../models/auth.models';
import {
  ChangePasswordBody, ProfileResponse, UpdateAccountBody, UpdateProfileBody
} from '../models/profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private http = inject(HttpClient);

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>('/api/profiles/me');
  }
  updateProfile(body: UpdateProfileBody): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>('/api/profiles/me', body);
  }
  getAccount(): Observable<AccountResponse> {
    return this.http.get<AccountResponse>('/api/accounts/me');
  }
  updateAccount(body: UpdateAccountBody): Observable<AccountResponse> {
    return this.http.put<AccountResponse>('/api/accounts/me', body);
  }
  changePassword(body: ChangePasswordBody): Observable<void> {
    return this.http.put<void>('/api/accounts/me/password', body);
  }
}