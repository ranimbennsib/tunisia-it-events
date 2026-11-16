require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const internalKey = require('./middleware/internalkey');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/internal', internalKey);
app.use('/internal/notifications', notificationRoutes);

const port = process.env.PORT || 3008;
app.listen(port, () => console.log(`notification-service sur le port ${port}`));