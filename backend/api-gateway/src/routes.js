// Which URL prefix goes to which service.
// "paths" = whole prefixes, "patterns" = more precise rules (regular expressions).
const routeTable = [
  { service: 'account', paths: ['/api/auth', '/api/accounts', '/api/admin/accounts'] },
  { service: 'profile', paths: ['/api/profiles', '/api/admin/profiles'] },
  {
    service: 'event',
    paths: ['/api/events', '/api/admin/events'],
    // event-service: /api/organizers/{organizerId}/events/**
    patterns: [/^\/api\/organizers\/\d+\/events(\/.*)?$/]
  },
  { service: 'registration', paths: ['/api/registrations', '/api/favorites'] },
  { service: 'payment', paths: ['/api/payments', '/api/admin/payments'] },
  { service: 'payout', paths: ['/api/payouts', '/api/payout-accounts', '/api/admin/payouts'] },
  { service: 'notification', paths: ['/api/notifications'] }
];

// Routes that do NOT need a JWT
const publicRules = [
  // sign up / sign in / refresh
  // (current account-service: register, login, refresh; older names are kept too)
  { method: 'POST', pattern: /^\/api\/auth\/(register|signup|signin|login|refresh)(\/(user|organizer))?\/?$/ },
  // public event list and detail (but NOT /api/events/mine)
  { method: 'GET', pattern: /^\/api\/events\/?$/ },
  { method: 'GET', pattern: /^\/api\/events\/\d+\/?$/ },
  // public profile of an organizer
  { method: 'GET', pattern: /^\/api\/profiles\/organizers\/\d+\/?$/ },
  // number of places taken
  { method: 'GET', pattern: /^\/api\/registrations\/event\/\d+\/count\/?$/ },
  // payment gateway callback (the payment service checks it itself)
  { method: 'POST', pattern: /^\/api\/payments\/webhook\/?$/ }
];

// Routes protected against brute force (sign in / sign up)
const authRateLimitedPattern = /^\/api\/auth\/(register|signup|signin|login)(\/.*)?$/;

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// does this URL belong to the given entry of routeTable?
function matchesRoute(pathname, route) {
  return (
    matchesPrefix(pathname, route.paths) ||
    (route.patterns || []).some((re) => re.test(pathname))
  );
}

function isPublic(method, pathname) {
  return publicRules.some((r) => r.method === method && r.pattern.test(pathname));
}

module.exports = {
  routeTable,
  publicRules,
  authRateLimitedPattern,
  matchesPrefix,
  matchesRoute,
  isPublic
};