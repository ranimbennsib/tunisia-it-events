const express = require('express');
const { errorHandler, notFound } = require('./errors');
const registrations = require('./registrations');
const favorites = require('./favorites');
const internal = require('./internal');
const eventNotify = require('./eventNotify');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/registrations', registrations);
app.use('/api/favorites', favorites);
app.use('/internal/registrations', internal);
app.use('/internal/events', eventNotify);

app.use(notFound);
app.use(errorHandler);

module.exports = app;