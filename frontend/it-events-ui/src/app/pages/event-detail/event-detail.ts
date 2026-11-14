import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { EventApi } from '../../services/event-api';
import { RegistrationApi } from '../../services/registration-api';
import { Auth } from '../../services/auth';
import { EventItem } from '../../models/event.models';
import { Registration } from '../../models/registration.models';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css'
})
export class EventDetail {
  private api = inject(EventApi);
  private regApi = inject(RegistrationApi);
  private route = inject(ActivatedRoute);
  protected auth = inject(Auth);

  private eventId = Number(this.route.snapshot.paramMap.get('id'));

  event = signal<EventItem | null>(null);
  loading = signal(true);
  error = signal('');

  taken = signal(0);
  myRegistration = signal<Registration | null>(null);
  isFavorite = signal(false);
  busy = signal(false);
  actionError = signal('');

  role = computed(() => this.auth.currentAccount()?.role ?? null);
  placesLeft = computed(() => {
    const e = this.event();
    return e ? Math.max(e.capacity - this.taken(), 0) : 0;
  });
  started = computed(() => {
    const e = this.event();
    return !!e && new Date(e.startDate) <= new Date();
  });

  constructor() {
    this.api.get(this.eventId).subscribe({
      next: e => {
        this.event.set(e);
        this.loading.set(false);
        this.loadRegistrationInfo();
      },
      error: err => {
        this.error.set(err.status === 404 ? 'Event not found.' : 'Could not load this event.');
        this.loading.set(false);
      }
    });
  }

  register(): void {
    this.run(this.regApi.register(this.eventId), reg => {
      this.myRegistration.set(reg);
      this.refreshCount();
    });
  }

  cancel(): void {
    const reg = this.myRegistration();
    if (!reg) return;
    this.run(this.regApi.cancel(reg.id), () => {
      this.myRegistration.set(null);
      this.refreshCount();
    });
  }

  toggleFavorite(): void {
    const request = this.isFavorite()
      ? this.regApi.removeFavorite(this.eventId)
      : this.regApi.addFavorite(this.eventId);
    this.run(request, () => this.isFavorite.update(v => !v));
  }

  private loadRegistrationInfo(): void {
    this.refreshCount();
    if (this.role() !== 'USER') return;
    this.regApi.mine().subscribe({
      next: list =>
        this.myRegistration.set(
          list.find(r => r.eventId === this.eventId && r.status !== 'CANCELLED') ?? null
        ),
      error: () => {}
    });
    this.regApi.favorites().subscribe({
      next: list => this.isFavorite.set(list.some(f => f.eventId === this.eventId)),
      error: () => {}
    });
  }

  private refreshCount(): void {
    this.regApi.count(this.eventId).subscribe({ next: n => this.taken.set(n), error: () => {} });
  }

  private run<T>(request: Observable<T>, onSuccess: (value: T) => void): void {
    this.busy.set(true);
    this.actionError.set('');
    request.subscribe({
      next: value => {
        onSuccess(value);
        this.busy.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.actionError.set(
          err.status === 0
            ? 'Cannot reach the server. Is the backend running?'
            : (err.error?.message ?? 'Something went wrong. Please try again.')
        );
      }
    });
  }
}