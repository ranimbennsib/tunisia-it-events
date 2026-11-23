import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { AdminAccountApi } from '../../services/admin-account-api';
import { AccountResponse, Role } from '../../models/auth.models';
import { AccountStatus } from '../../models/admin-account.models';

@Component({
  selector: 'app-admin-users',
  imports: [RouterLink, DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
  host: { '(document:keydown.escape)': 'closeAll()' }
})
export class AdminUsers {
  private api = inject(AdminAccountApi);
  protected auth = inject(Auth);

  readonly roles: Role[] = ['USER', 'ORGANIZER', 'ADMIN'];
  readonly statuses: AccountStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED'];
  readonly size = 10;

  accounts = signal<AccountResponse[]>([]);
  total = signal(0);
  page = signal(0);
  role = signal<Role | ''>('');
  status = signal<AccountStatus | ''>('');
  search = signal('');

  loading = signal(true);
  error = signal('');
  selected = signal<AccountResponse | null>(null);   // details panel
  confirm = signal<AccountResponse | null>(null);    // activate / deactivate dialog
  busy = signal(false);

  pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size)));

  private timer?: ReturnType<typeof setTimeout>;

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list({
      role: this.role(), status: this.status(), search: this.search(),
      page: this.page(), size: this.size
    }).subscribe({
      next: res => {
        this.accounts.set(res.content);
        this.total.set(res.totalElements);
        this.loading.set(false);
      },
      error: err => { this.error.set(this.msg(err)); this.loading.set(false); }
    });
  }

  // ---------- filters ----------
  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.page.set(0); this.load(); }, 300);
  }
  setRole(value: string): void { this.role.set(value as Role | ''); this.page.set(0); this.load(); }
  setStatus(value: string): void { this.status.set(value as AccountStatus | ''); this.page.set(0); this.load(); }
  reset(): void {
    this.role.set(''); this.status.set(''); this.search.set(''); this.page.set(0);
    this.load();
  }
  go(delta: number): void {
    const next = this.page() + delta;
    if (next < 0 || next >= this.pages()) return;
    this.page.set(next);
    this.load();
  }

  // ---------- details ----------
  open(a: AccountResponse): void {
    this.selected.set(a);
    // fresh copy from the server (the list may be a few seconds old)
    this.api.get(a.id).subscribe({
      next: fresh => { if (this.selected()?.id === fresh.id) this.selected.set(fresh); },
      error: () => {}
    });
  }

  // ---------- activate / deactivate ----------
  canToggle(a: AccountResponse): boolean {
    return a.role !== 'ADMIN' && a.id !== this.auth.currentAccount()?.id;
  }
  nextStatus(a: AccountResponse): AccountStatus {
    return a.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }
  ask(a: AccountResponse): void { this.confirm.set(a); }

  doToggle(): void {
    const a = this.confirm();
    if (!a || this.busy()) return;
    this.busy.set(true);
    this.api.setStatus(a.id, this.nextStatus(a)).subscribe({
      next: updated => {
        this.busy.set(false);
        this.confirm.set(null);
        if (this.selected()?.id === updated.id) this.selected.set(updated);
        this.load();
      },
      error: err => {
        this.busy.set(false);
        this.confirm.set(null);
        this.error.set(this.msg(err));
      }
    });
  }

  closeAll(): void {
    if (this.confirm()) this.confirm.set(null);
    else this.selected.set(null);
  }

  initials(a: AccountResponse): string {
    return ((a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')).toUpperCase() || '?';
  }

  private msg(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach the server.';
    const api = err.error as { message?: string; error?: string } | null;
    return api?.message ?? api?.error ?? `Error ${err.status}`;
  }
}