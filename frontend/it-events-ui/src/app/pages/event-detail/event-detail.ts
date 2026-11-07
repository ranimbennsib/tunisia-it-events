import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.models';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css'
})
export class EventDetail {
  private api = inject(EventApi);
  private route = inject(ActivatedRoute);

  event = signal<EventItem | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(id).subscribe({
      next: e => { this.event.set(e); this.loading.set(false); },
      error: err => {
        this.error.set(err.status === 404 ? 'Event not found.' : 'Could not load this event.');
        this.loading.set(false);
      }
    });
  }
}