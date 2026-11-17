const fs = require('fs');
const path = require('path');

// Creates the table and the indexes if they do not exist yet (idempotent).
async function migrate(db) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(sql);
}

module.exports = { migrate };