// Fabrique un token de test, sans lancer account-service.
// Utilisation : node scripts/makeToken.js <idDuCompte> [ROLE]     (ROLE par défaut : ADMIN)
require('dotenv').config();
const jwt = require('jsonwebtoken');

const [id, role] = process.argv.slice(2);
if (!id) {
  console.log('Utilisation : node scripts/makeToken.js <idDuCompte> [ADMIN|USER|ORGANIZER]');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.log('JWT_SECRET manque dans le .env');
  process.exit(1);
}

console.log(
  jwt.sign({ sub: String(id), role: role || 'ADMIN', type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' })
);