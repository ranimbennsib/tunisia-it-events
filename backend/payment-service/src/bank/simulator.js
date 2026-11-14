const crypto = require('crypto');
const { InvalidCardError } = require('./errors');
const { normalizeNumber, luhnValid, detectBrand, normalizeYear, isExpired } = require('./cards');

// Test cards, like in the sandbox of a real payment provider.
// Only these numbers are accepted or refused on purpose. Any other valid number is
// refused too, so that nobody ever gets a real card "accepted" by this simulator.
const TEST_CARDS = {
  '4242424242424242': { status: 'accepted' },
  '5555555555554444': { status: 'accepted' },
  '4000000000000002': { status: 'declined', reason: 'card_declined' },
  '4000000000009995': { status: 'declined', reason: 'insufficient_funds' },
  '4000000000000119': { status: 'declined', reason: 'processing_error' },
  // Fictitious "local" cards (they simulate a Tunisian bank card or an e-DINAR card)
  '9999000000000012': { status: 'accepted' },
  '9999000000000020': { status: 'declined', reason: 'insufficient_funds' }
};

const PROVIDER = 'SIMULATOR';

// A small fake "bank". Same contract as a real provider would have:
//   charge({ card: { number, expMonth, expYear, cvv }, amount, currency })
//   -> { status: 'accepted' | 'declined', transactionRef, brand, last4, reason, provider }
// It throws InvalidCardError when the card data is wrong.
// The full card number is never stored, logged or returned.
function createBankSimulator({ now = () => new Date() } = {}) {
  async function charge({ card, amount }) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('amount must be a positive integer (millimes)');
    }

    const number = normalizeNumber(card && card.number);
    if (!number || !luhnValid(number)) {
      throw new InvalidCardError('number', 'Invalid card number');
    }
    const brand = detectBrand(number); // 'visa' | 'mastercard' | 'amex' | 'local'
    if (!brand) {
  throw new InvalidCardError('number', 'Unsupported card brand');
}
    const month = Number(card.expMonth);
    const year = normalizeYear(card.expYear);
    if (!Number.isInteger(month) || month < 1 || month > 12 || year === null) {
      throw new InvalidCardError('expiry', 'Invalid expiry date');
    }
    if (isExpired(month, year, now())) {
      throw new InvalidCardError('expiry', 'Card has expired');
    }

    const cvvLength = brand === 'amex' ? 4 : 3;
    const cvv = typeof card.cvv === 'string' ? card.cvv : '';
    if (!new RegExp(`^\\d{${cvvLength}}$`).test(cvv)) {
      throw new InvalidCardError('cvv', 'Invalid security code');
    }

    const outcome = TEST_CARDS[number] || { status: 'declined', reason: 'not_a_test_card' };
    return {
      status: outcome.status,
      transactionRef: 'SIM-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
      brand,
      last4: number.slice(-4),
      reason: outcome.reason || null,
      provider: PROVIDER
    };
  }

  return { charge, provider: PROVIDER };
}

module.exports = { createBankSimulator, TEST_CARDS };