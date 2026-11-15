-- Payout tables. Amounts are integers in millimes (45 TND = 45000), like in payment-service.

-- Bank account of an organizer (one per organizer). organizer_id = id of the account in account-service.
CREATE TABLE IF NOT EXISTS payout_account (
  id            BIGSERIAL PRIMARY KEY,
  organizer_id  BIGINT       NOT NULL UNIQUE,
  holder_name   VARCHAR(120) NOT NULL,
  bank_name     VARCHAR(120) NOT NULL,
  iban          VARCHAR(34)  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- A transfer to an organizer.
--   linking   : created here, the payments are not yet confirmed as "paid out" in payment-service
--   pending   : payments are linked in payment-service, the admin has not sent the money yet
--   paid      : the admin confirmed the transfer
--   cancelled : payment-service refused the link (nothing was linked)
CREATE TABLE IF NOT EXISTS payout (
  id                BIGSERIAL PRIMARY KEY,
  organizer_id      BIGINT       NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'linking'
                                 CHECK (status IN ('linking', 'pending', 'paid', 'cancelled')),
  currency          CHAR(3)      NOT NULL DEFAULT 'TND',
  payments_count    INT          NOT NULL CHECK (payments_count > 0),
  total_amount      BIGINT       NOT NULL CHECK (total_amount > 0),
  total_commission  BIGINT       NOT NULL CHECK (total_commission >= 0),
  net_amount        BIGINT       NOT NULL CHECK (net_amount > 0),
  -- copy of the bank details at the time of the transfer (the organizer may change them later)
  holder_name       VARCHAR(120) NOT NULL,
  bank_name         VARCHAR(120) NOT NULL,
  iban              VARCHAR(34)  NOT NULL,
  created_by        BIGINT       NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  paid_by           BIGINT,
  paid_at           TIMESTAMPTZ,
  bank_reference    VARCHAR(100),
  cancel_reason     VARCHAR(200),
  CONSTRAINT chk_payout_net CHECK (net_amount = total_amount - total_commission)
);

-- The payments of a transfer. A payment can be in ONE transfer only.
CREATE TABLE IF NOT EXISTS payout_item (
  id                BIGSERIAL PRIMARY KEY,
  payout_id         BIGINT NOT NULL REFERENCES payout (id) ON DELETE CASCADE,
  payment_id        BIGINT NOT NULL UNIQUE,
  event_id          BIGINT NOT NULL,
  amount            BIGINT NOT NULL,
  commission_amount BIGINT NOT NULL,
  net_amount        BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_organizer ON payout (organizer_id);
CREATE INDEX IF NOT EXISTS idx_payout_status    ON payout (status);
CREATE INDEX IF NOT EXISTS idx_item_payout      ON payout_item (payout_id);
