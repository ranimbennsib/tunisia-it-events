import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem, EventRequest, EventStatus } from '../models/event.models';

@Injectable({ providedIn: 'root' })
export class EventApi {
  private http = inject(HttpClient);
  private baseUrl = '/api/events';

  // Public
  list(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(this.baseUrl);
  }
  get(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.baseUrl}/${id}`);
  }

  // Organizer
  private org(orgId: number) { return `/api/organizers/${orgId}/events`; }

  listMine(orgId: number): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(this.org(orgId));
  }
  create(orgId: number, body: EventRequest): Observable<EventItem> {
    return this.http.post<EventItem>(this.org(orgId), body);
  }
  update(orgId: number, id: number, body: EventRequest): Observable<EventItem> {
    return this.http.put<EventItem>(`${this.org(orgId)}/${id}`, body);
  }
  remove(orgId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.org(orgId)}/${id}`);
  }
  // Image upload (organizer): returns the URL to store in the event
  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/images`, form);
  }
    // Logo upload: public, because an organizer has no token yet at sign-up
  uploadLogo(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/images/logo`, form);
  }
  // Admin
  adminList(status: EventStatus): Observable<EventItem[]> {
    return this.http.get<EventItem[]>('/api/admin/events', {
      params: new HttpParams().set('status', status)
    });
  }
  approve(id: number, adminId: number): Observable<EventItem> {
    return this.http.patch<EventItem>(
      `/api/admin/events/${id}/approve`,
      {},
      { params: new HttpParams().set('adminId', adminId) }
    );
  }
  reject(id: number, reason: string, adminId: number): Observable<EventItem> {
    return this.http.patch<EventItem>(`/api/admin/events/${id}/reject`, { reason, adminId });
  }
}