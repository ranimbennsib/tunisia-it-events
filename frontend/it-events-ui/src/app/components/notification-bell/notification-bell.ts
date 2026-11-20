import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { interval, startWith } from 'rxjs';
import { Auth } from '../../services/auth';
import { NotificationApi } from '../../services/notification-api';
import {
  AppNotification,
  notificationKind,
  notificationLink
} from '../../models/notification.models';

// How often the number on the bell is refreshed.
const POLL_MS = 2_000;

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css'
})
export class NotificationBell {
  private api = inject(NotificationApi);
  private auth = inject(Auth);
  private router = inject(Router);
  private host = inject(ElementRef) as ElementRef<HTMLElement>;
  private destroyRef = inject(DestroyRef);

  /** Emitted after the admin clicked a notification: the page can refresh itself. */
  selected = output<AppNotification>();

  /** Only admins have this notification bell. */
  isAdmin = computed(() => this.auth.currentAccount()?.role === 'ADMIN');

  unread = signal(0);
  items = signal<AppNotification[]>([]);
  open = signal(false);
  loading = signal(false);
  error = signal('');

  // Notification list filter
filter = signal<'ALL' | 'UNREAD'>('ALL');

// Number of unread notifications in the loaded list
unreadItemsCount = computed(
  () => this.items().filter(n => !n.read).length
);

// Notifications displayed according to selected tab
visibleItems = computed(() => {
  if (this.filter() === 'UNREAD') {
    return this.items().filter(n => !n.read);
  }

  return this.items();
});
    
  kind = notificationKind;

  constructor() {
    interval(POLL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshCount());
  }

  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    this.load();
  }

  choose(n: AppNotification): void {
    this.open.set(false);

    if (!n.read) {
      // update the screen at once, then tell the server
      this.items.update(list => list.map(x => (x.id === n.id ? { ...x, read: true } : x)));
      this.unread.update(count => Math.max(0, count - 1));
      this.api.markRead(n.id).subscribe({ error: () => this.refreshCount() });
    }

    this.router.navigateByUrl(notificationLink(n));
    this.selected.emit(n);
  }

  markAll(): void {
    this.api.markAllRead().subscribe({
      next: () => {
        this.items.update(list => list.map(x => ({ ...x, read: true })));
        this.unread.set(0);
      },
      error: () => this.error.set('Could not mark notifications as read.')
    });
  }

  // close the panel when the admin clicks somewhere else, or presses Escape
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  private refreshCount(): void {
    // no request for a non-admin, or while the tab is hidden (saves requests)
    if (!this.isAdmin() || document.hidden) return;

    this.api.unreadCount().subscribe({
      next: count => this.unread.set(count),
      error: () => { /* silent: the next poll will try again */ }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.list(0, 20).subscribe({
      next: page => {
        this.items.set(page.notifications);
        this.unread.set(page.unreadCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Cannot load notifications.');
        this.loading.set(false);
      }
    });
  }
}