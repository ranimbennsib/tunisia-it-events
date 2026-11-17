-- Payment table. Amounts are integers in millimes (45 TND = 45000).
-- No card number, no CVV, no expiry is ever stored: only the brand and the last 4 digits.
CREATE TABLE IF NOT EXISTS payment (
  id                BIGSERIAL PRIMARY KEY,
  registration_id   BIGINT       NOT NULL,
  user_id           BIGINT       NOT NULL,
  event_id          BIGINT       NOT NULL,
  organizer_id      BIGINT       NOT NULL,
  amount            BIGINT       NOT NULL CHECK (amount > 0),
  currency          CHAR(3)      NOT NULL DEFAULT 'TND',
  method            VARCHAR(20)  NOT NULL CHECK (method IN ('card', 'wallet', 'bankTransfer')),
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  gateway_provider  VARCHAR(50)  NOT NULL,
  transaction_ref   VARCHAR(100),
  card_brand        VARCHAR(20),
  card_last4        CHAR(4)      CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
  commission_rate   NUMERIC(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount BIGINT       NOT NULL CHECK (commission_amount >= 0),
  net_amount        BIGINT       NOT NULL,
  payout_id         BIGINT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  CONSTRAINT chk_payment_commission CHECK (commission_amount <= amount),
  CONSTRAINT chk_payment_net CHECK (net_amount = amount - commission_amount)
);

-- Only one ACTIVE payment (pending or paid) per registration.
-- A failed or refunded payment does not block a new attempt.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_active_registration
  ON payment (registration_id) WHERE status IN ('pending', 'paid');

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transaction_ref
  ON payment (transaction_ref) WHERE transaction_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_user   ON payment (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_event  ON payment (event_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment (status);
CREATE INDEX IF NOT EXISTS idx_payment_payout ON payment (payout_id);
-- Why a payment failed (card_declined, insufficient_funds...). Added in step 4.
ALTER TABLE payment ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(50);