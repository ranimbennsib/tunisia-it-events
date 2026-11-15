import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventApi } from '../../services/event-api';
import { Auth } from '../../services/auth';
import { EventItem } from '../../models/event.models';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, DatePipe],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  private api = inject(EventApi);
  private doc = inject(DOCUMENT);
  protected auth = inject(Auth);

  events = signal<EventItem[]>([]);
  loading = signal(true);
  error = signal('');
  menuOpen = signal(false);

  readonly year = new Date().getFullYear();

  /** events that have not started yet, soonest first */
  upcoming = computed(() => {
    const now = Date.now();
    return this.events()
      .filter(e => new Date(e.startDate).getTime() >= now)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  next = computed(() => this.upcoming()[0] ?? null);
  featured = computed(() => this.upcoming().slice(0, 6));

  stats = computed(() => {
    const list = this.events();
    return {
      events: list.length,
      cities: new Set(list.map(e => e.city)).size,
      domains: new Set(list.map(e => e.domain)).size,
      free: list.filter(e => e.paymentMode === 'FREE').length
    };
  });

  /** event types with how many events each has */
  types = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.events()) map.set(e.eventType, (map.get(e.eventType) ?? 0) + 1);
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
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

  scrollTo(id: string): void {
    this.menuOpen.set(false);
    this.doc.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  price(e: EventItem): string {
    return e.paymentMode === 'FREE' ? 'Free' : `${e.price} ${e.currency}`;
  }
}