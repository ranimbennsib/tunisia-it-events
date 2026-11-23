
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountResponse } from '../models/auth.models';
import { AccountFilter, AccountStatus, PageResponse } from '../models/admin-account.models';

@Injectable({ providedIn: 'root' })
export class AdminAccountApi {
  private http = inject(HttpClient);
  private baseUrl = '/api/admin/accounts';

  // GET /api/admin/accounts?role=&status=&search=&page=&size=
  list(f: AccountFilter): Observable<PageResponse<AccountResponse>> {
    let params = new HttpParams().set('page', f.page).set('size', f.size);
    if (f.role) params = params.set('role', f.role);
    if (f.status) params = params.set('status', f.status);
    if (f.search.trim()) params = params.set('search', f.search.trim());
    return this.http.get<PageResponse<AccountResponse>>(this.baseUrl, { params });
  }

  // GET /api/admin/accounts/{id}
  get(id: number): Observable<AccountResponse> {
    return this.http.get<AccountResponse>(`${this.baseUrl}/${id}`);
  }

  // PATCH /api/admin/accounts/{id}/status   body: { status }
  setStatus(id: number, status: AccountStatus): Observable<AccountResponse> {
    return this.http.patch<AccountResponse>(`${this.baseUrl}/${id}/status`, { status });
  }
}