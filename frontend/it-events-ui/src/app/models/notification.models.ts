// In-app notifications, served by notification-service through the gateway (/api/notifications).

export type NotificationType = 'EVENT_PENDING_REVIEW' | 'PAYOUT_TO_CONFIRM';

export interface AppNotification {
  id: number;
  type: NotificationType | string;
  message: string;
  eventId: number | null;
  payoutId: number | null;
  read: boolean;
  sentAt: string;             // ISO date in UTC, e.g. "2026-11-19T10:30:00.000Z"
}

export interface NotificationPage {
  notifications: AppNotification[];
  unreadCount: number;
  page: number;
  size: number;
}

/** Where the admin goes when he clicks a notification. */
export function notificationLink(n: AppNotification): string {
  switch (n.type) {
    case 'PAYOUT_TO_CONFIRM':
      return '/admin/payouts';
    case 'EVENT_PENDING_REVIEW':
    default:
      return '/admin';
  }
}

/** Small label shown above the message. */
export function notificationKind(n: AppNotification): string {
  switch (n.type) {
    case 'PAYOUT_TO_CONFIRM':
      return 'Payout';
    case 'EVENT_PENDING_REVIEW':
      return 'Event';
    default:
      return 'Notice';
  }
}