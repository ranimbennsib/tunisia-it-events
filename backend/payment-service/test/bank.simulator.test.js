const { createBankSimulator } = require('../src/bank/simulator');
const { InvalidCardError } = require('../src/bank/errors');
const { normalizeNumber, luhnValid, detectBrand, normalizeYear, isExpired } = require('../src/bank/cards');

const NOW = new Date('2026-11-15T10:00:00Z');
const bank = createBankSimulator({ now: () => NOW });

const goodCard = (overrides = {}) => ({
  number: '4242424242424242',
  expMonth: 12,
  expYear: 2030,
  cvv: '123',
  ...overrides
});

// Runs a promise that must fail and returns the error.
async function failure(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('Expected the call to fail');
}

describe('card helpers', () => {
  it('accepts spaces and dashes in the number', () => {
    expect(normalizeNumber('4242 4242 4242 4242')).toBe('4242424242424242');
    expect(normalizeNumber('4242-4242-4242-4242')).toBe('4242424242424242');
  });

  it('rejects letters, short numbers and non strings', () => {
    expect(normalizeNumber('4242abcd42424242')).toBe(null);
    expect(normalizeNumber('4242')).toBe(null);
    expect(normalizeNumber(4242424242424242)).toBe(null);
    expect(normalizeNumber(undefined)).toBe(null);
  });

  it('checks the Luhn checksum', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
  });

  it('detects the brand', () => {
    expect(detectBrand('4242424242424242')).toBe('visa');
    expect(detectBrand('5555555555554444')).toBe('mastercard');
    expect(detectBrand('2223003122003222')).toBe('mastercard');
    expect(detectBrand('378282246310005')).toBe('amex');
    expect(detectBrand('6011111111111117')).toBe(null);
  });

  it('normalizes the year', () => {
    expect(normalizeYear('28')).toBe(2028);
    expect(normalizeYear(2028)).toBe(2028);
    expect(normalizeYear('abc')).toBe(null);
  });

  it('treats a card as valid until the end of its expiry month', () => {
    expect(isExpired(11, 2026, NOW)).toBe(false);
    expect(isExpired(10, 2026, NOW)).toBe(true);
    expect(isExpired(12, 2025, NOW)).toBe(true);
    expect(isExpired(1, 2027, NOW)).toBe(false);
  });
});

describe('bank simulator: test cards', () => {
  it('accepts the Visa test card', async () => {
    const r = await bank.charge({ card: goodCard(), amount: 45000 });
    expect(r.status).toBe('accepted');
    expect(r.brand).toBe('visa');
    expect(r.last4).toBe('4242');
    expect(r.reason).toBe(null);
  });

  it('accepts the Mastercard test card', async () => {
    const r = await bank.charge({ card: goodCard({ number: '5555555555554444' }), amount: 45000 });
    expect(r.status).toBe('accepted');
    expect(r.brand).toBe('mastercard');
    expect(r.last4).toBe('4444');
  });

  it('declines the "card declined" test card', async () => {
    const r = await bank.charge({ card: goodCard({ number: '4000000000000002' }), amount: 45000 });
    expect(r.status).toBe('declined');
    expect(r.reason).toBe('card_declined');
  });

  it('declines the "insufficient funds" test card', async () => {
    const r = await bank.charge({ card: goodCard({ number: '4000000000009995' }), amount: 45000 });
    expect(r.status).toBe('declined');
    expect(r.reason).toBe('insufficient_funds');
  });

  it('declines the "processing error" test card', async () => {
    const r = await bank.charge({ card: goodCard({ number: '4000000000000119' }), amount: 45000 });
    expect(r.status).toBe('declined');
    expect(r.reason).toBe('processing_error');
  });

  it('declines any other valid number, so a real card is never accepted', async () => {
    const r = await bank.charge({ card: goodCard({ number: '4111111111111111' }), amount: 45000 });
    expect(r.status).toBe('declined');
    expect(r.reason).toBe('not_a_test_card');
  });

  it('accepts a number typed with spaces', async () => {
    const r = await bank.charge({ card: goodCard({ number: '4242 4242 4242 4242' }), amount: 45000 });
    expect(r.status).toBe('accepted');
  });

  it('accepts a 2 digit expiry year', async () => {
    const r = await bank.charge({ card: goodCard({ expYear: '30' }), amount: 45000 });
    expect(r.status).toBe('accepted');
  });
});

