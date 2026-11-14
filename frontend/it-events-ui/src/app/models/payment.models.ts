export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: number;
  registrationId: number;
  userId: number;
  eventId: number;
  amount: number; // en dinars (TND)
  currency: string;
  status: PaymentStatus;
  cardBrand: string | null;
  cardLast4: string | null;
  commissionAmount: number;
  netAmount: number;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface CardInput {
  number: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

export interface PaymentResult {
  message: string;
  registrationConfirmed: boolean;
  payment: Payment;
}

export interface PaymentFailure {
  status: number;
  message: string;
  field?: string;
}

export function brandLabel(brand: string | null): string {
  switch (brand) {
    case 'visa': return 'Visa';
    case 'mastercard': return 'Mastercard';
    case 'amex': return 'American Express';
    case 'local_tn': return 'Local card';
    default: return brand ?? '';
  }
}

export function statusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'failed': return 'Failed';
    case 'pending': return 'Pending';
    case 'refunded': return 'Refunded';
  }
}

export function reasonLabel(reason: string | null): string {
  switch (reason) {
    case 'card_declined': return 'Card declined';
    case 'insufficient_funds': return 'Insufficient funds';
    case 'processing_error': return 'Processing error';
    case 'not_a_test_card': return 'Card not accepted';
    case 'invalid_card_number': return 'Invalid card number';
    case 'invalid_card_expiry': return 'Invalid expiry date';
    case 'invalid_card_cvv': return 'Invalid security code';
    default: return reason ? reason.split('_').join(' ') : '';
  }
}