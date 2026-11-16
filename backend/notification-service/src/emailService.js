const { getContact } = require('./accountClient');
const { validateEmail } = require('./emailValidator');
const { canSend, markSent } = require('./rateLimiter');
const { buildEmail } = require('./templates');
const { sendEmail } = require('./mailer');

const RETRY_DELAYS = [2000, 5000]; // 3 essais au total
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// on ne met jamais l'adresse complète dans les logs
const mask = (email) => email.replace(/^(.).*(@.*)$/, '$1***$2');

async function withRetry(fn) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
    }
  }
  throw lastError;
}

async function processNotification({ accountId, type, variables }) {
  if (!canSend(accountId, type)) {
    console.warn(`[${type}] compte ${accountId} : limite atteinte, email ignoré`);
    return 'SKIPPED';
  }

  const contact = await withRetry(() => getContact(accountId));
  if (!contact) {
    console.warn(`[${type}] compte ${accountId} introuvable`);
    return 'FAILED';
  }

  const check = await withRetry(() => validateEmail(contact.email));
  if (!check.valid) {
    console.warn(`[${type}] compte ${accountId} : adresse refusée (${check.reason})`);
    return 'SKIPPED';
  }

  // le prénom vient toujours d'account-service, jamais de l'appelant
  const { subject, html } = buildEmail(type, { ...variables, firstName: contact.firstName });

  await withRetry(() => sendEmail(contact.email, subject, html));
  markSent(accountId, type);
  console.log(`[${type}] email envoyé à ${mask(contact.email)}`);
  return 'SENT';
}

module.exports = { processNotification };