const pool = require('./db');

// Crée la table des notifications dans l'application si elle n'existe pas encore,
// et ajoute la colonne payout_id (virement concerné) si elle manque.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification (
      id         BIGSERIAL PRIMARY KEY,
      account_id BIGINT       NOT NULL,
      type       VARCHAR(40)  NOT NULL,
      message    VARCHAR(500) NOT NULL,
      event_id   BIGINT,
      is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
      sent_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    ALTER TABLE notification ADD COLUMN IF NOT EXISTS payout_id BIGINT;
    CREATE INDEX IF NOT EXISTS idx_notification_account
      ON notification (account_id, is_read, sent_at DESC);
  `);
}

module.exports = initDb;