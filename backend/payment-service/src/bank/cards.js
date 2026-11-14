// Pure helpers to validate card data. Nothing here stores or logs anything.

// Accepts spaces and dashes ("4242 4242 4242 4242"), returns digits only, or null.
function normalizeNumber(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s-]/g, '');
  return /^\d{13,19}$/.test(cleaned) ? cleaned : null;
}

// Luhn checksum: detects typing mistakes in a card number.
function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

// International brands are recognised by their prefix. Any other number is treated as a
// "local" card: the national cards of Tunisian banks (CIB) or e-DINAR cards.
function detectBrand(digits) {
  if (/^4/.test(digits)) return 'visa';

  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(digits)) {
    return 'mastercard';
  }

  if (/^3[47]/.test(digits)) return 'amex';

  if (/^9999/.test(digits)) return 'local_tn';

  return null;
}

// "28" becomes 2028; "2028" stays 2028.
function normalizeYear(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 0) return null;
  return y < 100 ? 2000 + y : y;
}

// A card is valid until the END of its expiry month.
function isExpired(month, year, now) {
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
}

module.exports = { normalizeNumber, luhnValid, detectBrand, normalizeYear, isExpired };