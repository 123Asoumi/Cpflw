import jwt from 'jsonwebtoken';
import { byId } from '../store/index.js';
import { unauthorized, forbidden } from '../lib/http.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'campusflow-dev-secret-change-me';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = byId('users', payload.sub);
    if (!user || user.active === false) return next(unauthorized('Session invalide. Veuillez vous reconnecter.'));
    if (user.tokenVersionAt && payload.iat < Math.floor(user.tokenVersionAt / 1000)) {
      return next(unauthorized('Session expirée. Veuillez vous reconnecter.'));
    }
    req.user = user;
    next();
  } catch {
    next(unauthorized('Session expirée. Veuillez vous reconnecter.'));
  }
}

/** authorize('ADMIN'), authorize('ADMIN', 'PROFESSOR') ... */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};
