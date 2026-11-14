export type RegistrationStatus = 'CONFIRMED' | 'PENDING_PAYMENT' | 'CANCELLED';

export interface Registration {
  id: number;
  eventId: number;
  accountId: number;
  status: RegistrationStatus;
  createdAt: string;
}

export interface Favorite {
  eventId: number;
  createdAt: string;
}