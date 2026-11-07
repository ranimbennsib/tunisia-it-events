import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventApi } from '../../services/event-api';
import { Auth } from '../../services/auth';
import { EventItem } from '../../models/event.models';

@Component({
  selector: 'app-events',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './events.html',
  styleUrl: './events.css'
})
export class Events {
  private api = inject(EventApi);
  protected auth = inject(Auth);

  events = signal<EventItem[]>([]);
  loading = signal(true);
  error = signal('');

  keyword = signal('');
  city = signal('');
  domain = signal('');
  eventType = signal('');
  payment = signal('');   // '', 'FREE', 'PAID'

  cities = computed(() => this.unique(e => e.city));
  domains = computed(() => this.unique(e => e.domain));
  types = computed(() => this.unique(e => e.eventType));

  filtered = computed(() => {
    const k = this.keyword().trim().toLowerCase();
    return this.events().filter(e =>
      (!k || e.title.toLowerCase().includes(k) || e.description.toLowerCase().includes(k)) &&
      (!this.city() || e.city === this.city()) &&
      (!this.domain() || e.domain === this.domain()) &&
      (!this.eventType() || e.eventType === this.eventType()) &&
      (!this.payment() ||
        (this.payment() === 'FREE' ? e.paymentMode === 'FREE' : e.paymentMode !== 'FREE'))
    );
  });

  constructor() {
    this.api.list().subscribe({
      next: list => { this.events.set(list); this.loading.set(false); },
      error: () => {
        this.error.set('Could not load events. Is the backend running?');
        this.loading.set(false);
      }
    });
  }

  reset(): void {
    this.keyword.set(''); this.city.set(''); this.domain.set('');
    this.eventType.set(''); this.payment.set('');
  }

  private unique(pick: (e: EventItem) => string): string[] {
    return [...new Set(this.events().map(pick))].sort();
  }
}