import { insert, where, all } from '../store/index.js';

/** Create one internal notification per recipient. */
export function notify(userIds, { title, message, type = 'INFO', link = '/' }) {
  const unique = [...new Set(userIds.filter(Boolean))];
  return unique.map((userId) => insert('notifications', { userId, title, message, type, link, read: false }));
}

/** Append to the activity feed shown on dashboards. */
export function logActivity(actorId, message, audience = []) {
  return insert('activityLog', { actorId, message, audience: [...new Set([actorId, ...audience].filter(Boolean))] });
}

export function userIdsByRole(role) {
  return where('users', (u) => u.role === role && u.active !== false).map((u) => u.id);
}

export function adminIds() {
  return userIdsByRole('ADMIN');
}

export function allUserIds() {
  return all('users').filter((u) => u.active !== false).map((u) => u.id);
}
