import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Payment } from '../models/payment.models';

export interface AdminEventSummary {
  event_id: number;
  payments_count: number;
  total_amount: number;
  total_commission: number;
  total_net: number;
  unpaid_net: number;
  paid_out_net: number;
}

export interface AdminOrganizerSummary extends AdminEventSummary {
  organizer_id: number;
  events: AdminEventSummary[];
}

@Injectable({ providedIn: 'root' })
export class AdminPaymentApi {
  private http = inject(HttpClient);

  organizers(): Observable<AdminOrganizerSummary[]> {
    return this.http
      .get<{ organizers: AdminOrganizerSummary[] }>('/api/admin/organizers/summary')
      .pipe(map(r => r.organizers));
  }

  payers(eventId: number): Observable<Payment[]> {
    return this.http
      .get<{ payments: Payment[] }>(`/api/admin/events/${eventId}/payments`)
      .pipe(map(r => r.payments));
  }
}