import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventApi } from '../../services/event-api';
import { PaymentApi } from '../../services/payment-api';
import { EventItem } from '../../models/event.models';
import { Payment, brandLabel } from '../../models/payment.models';

@Component({
  selector: 'app-event-payments',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './event-payments.html',
  styleUrl: './event-payments.css'
})
export class EventPayments {
  private route = inject(ActivatedRoute);
  private paymentApi = inject(PaymentApi);
  private eventApi = inject(EventApi);

  eventId = Number(this.route.snapshot.paramMap.get('id'));

  event = signal<EventItem | null>(null);
  payments = signal<Payment[]>([]);
  loading = signal(true);
  error = signal('');

  totalAmount = computed(() => this.payments().reduce((sum, p) => sum + p.amount, 0));
  totalNet = computed(() => this.payments().reduce((sum, p) => sum + p.netAmount, 0));

  brandLabel = brandLabel;

  constructor() {
    this.eventApi
      .get(this.eventId)
      .pipe(catchError(() => of(null)))
      .subscribe(e => this.event.set(e));

    this.paymentApi.forEvent(this.eventId).subscribe({
      next: list => {
        this.payments.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the payments of this event.');
        this.loading.set(false);
      }
    });
  }
}