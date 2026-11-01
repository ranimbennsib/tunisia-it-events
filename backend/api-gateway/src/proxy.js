const { createProxyMiddleware } = require('http-proxy-middleware');
const { routeTable, matchesPrefix } = require('./routes');
const { sendError } = require('./errors');

// One proxy per service
function createProxies(config) {
  return routeTable.map(({ service, paths }) =>
    createProxyMiddleware({
      target: config.services[service],
      changeOrigin: true,
      xfwd: true,
      proxyTimeout: 15000,
      timeout: 15000,
      pathFilter: (pathname) => matchesPrefix(pathname, paths),
      pathRewrite: config.stripApiPrefix ? { '^/api': '' } : undefined,
      on: {
        proxyReq: (proxyReq, req) => {
          // a client must never be able to fake an internal call
          proxyReq.removeHeader('x-internal-key');
          // same id in the gateway logs and in the service logs
          proxyReq.setHeader('X-Request-Id', req.id);
        },
        error: (err, req, res) => {
          if (typeof res.writeHead !== 'function' || res.headersSent) return;
          const timeout = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET';
          const status = timeout ? 504 : 503;
          const message = timeout
            ? `The ${service}-service took too long to answer`
            : `The ${service}-service is unavailable`;
          sendError(req, res, status, message);
        }
      }
    })
  );
}

module.exports = createProxies;