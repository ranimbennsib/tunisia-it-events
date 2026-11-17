import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventApi } from '../../services/event-api';
import { PaymentApi } from '../../services/payment-api';
import { EventItem } from '../../models/event.models';
import { Payment, brandLabel, reasonLabel, statusLabel } from '../../models/payment.models';

interface Row {
  payment: Payment;
  event: EventItem | null;
}

@Component({
  selector: 'app-my-payments',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './my-payments.html',
  styleUrl: './my-payments.css'
})
export class MyPayments {
  private paymentApi = inject(PaymentApi);
  private eventApi = inject(EventApi);

  rows = signal<Row[]>([]);
  loading = signal(true);
  error = signal('');

  brandLabel = brandLabel;
  reasonLabel = reasonLabel;
  statusLabel = statusLabel;

  constructor() {
    this.paymentApi.mine().subscribe({
      next: payments => {
        if (payments.length === 0) {
          this.loading.set(false);
          return;
        }
        const ids = [...new Set(payments.map(p => p.eventId))];
        forkJoin(ids.map(id => this.eventApi.get(id).pipe(catchError(() => of(null))))).subscribe(events => {
          const byId = new Map<number, EventItem | null>();
          ids.forEach((id, i) => byId.set(id, events[i]));
          this.rows.set(payments.map(payment => ({ payment, event: byId.get(payment.eventId) ?? null })));
          this.loading.set(false);
        });
      },
      error: () => {
        this.error.set('Could not load your payments.');
        this.loading.set(false);
      }
    });
  }
}