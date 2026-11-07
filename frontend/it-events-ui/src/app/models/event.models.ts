export type EventStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EventItem {
  id: number;
  title: string;
  description: string;
  domain: string;
  startDate: string;          // "2026-12-20T18:00:00" (no Z)
  endDate: string;
  city: string;
  address: string;
  capacity: number;
  paymentMode: string;        // "FREE" seen so far
  price: number | null;
  currency: string | null;
  image: string | null;
  eventType: string;          // "MEETUP" seen so far
  status: EventStatus;
  rejectReason: string | null;
  createdAt: string;
  organizerId: number;
}

// Assumed values: check them against your PaymentMode / EventType enums (see end of message)
export const PAYMENT_MODES = ['FREE', 'PAID'];
export const EVENT_TYPES = ['MEETUP', 'WORKSHOP', 'CONFERENCE', 'HACKATHON'];

export interface EventRequest {
  title: string;
  description: string;
  domain: string;
  startDate: string;
  endDate: string;
  city: string;
  address: string;
  capacity: number;
  paymentMode: string;
  price: number | null;
  currency: string | null;
  image: string | null;
  eventType: string;
}