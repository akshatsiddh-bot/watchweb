const User = require('../models/User');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const { signAccessToken } = require('../services/tokenService');
const { AppError } = require('../middleware/errorHandler');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    const token = signAccessToken(user);
    return res.status(201).json({ user: user.toJSON(), token });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signAccessToken(user);
    return res.json({ user: user.toJSON(), token });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    // Stateless JWTs: logout is enforced client-side by discarding the token.
    // Bumping tokenVersion here would also invalidate other active sessions,
    // so we only do that via the explicit "logout everywhere" / password-change flow.
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function logoutAllSessions(req, res, next) {
  try {
    req.user.tokenVersion += 1;
    await req.user.save();
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    return res.json({ user: req.user.toJSON() });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, logoutAllSessions, me };