describe('bank simulator: result', () => {
  it('never returns the full card number', async () => {
    const r = await bank.charge({ card: goodCard(), amount: 45000 });
    expect(JSON.stringify(r).includes('4242424242424242')).toBe(false);
    expect(JSON.stringify(r).includes('123')).toBe(false);
  });

  it('gives a transaction reference that is unique', async () => {
    const a = await bank.charge({ card: goodCard(), amount: 45000 });
    const b = await bank.charge({ card: goodCard(), amount: 45000 });
    expect(a.transactionRef).toMatch(/^SIM-[0-9A-F]{16}$/);
    expect(a.transactionRef === b.transactionRef).toBe(false);
  });

  it('names its provider', async () => {
    const r = await bank.charge({ card: goodCard(), amount: 45000 });
    expect(r.provider).toBe('SIMULATOR');
  });
});

describe('bank simulator: invalid card data', () => {
  it('rejects a number that fails the Luhn check', async () => {
    const err = await failure(bank.charge({ card: goodCard({ number: '4242424242424241' }), amount: 45000 }));
    expect(err instanceof InvalidCardError).toBe(true);
    expect(err.field).toBe('number');
  });

  it('rejects a number with letters', async () => {
    const err = await failure(bank.charge({ card: goodCard({ number: 'abcd' }), amount: 45000 }));
    expect(err.field).toBe('number');
  });

  it('rejects an unsupported brand', async () => {
    const err = await failure(bank.charge({ card: goodCard({ number: '6011111111111117' }), amount: 45000 }));
    expect(err.field).toBe('number');
  });

  it('rejects an expired card', async () => {
    const err = await failure(bank.charge({ card: goodCard({ expMonth: 10, expYear: 2026 }), amount: 45000 }));
    expect(err.field).toBe('expiry');
    expect(err.message).toBe('Card has expired');
  });

  it('accepts a card that expires this month', async () => {
    const r = await bank.charge({ card: goodCard({ expMonth: 11, expYear: 2026 }), amount: 45000 });
    expect(r.status).toBe('accepted');
  });

  it('rejects month 13 and month 0', async () => {
    const a = await failure(bank.charge({ card: goodCard({ expMonth: 13 }), amount: 45000 }));
    const b = await failure(bank.charge({ card: goodCard({ expMonth: 0 }), amount: 45000 }));
    expect(a.field).toBe('expiry');
    expect(b.field).toBe('expiry');
  });

  it('rejects a security code with the wrong length or letters', async () => {
    const a = await failure(bank.charge({ card: goodCard({ cvv: '12' }), amount: 45000 }));
    const b = await failure(bank.charge({ card: goodCard({ cvv: '1234' }), amount: 45000 }));
    const c = await failure(bank.charge({ card: goodCard({ cvv: 'abc' }), amount: 45000 }));
    const d = await failure(bank.charge({ card: goodCard({ cvv: 123 }), amount: 45000 }));
    expect(a.field).toBe('cvv');
    expect(b.field).toBe('cvv');
    expect(c.field).toBe('cvv');
    expect(d.field).toBe('cvv');
  });

  it('wants a 4 digit code for American Express', async () => {
    const ok = await bank.charge({ card: goodCard({ number: '378282246310005', cvv: '1234' }), amount: 45000 });
    expect(ok.brand).toBe('amex');
    const err = await failure(bank.charge({ card: goodCard({ number: '378282246310005', cvv: '123' }), amount: 45000 }));
    expect(err.field).toBe('cvv');
  });

  it('does not put card data in the error message', async () => {
    const err = await failure(bank.charge({ card: goodCard({ number: '4242424242424241' }), amount: 45000 }));
    expect(err.message.includes('4242')).toBe(false);
  });

  it('rejects a missing card', async () => {
    const err = await failure(bank.charge({ card: undefined, amount: 45000 }));
    expect(err.field).toBe('number');
  });
});

describe('bank simulator: amount', () => {
  it('refuses a zero, negative or decimal amount', async () => {
    await failure(bank.charge({ card: goodCard(), amount: 0 }));
    await failure(bank.charge({ card: goodCard(), amount: -5 }));
    await failure(bank.charge({ card: goodCard(), amount: 45.5 }));
  });
});