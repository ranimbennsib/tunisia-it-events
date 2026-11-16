const dns = require('dns').promises;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validateEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, reason: 'format invalide' };
  }

  const domain = email.split('@')[1];
  try {
    const records = await dns.resolveMx(domain);
    if (records.length > 0) return { valid: true };
    return { valid: false, reason: 'domaine sans serveur mail' };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return { valid: false, reason: 'domaine inexistant ou sans serveur mail' };
    }
    throw err; // problème DNS temporaire : on réessaiera
  }
}

module.exports = { validateEmail };