import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AppNotification, NotificationPage } from '../models/notification.models';

// The Authorization header is added by authInterceptor.
// Each user only sees his own notifications: the identity comes from the token.
@Injectable({ providedIn: 'root' })
export class NotificationApi {
  private http = inject(HttpClient);
  private baseUrl = '/api/notifications';

  list(page = 0, size = 20): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(this.baseUrl, {
      params: new HttpParams().set('page', page).set('size', size)
    });
  }

  /** The number shown on the bell. */
  unreadCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.baseUrl}/unread-count`)
      .pipe(map(r => r.count));
  }

  markRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.baseUrl}/read-all`, {});
  }
}