import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventApi } from '../../services/event-api';
import { RegistrationApi } from '../../services/registration-api';
import { EventItem } from '../../models/event.models';
import { Registration } from '../../models/registration.models';

@Component({
  selector: 'app-event-participants',
  imports: [RouterLink, DatePipe],
  templateUrl: './event-participants.html',
  styleUrl: './event-participants.css'
})
export class EventParticipants {
  private eventApi = inject(EventApi);
  private regApi = inject(RegistrationApi);
  private eventId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  event = signal<EventItem | null>(null);
  registrations = signal<Registration[]>([]);
  loading = signal(true);
  error = signal('');

  active = computed(() => this.registrations().filter(r => r.status !== 'CANCELLED'));
  confirmed = computed(() => this.registrations().filter(r => r.status === 'CONFIRMED').length);
  pending = computed(() => this.registrations().filter(r => r.status === 'PENDING_PAYMENT').length);

  constructor() {
    this.eventApi.get(this.eventId).subscribe({ next: e => this.event.set(e), error: () => {} });
    this.regApi.forEvent(this.eventId).subscribe({
      next: list => {
        this.registrations.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(
          err.status === 403 || err.status === 404
            ? 'You cannot view the participants of this event.'
            : 'Could not load the participants.'
        );
        this.loading.set(false);
      }
    });
  }
}