/**
 * End-to-end API tests (node:test). Runs against an in-memory store
 * (no file persistence) so the demo data is never modified.
 *   npm test   (from /server or the repo root)
 */
process.env.CAMPUSFLOW_PERSIST = 'false';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/index.js');
const { reset } = await import('../src/store/index.js');

let server;
let base;
const tokens = {};

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

before(async () => {
  reset();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  for (const [role, email, password] of [
    ['student', 'etudiant@campusflow.bj', 'Etudiant123!'],
    ['prof', 'prof@campusflow.bj', 'Prof123!'],
    ['admin', 'admin@campusflow.bj', 'Admin123!'],
  ]) {
    const r = await call('POST', '/auth/login', { body: { email, password } });
    assert.equal(r.status, 200, `login ${role}`);
    tokens[role] = r.body.token;
  }
});

after(() => server.close());

test('authentification : mauvais mot de passe et validation', async () => {
  assert.equal((await call('POST', '/auth/login', { body: { email: 'etudiant@campusflow.bj', password: 'nope' } })).status, 401);
  assert.equal((await call('POST', '/auth/login', { body: { email: 'pas-un-email', password: 'x' } })).status, 400);
  assert.equal((await call('GET', '/dashboard')).status, 401);
  const me = await call('GET', '/auth/me', { token: tokens.student });
  assert.equal(me.body.user.role, 'STUDENT');
  assert.equal(me.body.user.passwordHash, undefined, 'le hash ne doit jamais sortir');
});

test('permissions par rôle', async () => {
  assert.equal((await call('GET', '/students', { token: tokens.student })).status, 403);
  assert.equal((await call('POST', '/courses', { token: tokens.prof, body: {} })).status, 403);
  assert.equal((await call('GET', '/reports', { token: tokens.prof })).status, 403);
  assert.equal((await call('GET', '/reports', { token: tokens.admin })).status, 200);
  // Professor only sees students of his courses
  const all = await call('GET', '/students', { token: tokens.admin });
  const mine = await call('GET', '/students', { token: tokens.prof });
  assert.ok(mine.body.data.length < all.body.data.length);
});

test('moyenne pondérée calculée à partir des notes réelles', async () => {
  const r = await call('GET', '/grades/me', { token: tokens.student });
  assert.equal(r.status, 200);
  const { courses, generalAverage } = r.body.data;
  let s = 0; let c = 0;
  for (const course of courses) {
    let ns = 0; let w = 0;
    for (const e of course.evaluations) if (e.value !== null) { ns += e.value * e.weight; w += e.weight; }
    const avg = w ? Math.round((ns / w) * 100) / 100 : null;
    assert.equal(course.average, avg, `moyenne ${course.code}`);
    if (avg !== null) { s += avg * course.coefficient; c += course.coefficient; }
  }
  assert.equal(generalAverage, Math.round((s / c) * 100) / 100);
});

