const crypto = require('crypto');

const hash = (value) => crypto.createHash('sha256').update(String(value)).digest();

module.exports = (req, res, next) => {
  const expected = process.env.INTERNAL_API_KEY;
  const received = req.get('X-Internal-Key') || '';

  if (!expected || !crypto.timingSafeEqual(hash(received), hash(expected))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};