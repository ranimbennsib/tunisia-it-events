import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Auth } from '../../services/auth';
import { EventApi } from '../../services/event-api';
import { EventItem, EventStatus } from '../../models/event.models';

@Component({
  selector: 'app-admin',
  imports: [RouterLink, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  private api = inject(EventApi);
  protected auth = inject(Auth);

  events = signal<EventItem[]>([]);
  filter = signal<EventStatus>('PENDING');
  loading = signal(true);
  error = signal('');

  shown = computed(() => this.events().filter(e => e.status === this.filter()));
  count = (s: EventStatus) => this.events().filter(e => e.status === s).length;

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin([
      this.api.adminList('PENDING'),
      this.api.adminList('APPROVED'),
      this.api.adminList('REJECTED')
    ]).subscribe({
      next: ([p, a, r]) => { this.events.set([...p, ...a, ...r]); this.loading.set(false); },
      error: err => { this.error.set(this.msg(err)); this.loading.set(false); }
    });
  }

  approve(e: EventItem): void {
    this.api.approve(e.id, this.auth.currentAccount()!.id).subscribe({
      next: () => this.load(),
      error: err => this.error.set(this.msg(err))
    });
  }

  reject(e: EventItem): void {
    const reason = prompt(`Reason for rejecting "${e.title}"?`)?.trim();
    if (!reason) return;
    this.api.reject(e.id, reason, this.auth.currentAccount()!.id).subscribe({
      next: () => this.load(),
      error: err => this.error.set(this.msg(err))
    });
  }

  private msg(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach the server.';
    const api = err.error as { message?: string } | null;
    return api?.message ?? `Error ${err.status}`;
  }
}