test('saisie de notes par le professeur + notification à l’étudiant', async () => {
  const courses = await call('GET', '/courses', { token: tokens.prof });
  const course = courses.body.data.find((x) => x.code === 'INF201');
  const ev = await call('POST', `/courses/${course.id}/evaluations`, { token: tokens.prof, body: { title: 'TP noté', type: 'TP', weight: 1, date: '2026-11-01' } });
  assert.equal(ev.status, 201);
  const book = await call('GET', `/courses/${course.id}/gradebook`, { token: tokens.prof });
  const aicha = book.body.data.students.find((s) => s.fullName === 'Aïcha Dossou');
  const bad = await call('PUT', `/evaluations/${ev.body.data.id}/grades`, { token: tokens.prof, body: { grades: [{ studentId: aicha.id, value: 25 }] } });
  assert.equal(bad.status, 400);
  const before = (await call('GET', '/notifications/unread-count', { token: tokens.student })).body.unread;
  const ok = await call('PUT', `/evaluations/${ev.body.data.id}/grades`, { token: tokens.prof, body: { grades: [{ studentId: aicha.id, value: '19,5' }] } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.changed, 1);
  const after = (await call('GET', '/notifications/unread-count', { token: tokens.student })).body.unread;
  assert.equal(after, before + 1);
  // Another professor cannot grade this course
  const other = await call('POST', '/auth/login', { body: { email: 'k.dossa@campusflow.bj', password: 'Prof123!' } });
  assert.equal((await call('PUT', `/evaluations/${ev.body.data.id}/grades`, { token: other.body.token, body: { grades: [] } })).status, 403);
});

test('CRUD admin : classe, cours, étudiant (inscription automatique)', async () => {
  const cls = await call('POST', '/classes', { token: tokens.admin, body: { name: 'Licence 3 Informatique', code: 'L3-INFO', level: 'Licence 3', program: 'Informatique', academicYear: '2026-2027' } });
  assert.equal(cls.status, 201);
  const profs = await call('GET', '/professors', { token: tokens.admin });
  const course = await call('POST', '/courses', { token: tokens.admin, body: { code: 'INF301', title: 'Génie logiciel', coefficient: 3, credits: 5, semester: 'Semestre 1', classId: cls.body.data.id, professorId: profs.body.data[0].id } });
  assert.equal(course.status, 201);
  const dup = await call('POST', '/courses', { token: tokens.admin, body: { code: 'INF301', title: 'Doublon', coefficient: 1, credits: 1, semester: 'Semestre 1', classId: cls.body.data.id } });
  assert.equal(dup.status, 409);
  const st = await call('POST', '/students', { token: tokens.admin, body: { firstName: 'Koami', lastName: 'Test', email: 'koami@test.bj', classId: cls.body.data.id } });
  assert.equal(st.status, 201);
  assert.ok(st.body.initialPassword);
  const detail = await call('GET', `/courses/${course.body.data.id}`, { token: tokens.admin });
  assert.equal(detail.body.data.students.length, 1);
  const upd = await call('PUT', `/students/${st.body.data.id}`, { token: tokens.admin, body: { phone: '+229 00 00 00 00' } });
  assert.equal(upd.status, 200);
  assert.equal((await call('DELETE', `/classes/${cls.body.data.id}`, { token: tokens.admin })).status, 409);
  assert.equal((await call('DELETE', `/students/${st.body.data.id}`, { token: tokens.admin })).status, 200);
  assert.equal((await call('DELETE', `/courses/${course.body.data.id}`, { token: tokens.admin })).status, 200);
  assert.equal((await call('DELETE', `/classes/${cls.body.data.id}`, { token: tokens.admin })).status, 200);
});

test('emploi du temps : création et détection de conflit', async () => {
  const courses = await call('GET', '/courses', { token: tokens.admin });
  const inf202 = courses.body.data.find((c) => c.code === 'INF202');
  const clash = await call('POST', '/timetable', { token: tokens.admin, body: { courseId: inf202.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Salle 999', startDate: '2026-09-01', endDate: '2027-01-31' } });
  assert.equal(clash.status, 409, 'la classe a déjà cours le lundi 8h-10h');
  const ok = await call('POST', '/timetable', { token: tokens.admin, body: { courseId: inf202.id, dayOfWeek: 6, startTime: '09:00', endTime: '11:00', room: 'Salle 204', startDate: '2026-09-01', endDate: '2027-01-31' } });
  assert.equal(ok.status, 201);
  const badTime = await call('PUT', `/timetable/${ok.body.data.id}`, { token: tokens.admin, body: { endTime: '08:00' } });
  assert.equal(badTime.status, 400);
  assert.equal((await call('DELETE', `/timetable/${ok.body.data.id}`, { token: tokens.admin })).status, 200);
});

test('activités : inscription, doublon, annulation', async () => {
  const list = await call('GET', '/activities?status=upcoming', { token: tokens.student });
  const a = list.body.data.find((x) => x.canRegister);
  assert.ok(a, 'au moins une activité ouverte');
  const r1 = await call('POST', `/activities/${a.id}/register`, { token: tokens.student });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.data.isRegistered, true);
  assert.equal((await call('POST', `/activities/${a.id}/register`, { token: tokens.student })).status, 409);
  const r2 = await call('DELETE', `/activities/${a.id}/register`, { token: tokens.student });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.data.isRegistered, false);
  assert.equal((await call('POST', `/activities/${a.id}/register`, { token: tokens.prof })).status, 403);
});

test('notifications : lecture et suppression', async () => {
  const list = await call('GET', '/notifications', { token: tokens.student });
  const n = list.body.data[0];
  assert.equal((await call('PATCH', `/notifications/${n.id}/read`, { token: tokens.student })).status, 200);
  assert.equal((await call('PATCH', `/notifications/${n.id}/read`, { token: tokens.prof })).status, 404, 'pas la notification d’un autre');
  assert.equal((await call('PATCH', '/notifications/read-all', { token: tokens.student })).status, 200);
  assert.equal((await call('GET', '/notifications/unread-count', { token: tokens.student })).body.unread, 0);
});

test('déconnexion : le jeton est invalidé', async () => {
  const login = await call('POST', '/auth/login', { body: { email: 'f.zinsou@campusflow.bj', password: 'Etudiant123!' } });
  const t = login.body.token;
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal((await call('POST', '/auth/logout', { token: t })).status, 200);
  assert.equal((await call('GET', '/auth/me', { token: t })).status, 401);
});
