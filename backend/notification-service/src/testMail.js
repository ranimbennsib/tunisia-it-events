const { sendEmail } = require('./mailer');

const to = process.argv[2];
if (!to) {
  console.log('Utilisation : node src/testMail.js adresse@email.com');
  process.exit(1);
}

sendEmail(to, 'Test notification-service', '<h3>Ça marche ✅</h3>')
  .then(() => console.log('Email envoyé à', to))
  .catch((err) => console.error('Erreur :', err.message));