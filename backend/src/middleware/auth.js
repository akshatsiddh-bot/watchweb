const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');

/**
 * Requires a valid Bearer JWT. Attaches req.user (Mongoose doc, without passwordHash)
 * and req.userId (string) derived ONLY from the token - never from client-supplied body/query.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    req.user = user;
    req.userId = user._id.toString();
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
