import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EventApi } from '../../services/event-api';
import { RegistrationApi } from '../../services/registration-api';
import { EventItem } from '../../models/event.models';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, DatePipe],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css'
})
export class Favorites {
  private regApi = inject(RegistrationApi);
  private eventApi = inject(EventApi);

  events = signal<EventItem[]>([]);
  loading = signal(true);
  error = signal('');
  busyId = signal<number | null>(null);

  constructor() {
    this.load();
  }

  remove(e: EventItem): void {
    this.busyId.set(e.id);
    this.error.set('');
    this.regApi.removeFavorite(e.id).subscribe({
      next: () => {
        this.events.update(list => list.filter(x => x.id !== e.id));
        this.busyId.set(null);
      },
      error: err => {
        this.error.set(err.error?.message ?? 'Could not remove this favorite.');
        this.busyId.set(null);
      }
    });
  }

  private load(): void {
    this.regApi.favorites().subscribe({
      next: list => {
        if (list.length === 0) {
          this.loading.set(false);
          return;
        }
        forkJoin(list.map(f => this.eventApi.get(f.eventId).pipe(catchError(() => of(null))))).subscribe(
          events => {
            this.events.set(events.filter((e): e is EventItem => e !== null));
            this.loading.set(false);
          }
        );
      },
      error: () => {
        this.error.set('Could not load your favorites.');
        this.loading.set(false);
      }
    });
  }
}