// Thrown when the card data itself is wrong (bad number, expired, bad security code).
// This is NOT a refused payment: the customer simply has to correct the form.
class InvalidCardError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'InvalidCardError';
    this.field = field; // 'number' | 'expiry' | 'cvv'
  }
}

module.exports = { InvalidCardError };