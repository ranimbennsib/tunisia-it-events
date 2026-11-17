import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  OrganizerBalance,
  OrganizerOwed,
  Payout,
  PayoutAccount,
  PayoutAccountInput,
  PayoutStatus
} from '../models/payout.models';

// The Authorization header is added by authInterceptor.
@Injectable({ providedIn: 'root' })
export class PayoutApi {
  private http = inject(HttpClient);

  // ---------- organizer ----------

  /** The bank account of the organizer, or null when he has not registered one (404). */
  myAccount(): Observable<PayoutAccount | null> {
    return new Observable<PayoutAccount | null>(subscriber => {
      this.http.get<{ account: PayoutAccount }>('/api/payout-accounts/me').subscribe({
        next: r => { subscriber.next(r.account); subscriber.complete(); },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            subscriber.next(null);
            subscriber.complete();
          } else {
            subscriber.error(err);
          }
        }
      });
    });
  }

  saveAccount(input: PayoutAccountInput): Observable<PayoutAccount> {
    return this.http
      .put<{ account: PayoutAccount }>('/api/payout-accounts/me', input)
      .pipe(map(r => r.account));
  }

  myBalance(): Observable<OrganizerBalance> {
    return this.http.get<{ balance: OrganizerBalance }>('/api/payouts/balance').pipe(map(r => r.balance));
  }

  myPayouts(): Observable<Payout[]> {
    return this.http.get<{ payouts: Payout[] }>('/api/payouts/me').pipe(map(r => r.payouts));
  }

  /** One payout with its payments (an organizer can only read his own). */
  detail(id: number): Observable<Payout> {
    return this.http.get<{ payout: Payout }>(`/api/payouts/${id}`).pipe(map(r => r.payout));
  }

  // ---------- admin ----------

  owed(): Observable<OrganizerOwed[]> {
    return this.http
      .get<{ organizers: OrganizerOwed[] }>('/api/admin/payouts/balances')
      .pipe(map(r => r.organizers));
  }

  all(status?: PayoutStatus | null): Observable<Payout[]> {
    const url = status ? `/api/admin/payouts?status=${status}` : '/api/admin/payouts';
    return this.http.get<{ payouts: Payout[] }>(url).pipe(map(r => r.payouts));
  }

  /** Creates a payout with ALL the unpaid sales of this organizer. */
  create(organizerId: number): Observable<Payout> {
    return this.http
      .post<{ payout: Payout }>('/api/admin/payouts', { organizerId })
      .pipe(map(r => r.payout));
  }

  /** The admin confirms that the bank transfer was sent. */
  markPaid(id: number, bankReference?: string): Observable<Payout> {
    const body = bankReference ? { bankReference } : {};
    return this.http
      .patch<{ payout: Payout }>(`/api/admin/payouts/${id}/pay`, body)
      .pipe(map(r => r.payout));
  }

  /** Retries the link with the payment service for a payout stuck in "linking". */
  relink(id: number): Observable<Payout> {
    return this.http
      .post<{ payout: Payout }>(`/api/admin/payouts/${id}/relink`, {})
      .pipe(map(r => r.payout));
  }
}

/** The message of the server ({ message }) or a default text, for the error banners. */
export function payoutErrorMessage(err: unknown, fallback: string): string {
  const e = err as HttpErrorResponse;
  if (e?.status === 0) return 'The server cannot be reached.';
  const message = e?.error?.message;
  return typeof message === 'string' && message ? message : fallback;
}
