/**
 * Notification types — one per supported domain event. A notification's `type`
 * mirrors the originating domain event (also stored as `origin_event`), keeping
 * notifications aligned with audit actions without duplicating audit's job.
 */
export const NOTIFICATION_TYPES = [
  'mentorship.requested',
  'mentorship.accepted',
  'mentorship.rejected',
  'mentorship.cancelled',
  'session.requested',
  'session.confirmed',
  'session.completed',
  'session.cancelled',
  'auth.login',
  'auth.logout',
  'consent.recorded',
  'profile.updated',
  'profile.capacity_changed',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationStatus = 'unread' | 'read';
export type EmailStatus = 'none' | 'pending' | 'sent';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  targetUserId: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  originEvent: string;
  emailStatus: EmailStatus;
  createdAt: string;
  readAt: string | null;
}
