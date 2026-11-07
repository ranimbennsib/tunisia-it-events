import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { EventApi } from '../../services/event-api';
import { EventItem, EventRequest, EVENT_TYPES, PAYMENT_MODES } from '../../models/event.models';

@Component({
  selector: 'app-organizer',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './organizer.html',
  styleUrl: './organizer.css'
})
export class Organizer {
  private api = inject(EventApi);
  private fb = inject(FormBuilder);
  protected auth = inject(Auth);
  private orgId = this.auth.currentAccount()!.id;

  paymentModes = PAYMENT_MODES;
  eventTypes = EVENT_TYPES;

  events = signal<EventItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  showForm = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    domain: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    city: ['', Validators.required],
    address: [''],
    capacity: [50, [Validators.required, Validators.min(1)]],
    paymentMode: ['FREE', Validators.required],
    price: [null as number | null],
    currency: ['TND'],
    image: [''],
    eventType: ['MEETUP', Validators.required]
  });

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listMine(this.orgId).subscribe({
      next: list => { this.events.set(list); this.loading.set(false); },
      error: err => { this.error.set(this.msg(err)); this.loading.set(false); }
    });
  }

  newEvent(): void {
    this.editingId.set(null);
    this.form.reset({ capacity: 50, paymentMode: 'FREE', currency: 'TND', eventType: 'MEETUP' });
    this.error.set('');
    this.showForm.set(true);
  }

  edit(e: EventItem): void {
    this.editingId.set(e.id);
    this.form.patchValue({
      title: e.title, description: e.description, domain: e.domain ?? '',
      startDate: e.startDate.slice(0, 16), endDate: e.endDate.slice(0, 16),
      city: e.city, address: e.address ?? '', capacity: e.capacity,
      paymentMode: e.paymentMode, price: e.price, currency: e.currency ?? '',
      image: e.image ?? '', eventType: e.eventType
    });
    this.error.set('');
    this.showForm.set(true);
  }

  cancel(): void { this.showForm.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const free = v.paymentMode === 'FREE';
    const body: EventRequest = {
      ...v,
      startDate: this.toApi(v.startDate),
      endDate: this.toApi(v.endDate),
      price: free ? null : v.price,
      currency: free ? null : (v.currency || null),
      image: v.image || null
    };
    this.saving.set(true);
    this.error.set('');
    const id = this.editingId();
    const call = id === null
      ? this.api.create(this.orgId, body)
      : this.api.update(this.orgId, id, body);
    call.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: err => { this.saving.set(false); this.error.set(this.msg(err)); }
    });
  }

  remove(e: EventItem): void {
    if (!confirm(`Delete "${e.title}"?`)) return;
    this.api.remove(this.orgId, e.id).subscribe({
      next: () => this.load(),
      error: err => this.error.set(this.msg(err))
    });
  }

  private toApi(s: string): string {
    return s.length === 16 ? s + ':00' : s;   // backend wants no Z, with seconds
  }

  private msg(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach the server.';
    const api = err.error as { message?: string; errors?: Record<string, string> } | null;
    const fields = api?.errors ? Object.entries(api.errors).map(([k, v]) => `${k}: ${v}`).join(' | ') : '';
    return [api?.message, fields].filter(Boolean).join(' - ') || `Error ${err.status}`;
  }
}