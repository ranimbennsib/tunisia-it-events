import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AdminPaymentApi, AdminOrganizerSummary } from '../../services/admin-payment-api';
import { EventApi } from '../../services/event-api';
import { Payment } from '../../models/payment.models';

@Component({
  selector: 'app-admin-payments',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './admin-payments.html',
  styleUrl: './admin-payments.css'
})
export class AdminPayments {
  private api = inject(AdminPaymentApi);
  private eventApi = inject(EventApi);

  organizers = signal<AdminOrganizerSummary[]>([]);
  titles = signal<Record<number, string>>({});
  payers = signal<Record<number, Payment[]>>({});
  openEvent = signal<number | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.api.organizers().subscribe({
      next: list => {
        this.organizers.set(list);
        this.loading.set(false);
        list.forEach(o => o.events.forEach(e => this.loadTitle(e.event_id)));
      },
      error: () => {
        this.error.set('Could not load payments.');
        this.loading.set(false);
      }
    });
  }

  title(eventId: number): string {
    return this.titles()[eventId] ?? `Event #${eventId}`;
  }

  togglePayers(eventId: number): void {
    if (this.openEvent() === eventId) {
      this.openEvent.set(null);
      return;
    }
    this.openEvent.set(eventId);
    if (this.payers()[eventId]) return;
    this.api.payers(eventId).subscribe({
      next: list => this.payers.update(p => ({ ...p, [eventId]: list })),
      error: () => this.payers.update(p => ({ ...p, [eventId]: [] }))
    });
  }

  private loadTitle(eventId: number): void {
    this.eventApi.get(eventId).subscribe({
      next: e => this.titles.update(t => ({ ...t, [eventId]: e.title })),
      error: () => {}
    });
  }
}