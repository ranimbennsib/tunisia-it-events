import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventApi } from '../../services/event-api';
import { RegistrationApi } from '../../services/registration-api';
import { EventItem } from '../../models/event.models';
import { Registration } from '../../models/registration.models';

interface Row {
  registration: Registration;
  event: EventItem | null;
}

@Component({
  selector: 'app-my-registrations',
  imports: [RouterLink, DatePipe],
  templateUrl: './my-registrations.html',
  styleUrl: './my-registrations.css'
})
export class MyRegistrations {
  private regApi = inject(RegistrationApi);
  private eventApi = inject(EventApi);

  rows = signal<Row[]>([]);
  loading = signal(true);
  error = signal('');
  busyId = signal<number | null>(null);

  constructor() {
    this.load();
  }

  cancel(row: Row): void {
    this.busyId.set(row.registration.id);
    this.error.set('');
    this.regApi.cancel(row.registration.id).subscribe({
      next: () => {
        this.rows.update(list => list.filter(r => r.registration.id !== row.registration.id));
        this.busyId.set(null);
      },
      error: err => {
        this.error.set(err.error?.message ?? 'Could not cancel this registration.');
        this.busyId.set(null);
      }
    });
  }

  private load(): void {
    this.regApi.mine().subscribe({
      next: list => {
        const active = list.filter(r => r.status !== 'CANCELLED');
        if (active.length === 0) {
          this.rows.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(
          active.map(r => this.eventApi.get(r.eventId).pipe(catchError(() => of(null))))
        ).subscribe(events => {
          this.rows.set(active.map((registration, i) => ({ registration, event: events[i] })));
          this.loading.set(false);
        });
      },
      error: () => {
        this.error.set('Could not load your registrations.');
        this.loading.set(false);
      }
    });
  }
}