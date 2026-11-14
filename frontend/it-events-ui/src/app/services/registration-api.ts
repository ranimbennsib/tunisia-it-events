import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Favorite, Registration } from '../models/registration.models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRegistration(r: any): Registration {
  return {
    id: r.id,
    eventId: r.eventId ?? r.event_id,
    accountId: r.accountId ?? r.account_id,
    status: r.status,
    createdAt: r.createdAt ?? r.created_at
  };
}

function toFavorite(f: any): Favorite {
  return { eventId: f.eventId ?? f.event_id, createdAt: f.createdAt ?? f.created_at };
}

@Injectable({ providedIn: 'root' })
export class RegistrationApi {
  private http = inject(HttpClient);

  count(eventId: number): Observable<number> {
    return this.http
      .get<{ eventId: number; count: number }>(`/api/registrations/event/${eventId}/count`)
      .pipe(map(r => r.count));
  }

  mine(): Observable<Registration[]> {
    return this.http.get<any[]>('/api/registrations/me').pipe(map(list => list.map(toRegistration)));
  }
  register(eventId: number): Observable<Registration> {
    return this.http.post<any>('/api/registrations', { eventId }).pipe(map(toRegistration));
  }
  cancel(id: number): Observable<Registration> {
    return this.http.delete<any>(`/api/registrations/${id}`).pipe(map(toRegistration));
  }
  forEvent(eventId: number): Observable<Registration[]> {
    return this.http
      .get<any[]>(`/api/registrations/event/${eventId}`)
      .pipe(map(list => list.map(toRegistration)));
  }

  favorites(): Observable<Favorite[]> {
    return this.http.get<any[]>('/api/favorites').pipe(map(list => list.map(toFavorite)));
  }
  addFavorite(eventId: number): Observable<unknown> {
    return this.http.post('/api/favorites', { eventId });
  }
  removeFavorite(eventId: number): Observable<unknown> {
    return this.http.delete(`/api/favorites/${eventId}`);
  }
}