// Creates a test JWT (same format as the one account-service will produce)
// Usage: npm run token -- ADMIN 1      (role, accountId)
//        npm run token -- USER 5 refresh   (to test that a refresh token is refused)
require('dotenv').config();
const jwt = require('jsonwebtoken');

const role = (process.argv[2] || 'USER').toUpperCase();
const accountId = process.argv[3] || '1';
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('JWT_SECRET is missing (create the .env file first)');
  process.exit(1);
}
if (!['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
  console.error('Role must be USER, ORGANIZER or ADMIN');
  process.exit(1);
}

// "type" is the same claim as in account-service ("access" or "refresh")
const type = (process.argv[4] || 'access').toLowerCase();
console.log(jwt.sign({ role, type }, secret, { algorithm: 'HS256', subject: accountId, expiresIn: '30m' }));