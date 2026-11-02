import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { find, update, byId, getSettings } from '../store/index.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { validate, passwordRule } from '../lib/validate.js';
import { unauthorized, badRequest, conflict } from '../lib/http.js';
import { publicUser, studentOf, professorOf, studentView, professorView } from '../services/academics.js';

const router = Router();

// Simple in-memory brute-force protection (per email, 10 attempts / 15 min).
const attempts = new Map();
function tooManyAttempts(email) {
  const a = attempts.get(email);
  if (!a) return false;
  if (Date.now() - a.first > 15 * 60 * 1000) { attempts.delete(email); return false; }
  return a.count >= 10;
}
function recordFailure(email) {
  const a = attempts.get(email) || { count: 0, first: Date.now() };
  a.count += 1;
  attempts.set(email, a);
}

export function profileFor(user) {
  const base = publicUser(user);
  if (user.role === 'STUDENT') base.student = studentView(studentOf(user));
  if (user.role === 'PROFESSOR') base.professor = professorView(professorOf(user));
  return base;
}

router.post('/login', (req, res) => {
  const { email, password } = validate(req.body, {
    email: { type: 'email', required: true, label: 'L’adresse e-mail' },
    password: { type: 'string', required: true, label: 'Le mot de passe' },
  });
  if (tooManyAttempts(email)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }
  const user = find('users', (u) => u.email === email);
  if (!user || user.active === false || !bcrypt.compareSync(password, user.passwordHash)) {
    recordFailure(email);
    throw unauthorized('Adresse e-mail ou mot de passe incorrect.');
  }
  attempts.delete(email);
  update('users', user.id, { lastLoginAt: new Date().toISOString() });
  res.json({ token: signToken(user), user: profileFor(user), settings: getSettings() });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: profileFor(req.user), settings: getSettings() });
});

// Logout: tokens issued before this moment become invalid for this user.
router.post('/logout', authenticate, (req, res) => {
  update('users', req.user.id, { tokenVersionAt: Date.now() });
  res.json({ ok: true });
});

router.put('/profile', authenticate, (req, res) => {
  const data = validate(req.body, {
    firstName: { type: 'string', min: 2, max: 60, label: 'Le prénom' },
    lastName: { type: 'string', min: 2, max: 60, label: 'Le nom' },
    phone: { type: 'string', max: 30, label: 'Le téléphone' },
    email: { type: 'email', label: 'L’adresse e-mail' },
  }, { partial: true });
  if (data.email && find('users', (u) => u.email === data.email && u.id !== req.user.id)) {
    throw conflict('Cette adresse e-mail est déjà utilisée.');
  }
  const user = update('users', req.user.id, data);
  res.json({ user: profileFor(user) });
});

router.put('/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = validate(req.body, {
    currentPassword: { type: 'string', required: true, label: 'Le mot de passe actuel' },
    newPassword: { ...passwordRule('Le nouveau mot de passe'), required: true },
  });
  const user = byId('users', req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    throw badRequest('Le mot de passe actuel est incorrect.', { currentPassword: 'Mot de passe incorrect.' });
  }
  update('users', user.id, { passwordHash: bcrypt.hashSync(newPassword, 10) });
  res.json({ ok: true });
});

export default router;
