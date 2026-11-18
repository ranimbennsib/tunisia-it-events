import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventApi } from '../../services/event-api';
import { PayoutApi, payoutErrorMessage } from '../../services/payout-api';
import {
  OrganizerOwed,
  PAYOUT_STATUSES,
  Payout,
  PayoutItem,
  PayoutStatus,
  payoutStatusHelp,
  payoutStatusLabel
} from '../../models/payout.models';

@Component({
  selector: 'app-admin-payouts',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './admin-payouts.html',
  styleUrls: ['../payout-shared.css', './admin-payouts.css']
})
export class AdminPayouts {
  private api = inject(PayoutApi);
  private eventApi = inject(EventApi);

  owed = signal<OrganizerOwed[]>([]);
  owedError = signal('');
  loadingOwed = signal(true);

  payouts = signal<Payout[]>([]);
  payoutsError = signal('');
  loadingPayouts = signal(true);
  filter = signal<PayoutStatus | null>(null);

  // messages after an action
  notice = signal('');
  actionError = signal('');

  // two-step confirmations: nothing is sent before the admin confirms
  confirmCreate = signal<number | null>(null); // organizer id
  confirmPay = signal<number | null>(null); // payout id
  reference = '';
  busy = signal<string | null>(null); // "create-3", "pay-7", "relink-7"

  openPayout = signal<number | null>(null);
  details = signal<Record<number, Payout | 'error'>>({});
  titles = signal<Record<number, string>>({});

  statuses = PAYOUT_STATUSES;
  statusLabel = payoutStatusLabel;
  statusHelp = payoutStatusHelp;

  constructor() {
    this.loadOwed();
    this.loadPayouts();
  }

  // ---------- loading ----------

  loadOwed(): void {
    this.api.owed().subscribe({
      next: list => {
        this.owed.set(list);
        this.owedError.set('');
        this.loadingOwed.set(false);
      },
      error: err => {
        this.owedError.set(payoutErrorMessage(err, 'Could not load the amounts due.'));
        this.loadingOwed.set(false);
      }
    });
  }

  loadPayouts(): void {
    this.api.all(this.filter()).subscribe({
      next: list => {
        this.payouts.set(list);
        this.payoutsError.set('');
        this.loadingPayouts.set(false);
      },
      error: err => {
        this.payoutsError.set(payoutErrorMessage(err, 'Could not load the payouts.'));
        this.loadingPayouts.set(false);
      }
    });
  }

  setFilter(status: PayoutStatus | null): void {
    this.filter.set(status);
    this.loadingPayouts.set(true);
    this.loadPayouts();
  }

  // ---------- create a payout ----------

  askCreate(organizerId: number): void {
    this.clearMessages();
    this.confirmCreate.set(organizerId);
  }

  create(o: OrganizerOwed): void {
    this.busy.set(`create-${o.organizer_id}`);
    this.clearMessages();
    this.api.create(o.organizer_id).subscribe({
      next: p => {
        this.busy.set(null);
        this.confirmCreate.set(null);
        this.notice.set(
          `Payout #${p.id} created for organizer #${p.organizer_id} (${p.net_amount} TND). ` +
          'Send the bank transfer, then confirm it below.'
        );
        this.refreshAll();
      },
      error: err => {
        this.busy.set(null);
        this.confirmCreate.set(null);
        this.actionError.set(payoutErrorMessage(err, 'The payout could not be created.'));
        this.refreshAll();
      }
    });
  }

  // ---------- confirm the bank transfer ----------

  askPay(id: number): void {
    this.clearMessages();
    this.reference = '';
    this.confirmPay.set(id);
  }

  pay(p: Payout): void {
    this.busy.set(`pay-${p.id}`);
    this.clearMessages();
    this.api.markPaid(p.id, this.reference.trim() || undefined).subscribe({
      next: paid => {
        this.busy.set(null);
        this.confirmPay.set(null);
        this.notice.set(`Payout #${paid.id} marked as paid (reference ${paid.bank_reference}).`);
        this.refreshAll();
      },
      error: err => {
        this.busy.set(null);
        this.actionError.set(payoutErrorMessage(err, 'The payout could not be confirmed.'));
        this.refreshAll();
      }
    });
  }

  // ---------- retry the link with the payment service ----------

  relink(p: Payout): void {
    this.busy.set(`relink-${p.id}`);
    this.clearMessages();
    this.api.relink(p.id).subscribe({
      next: done => {
        this.busy.set(null);
        this.notice.set(`Payout #${done.id} is now "${payoutStatusLabel(done.status)}".`);
        this.refreshAll();
      },
      error: err => {
        this.busy.set(null);
        this.actionError.set(payoutErrorMessage(err, 'The link could not be retried.'));
        this.refreshAll();
      }
    });
  }

  // ---------- details ----------

  title(eventId: number): string {
    return this.titles()[eventId] ?? `Event #${eventId}`;
  }

  detail(id: number): Payout | 'error' | undefined {
    return this.details()[id];
  }

  detailItems(id: number): PayoutItem[] {
    const d = this.details()[id];
    return d && d !== 'error' ? (d.items ?? []) : [];
  }

  toggle(id: number): void {
    if (this.openPayout() === id) {
      this.openPayout.set(null);
      return;
    }
    this.openPayout.set(id);
    this.api.detail(id).subscribe({
      next: p => {
        this.details.update(d => ({ ...d, [id]: p }));
        (p.items ?? []).forEach(i => this.loadTitle(i.event_id));
      },
      error: () => this.details.update(d => ({ ...d, [id]: 'error' }))
    });
  }

  // ---------- helpers ----------

  private refreshAll(): void {
    this.details.set({});
    this.loadOwed();
    this.loadPayouts();
  }

  private clearMessages(): void {
    this.notice.set('');
    this.actionError.set('');
  }

  private loadTitle(eventId: number): void {
    if (this.titles()[eventId]) return;
    this.eventApi.get(eventId).subscribe({
      next: e => this.titles.update(t => ({ ...t, [eventId]: e.title })),
      error: () => {}
    });
  }
}
