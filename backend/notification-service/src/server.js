require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const internalKey = require('./middleware/internalkey');
const notificationRoutes = require('./routes/notifications');
const inAppRoutes = require('./routes/inApp');
const initDb = require('./initDb');
const app = express();
const internalInAppRoutes = require('./routes/internalInApp');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/internal', internalKey);
app.use('/internal/notifications', notificationRoutes);
app.use('/internal/notifications/in-app', internalInAppRoutes);
// Notifications dans l'application : lues par le front (via la gateway), avec le token de l'utilisateur
app.use('/api/notifications', inAppRoutes);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET manque ou fait moins de 32 caractères : les notifications dans l\'application refuseront tous les tokens');
}
const port = process.env.PORT || 3008;

initDb()
  .then(() => console.log('Base notification_db prête'))
  .catch((err) =>
    console.error(
      `Base de données indisponible (${err.message}) : les notifications dans l'application sont désactivées, les emails continuent de marcher`
    )
  )
  .finally(() => app.listen(port, () => console.log(`notification-service sur le port ${port}`)));