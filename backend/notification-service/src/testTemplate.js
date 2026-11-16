require('dotenv').config();
const { buildEmail } = require('./templates');
const { sendEmail } = require('./mailer');

const [type, to] = process.argv.slice(2);
if (!type || !to) {
  console.log('Utilisation : node src/testTemplate.js TYPE adresse@email.com');
  process.exit(1);
}

const sample = {
  firstName: 'Sara',
  eventTitle: 'DevFest Tunis',
  rejectReason: 'Description trop courte',
  resetToken: 'xyz789',
};

const { subject, html } = buildEmail(type, sample);
sendEmail(to, subject, html)
  .then(() => console.log('Envoyé :', subject))
  .catch((err) => console.error('Erreur :', err.message));