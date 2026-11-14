import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CardInput, Payment, PaymentFailure, PaymentResult } from '../models/payment.models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPayment(p: any): Payment {
  return {
    id: p.id,
    registrationId: p.registrationId ?? p.registration_id,
    userId: p.userId ?? p.user_id,
    eventId: p.eventId ?? p.event_id,
    amount: Number(p.amount),
    currency: p.currency ?? 'TND',
    status: p.status,
    cardBrand: p.cardBrand ?? p.card_brand ?? null,
    cardLast4: p.cardLast4 ?? p.card_last4 ?? null,
    commissionAmount: Number(p.commissionAmount ?? p.commission_amount ?? 0),
    netAmount: Number(p.netAmount ?? p.net_amount ?? 0),
    failureReason: p.failureReason ?? p.failure_reason ?? null,
    createdAt: p.createdAt ?? p.created_at,
    paidAt: p.paidAt ?? p.paid_at ?? null
  };
}

const DECLINE_MESSAGES: Record<string, string> = {
  card_declined: 'Your card was declined.',
  insufficient_funds: 'Insufficient funds on this card.',
  processing_error: 'A processing error occurred. Please try again.',
  not_a_test_card: 'This card is not accepted.',
  payment_declined: 'The payment was declined.'
};

// Transforme une erreur HTTP du Payment Service en message lisible.
export function toPaymentFailure(err: HttpErrorResponse): PaymentFailure {
  const body = err.error ?? {};

  if (err.status === 0) {
    return { status: 0, message: 'Cannot reach the payment service.' };
  }
  if (err.status === 402) {
    return {
      status: 402,
      message: DECLINE_MESSAGES[body.reason] ?? body.message ?? 'The payment was declined.'
    };
  }
  if (err.status === 400 && body.type === 'INVALID_CARD') {
    return { status: 400, message: body.message ?? 'Invalid card.', field: body.field };
  }
  return { status: err.status, message: body.message ?? 'Payment failed. Please try again.' };
}

@Injectable({ providedIn: 'root' })
export class PaymentApi {
  private http = inject(HttpClient);

  pay(registrationId: number, card: CardInput): Observable<PaymentResult> {
    return this.http.post<any>('/api/payments', { registrationId, card }).pipe(
      map(r => ({
        message: r.message,
        registrationConfirmed: !!r.registrationConfirmed,
        payment: toPayment(r.payment)
      }))
    );
  }

  mine(): Observable<Payment[]> {
    return this.http
      .get<{ payments: any[] }>('/api/payments/me')
      .pipe(map(r => r.payments.map(toPayment)));
  }

  // Organisateur : payeurs d'un de ses événements
  forEvent(eventId: number): Observable<Payment[]> {
    return this.http
      .get<{ payments: any[] }>(`/api/organizer/events/${eventId}/payments`)
      .pipe(map(r => r.payments.map(toPayment)));
  }
}