// Fabricates a test token with the JWT_SECRET of your .env (the secret is never printed).
// Usage:  npm run token -- USER 5
//         npm run token -- ADMIN 1
//         npm run token -- USER 5 refresh     (a refresh token: must be refused)
//         npm run token -- USER 5 access -60  (already expired)
require('dotenv').config();
const jwt = require('jsonwebtoken');

const [role = 'USER', id = '1', type = 'access', ttl = '1800'] = process.argv.slice(2);
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error('JWT_SECRET is missing or shorter than 32 characters in .env');
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const token = jwt.sign(
  { sub: String(id), role, type, iat: now, exp: now + parseInt(ttl, 10) },
  secret,
  { algorithm: 'HS256' }
);
console.log(token);