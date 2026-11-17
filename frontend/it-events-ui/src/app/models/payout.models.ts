// Models of the payout-service (amounts are in dinars, TND, like the payment pages).
// Routes (through the gateway): /api/payout-accounts/me, /api/payouts/*, /api/admin/payouts/*

// linking   : created, the link with the payment-service is not confirmed yet
// pending   : payments linked, the bank transfer is not confirmed yet
// paid      : the admin confirmed the transfer
// cancelled : the payment-service refused the link (nothing was linked)
export type PayoutStatus = 'linking' | 'pending' | 'paid' | 'cancelled';

export const PAYOUT_STATUSES: PayoutStatus[] = ['linking', 'pending', 'paid', 'cancelled'];

export interface PayoutAccount {
  organizer_id: number;
  holder_name: string;
  bank_name: string;
  iban_masked: string; // the full IBAN is never sent back by the server
  updated_at: string;
}

export interface PayoutAccountInput {
  holderName: string;
  bankName: string;
  iban: string;
}

export interface PayoutItem {
  payment_id: number;
  event_id: number;
  amount: number;
  commission_amount: number;
  net_amount: number;
}

export interface Payout {
  id: number;
  organizer_id: number;
  status: PayoutStatus;
  currency: string;
  payments_count: number;
  total_amount: number;
  total_commission: number;
  net_amount: number;
  holder_name: string;
  bank_name: string;
  iban_masked: string;
  created_by: number;
  created_at: string;
  paid_by: number | null;
  paid_at: string | null;
  bank_reference: string | null;
  cancel_reason: string | null;
  items?: PayoutItem[]; // only in the detail of one payout
}

export interface BalanceFigures {
  payments_count: number;
  total_amount: number;
  total_commission: number;
  total_net: number;
  unpaid_net: number;
  paid_out_net: number;
}

export interface EventBalance extends BalanceFigures {
  event_id: number;
}

// GET /api/payouts/balance (organizer)
export interface OrganizerBalance extends BalanceFigures {
  has_bank_account: boolean;
  events: EventBalance[];
}

// GET /api/admin/payouts/balances (admin): one line per organizer
export interface OrganizerOwed extends BalanceFigures {
  organizer_id: number;
  has_bank_account: boolean;
  can_pay_out: boolean;
}

export function payoutStatusLabel(status: PayoutStatus): string {
  switch (status) {
    case 'linking': return 'Linking';
    case 'pending': return 'To transfer';
    case 'paid': return 'Paid';
    case 'cancelled': return 'Cancelled';
  }
}

// Short explanation shown under the status (title attribute / helper text)
export function payoutStatusHelp(status: PayoutStatus): string {
  switch (status) {
    case 'linking': return 'The payments are reserved, the link with the payment service is not confirmed yet.';
    case 'pending': return 'The payments are linked. The bank transfer has to be sent and confirmed.';
    case 'paid': return 'The bank transfer was confirmed.';
    case 'cancelled': return 'The payment service refused the link. Nothing was paid out.';
  }
}
