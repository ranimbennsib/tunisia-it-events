import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.models';

interface Cell {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  events: EventItem[];
}

const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

@Component({
  selector: 'app-calendar',
  imports: [RouterLink, DatePipe],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class Calendar {
  private api = inject(EventApi);

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly types = ['MEETUP', 'WORKSHOP', 'CONFERENCE', 'HACKATHON', 'TRAINING'];
  readonly maxChips = 3;

  events = signal<EventItem[]>([]);
  loading = signal(true);
  error = signal('');

  /** first day of the month being displayed */
  month = signal(this.firstOfMonth(new Date()));
  selectedKey = signal<string | null>(keyOf(new Date()));

  /** events grouped by the day they start, sorted by time */
  private byDay = computed(() => {
    const map = new Map<string, EventItem[]>();
    const sorted = [...this.events()].sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (const e of sorted) {
      const k = keyOf(new Date(e.startDate));   // "2026-12-20T18:00:00" is read as local time
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return map;
  });

  cells = computed<Cell[]>(() => {
    const m = this.month();
    const offset = (m.getDay() + 6) % 7;                         // week starts on Monday
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;     // 35 or 42 cells
    const todayKey = keyOf(new Date());
    const map = this.byDay();

    return Array.from({ length: total }, (_, i) => {
      const date = new Date(m.getFullYear(), m.getMonth(), 1 - offset + i);
      const key = keyOf(date);
      return {
        date,
        key,
        inMonth: date.getMonth() === m.getMonth(),
        isToday: key === todayKey,
        events: map.get(key) ?? []
      };
    });
  });

  monthCount = computed(() => this.cells().filter(c => c.inMonth).reduce((n, c) => n + c.events.length, 0));

  selectedDay = computed(() => this.cells().find(c => c.key === this.selectedKey() && c.inMonth) ?? null);

  constructor() {
    this.api.list().subscribe({
      next: list => { this.events.set(list); this.loading.set(false); },
      error: () => {
        this.error.set('Could not load events. Is the backend running?');
        this.loading.set(false);
      }
    });
  }

  shift(delta: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.selectedKey.set(null);
  }

  today(): void {
    const now = new Date();
    this.month.set(this.firstOfMonth(now));
    this.selectedKey.set(keyOf(now));
  }

  select(c: Cell): void {
    if (!c.inMonth) {
      // clicking a grey day from the next/previous month jumps to that month
      this.month.set(this.firstOfMonth(c.date));
    }
    this.selectedKey.set(c.key);
  }

  private firstOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}