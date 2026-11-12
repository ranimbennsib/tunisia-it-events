const config = require('./config');
const { HttpError } = require('./errors');

async function getEvent(id) {
  const url = `${config.eventServiceUrl}/api/events/${id}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch (err) {
    throw new HttpError(503, 'Event service unavailable');
  }

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new HttpError(503, 'Event service unavailable');
  }

  return res.json();
}

module.exports = { getEvent };