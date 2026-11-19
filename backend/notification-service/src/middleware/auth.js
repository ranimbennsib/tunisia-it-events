const jwt = require('jsonwebtoken');

// account-service signe en HMAC (HS256, HS384 ou HS512 selon la longueur de JWT_SECRET).
// Seuls ces algorithmes sont acceptés : jamais "none", jamais un algorithme asymétrique.
const ALLOWED_ALGORITHMS = ['HS256', 'HS384', 'HS512'];

// Lit "Authorization: Bearer <token>", vérifie la signature et la date d'expiration,
// puis met { id, role } dans req.user. L'identité vient TOUJOURS du token.
module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7).trim();

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALLOWED_ALGORITHMS });
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: message });
  }

  const id = Number(claims.sub);
  // un refresh token ne doit jamais ouvrir une route
  if (claims.type !== 'access' || !Number.isSafeInteger(id) || id <= 0) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = { id, role: claims.role };
  next();
};