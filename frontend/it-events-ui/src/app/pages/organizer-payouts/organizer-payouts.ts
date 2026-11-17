import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventApi } from '../../services/event-api';
import { PayoutApi, payoutErrorMessage } from '../../services/payout-api';
import {
  OrganizerBalance,
  Payout,
  PayoutAccount,
  PayoutItem,
  payoutStatusHelp,
  payoutStatusLabel
} from '../../models/payout.models';

@Component({
  selector: 'app-organizer-payouts',
  imports: [RouterLink, ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './organizer-payouts.html',
  styleUrls: ['../payout-shared.css', './organizer-payouts.css']
})
export class OrganizerPayouts {
  private api = inject(PayoutApi);
  private eventApi = inject(EventApi);
  private fb = inject(FormBuilder);

  balance = signal<OrganizerBalance | null>(null);
  balanceError = signal('');
  account = signal<PayoutAccount | null>(null);
  editing = signal(false);
  saving = signal(false);
  saveError = signal('');
  saved = signal(false);

  payouts = signal<Payout[]>([]);
  payoutsError = signal('');
  loading = signal(true);

  openPayout = signal<number | null>(null);
  details = signal<Record<number, Payout | 'error'>>({});
  titles = signal<Record<number, string>>({});

  statusLabel = payoutStatusLabel;
  statusHelp = payoutStatusHelp;

  form = this.fb.nonNullable.group({
    holderName: ['', [Validators.required, Validators.maxLength(120)]],
    bankName: ['', [Validators.required, Validators.maxLength(120)]],
    // spaces are allowed when typing; the server checks the format and the control key
    iban: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}\d{2}[A-Za-z0-9 ]{11,40}$/)]]
  });

  constructor() {
    this.api.myAccount().subscribe({
      next: a => {
        this.account.set(a);
        this.editing.set(a === null);
      },
      error: () => this.editing.set(false)
    });

    this.api.myBalance().subscribe({
      next: b => {
        this.balance.set(b);
        b.events.forEach(e => this.loadTitle(e.event_id));
      },
      error: err => this.balanceError.set(payoutErrorMessage(err, 'Could not load your balance.'))
    });

    this.api.myPayouts().subscribe({
      next: list => {
        this.payouts.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.payoutsError.set(payoutErrorMessage(err, 'Could not load your payouts.'));
        this.loading.set(false);
      }
    });
  }

  startEdit(): void {
    const a = this.account();
    this.form.reset({ holderName: a?.holder_name ?? '', bankName: a?.bank_name ?? '', iban: '' });
    this.saveError.set('');
    this.saved.set(false);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set('');
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    this.api.saveAccount(this.form.getRawValue()).subscribe({
      next: a => {
        this.account.set(a);
        this.editing.set(false);
        this.saving.set(false);
        this.saved.set(true);
        this.form.reset();
        // the "has_bank_account" flag of the balance changed
        this.api.myBalance().subscribe({ next: b => this.balance.set(b), error: () => {} });
      },
      error: err => {
        this.saveError.set(payoutErrorMessage(err, 'Could not save the bank account.'));
        this.saving.set(false);
      }
    });
  }

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
    if (this.details()[id] && this.details()[id] !== 'error') return;
    this.api.detail(id).subscribe({
      next: p => {
        this.details.update(d => ({ ...d, [id]: p }));
        (p.items ?? []).forEach(i => this.loadTitle(i.event_id));
      },
      error: () => this.details.update(d => ({ ...d, [id]: 'error' }))
    });
  }

  private loadTitle(eventId: number): void {
    if (this.titles()[eventId]) return;
    this.eventApi.get(eventId).subscribe({
      next: e => this.titles.update(t => ({ ...t, [eventId]: e.title })),
      error: () => {}
    });
  }
}
