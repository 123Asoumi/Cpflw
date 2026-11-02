import { Router } from 'express';
import {
  all, byId, find, where, insert, update, remove, removeWhere, getSettings, updateSettings,
} from '../store/index.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/http.js';
import {
  studentView, professorView, courseView, classView, coursesFor, studentOf, professorOf,
  studentReport, recentGrades, timetableFor, upcomingSessions, publicUser, courseAverage,
} from '../services/academics.js';
import { notify, logActivity, adminIds, userIdsByRole, allUserIds } from '../services/notify.js';

const router = Router();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const matches = (q, ...fields) => !q || fields.some((f) => (f || '').toLowerCase().includes(q));

/* ======================= ACTIVITIES ======================= */
const activitySchema = {
  title: { type: 'string', required: true, min: 3, max: 120, label: 'Le titre' },
  description: { type: 'string', required: true, min: 10, max: 2000, label: 'La description' },
  date: { type: 'date', required: true, label: 'La date' },
  startTime: { type: 'time', required: true, label: 'L’heure de début' },
  endTime: { type: 'time', required: true, label: 'L’heure de fin' },
  location: { type: 'string', required: true, max: 120, label: 'Le lieu' },
  capacity: { type: 'number', required: true, min: 1, max: 10000, integer: true, label: 'La capacité' },
  category: { type: 'enum', required: true, values: ['Conférence', 'Atelier', 'Compétition', 'Sport', 'Culture', 'Vie de campus'], label: 'La catégorie' },
  registrationOpen: { type: 'boolean', label: 'Inscriptions ouvertes' },
};

function activityView(a, user) {
  const regs = where('registrations', (r) => r.activityId === a.id);
  const isPast = a.date < today();
  const view = {
    ...a,
    registeredCount: regs.length,
    spotsLeft: Math.max(0, a.capacity - regs.length),
    isPast,
    isFull: regs.length >= a.capacity,
  };
  if (user?.role === 'STUDENT') {
    const s = studentOf(user);
    const reg = s && regs.find((r) => r.studentId === s.id);
    view.isRegistered = !!reg;
    view.registeredAt = reg?.createdAt || null;
    view.canRegister = !reg && a.registrationOpen && !isPast && regs.length < a.capacity;
    view.canCancel = !!reg && !isPast;
  }
  return view;
}

const registeredUserIds = (activityId) => where('registrations', (r) => r.activityId === activityId)
  .map((r) => byId('students', r.studentId)?.userId).filter(Boolean);

router.get('/activities', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const { category, status } = req.query; // status: upcoming | past | registered
  let rows = all('activities').map((a) => activityView(a, req.user))
    .filter((a) => !category || a.category === category)
    .filter((a) => matches(q, a.title, a.description, a.location));
  if (status === 'upcoming') rows = rows.filter((a) => !a.isPast);
  if (status === 'past') rows = rows.filter((a) => a.isPast);
  if (status === 'registered') rows = rows.filter((a) => a.isRegistered);
  rows.sort((a, b) => (a.isPast - b.isPast) || (a.isPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  res.json({ data: rows, total: rows.length });
});

router.get('/activities/:id', (req, res) => {
  const a = byId('activities', req.params.id);
  if (!a) throw notFound('Activité introuvable.');
  const data = activityView(a, req.user);
  if (req.user.role === 'ADMIN') {
    data.registrations = where('registrations', (r) => r.activityId === a.id).map((r) => {
      const s = studentView(byId('students', r.studentId));
      return { id: r.id, createdAt: r.createdAt, studentId: r.studentId, fullName: s?.fullName, email: s?.email, matricule: s?.matricule, className: s?.className };
    }).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  }
  res.json({ data });
});

router.post('/activities', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, activitySchema);
  if (data.endTime <= data.startTime) throw badRequest('L’heure de fin doit être après l’heure de début.', { endTime: 'Doit être après le début.' });
  const a = insert('activities', { registrationOpen: true, ...data });
  notify(userIdsByRole('STUDENT'), { title: 'Nouvelle activité', message: `« ${a.title} » le ${a.date} — inscriptions ${a.registrationOpen ? 'ouvertes' : 'bientôt ouvertes'}.`, type: 'ACTIVITY', link: `/activities/${a.id}` });
  logActivity(req.user.id, `Activité créée : ${a.title}`, userIdsByRole('STUDENT'));
  res.status(201).json({ data: activityView(a, req.user) });
});

router.put('/activities/:id', authorize('ADMIN'), (req, res) => {
  const a = byId('activities', req.params.id);
  if (!a) throw notFound('Activité introuvable.');
  const data = validate(req.body, activitySchema, { partial: true });
  const merged = { ...a, ...data };
  if (merged.endTime <= merged.startTime) throw badRequest('L’heure de fin doit être après l’heure de début.', { endTime: 'Doit être après le début.' });
  const count = where('registrations', (r) => r.activityId === a.id).length;
  if (merged.capacity < count) throw conflict(`La capacité ne peut pas être inférieure au nombre d’inscrits (${count}).`, { capacity: `Minimum : ${count}` });
  update('activities', a.id, data);
  notify(registeredUserIds(a.id), { title: 'Activité modifiée', message: `« ${a.title} » a été mise à jour (${a.date}, ${a.startTime}, ${a.location}).`, type: 'ACTIVITY', link: `/activities/${a.id}` });
  logActivity(req.user.id, `Activité modifiée : ${a.title}`);
  res.json({ data: activityView(a, req.user) });
});

router.delete('/activities/:id', authorize('ADMIN'), (req, res) => {
  const a = byId('activities', req.params.id);
  if (!a) throw notFound('Activité introuvable.');
  const recipients = registeredUserIds(a.id);
  removeWhere('registrations', (r) => r.activityId === a.id);
  remove('activities', a.id);
  notify(recipients, { title: 'Activité annulée', message: `« ${a.title} » prévue le ${a.date} est annulée.`, type: 'ACTIVITY', link: '/activities' });
  logActivity(req.user.id, `Activité supprimée : ${a.title}`, recipients);
  res.json({ ok: true });
});

router.post('/activities/:id/register', authorize('STUDENT'), (req, res) => {
  const a = byId('activities', req.params.id);
  if (!a) throw notFound('Activité introuvable.');
  const s = studentOf(req.user);
  if (find('registrations', (r) => r.activityId === a.id && r.studentId === s.id)) throw conflict('Vous êtes déjà inscrit(e) à cette activité.');
  if (a.date < today()) throw badRequest('Cette activité est terminée.');
  if (!a.registrationOpen) throw badRequest('Les inscriptions sont fermées pour cette activité.');
  if (where('registrations', (r) => r.activityId === a.id).length >= a.capacity) throw conflict('Cette activité est complète.');
  insert('registrations', { activityId: a.id, studentId: s.id });
  notify([req.user.id], { title: 'Inscription confirmée', message: `Vous êtes inscrit(e) à « ${a.title} » le ${a.date} à ${a.startTime}.`, type: 'ACTIVITY', link: `/activities/${a.id}` });
  notify(adminIds(), { title: 'Nouvelle inscription', message: `${req.user.firstName} ${req.user.lastName} s’est inscrit(e) à « ${a.title} ».`, type: 'ACTIVITY', link: `/activities/${a.id}` });
  logActivity(req.user.id, `Inscription à « ${a.title} »`, adminIds());
  res.status(201).json({ data: activityView(a, req.user) });
});

router.delete('/activities/:id/register', authorize('STUDENT'), (req, res) => {
  const a = byId('activities', req.params.id);
  if (!a) throw notFound('Activité introuvable.');
  const s = studentOf(req.user);
  const reg = find('registrations', (r) => r.activityId === a.id && r.studentId === s.id);
  if (!reg) throw badRequest('Vous n’êtes pas inscrit(e) à cette activité.');
  if (a.date < today()) throw badRequest('Impossible d’annuler : l’activité est terminée.');
  remove('registrations', reg.id);
  notify([req.user.id], { title: 'Inscription annulée', message: `Votre inscription à « ${a.title} » est annulée.`, type: 'ACTIVITY', link: `/activities/${a.id}` });
  logActivity(req.user.id, `Désinscription de « ${a.title} »`, adminIds());
  res.json({ data: activityView(a, req.user) });
});

router.delete('/activities/:id/registrations/:regId', authorize('ADMIN'), (req, res) => {
  const reg = byId('registrations', req.params.regId);
  if (!reg || reg.activityId !== req.params.id) throw notFound('Inscription introuvable.');
  const a = byId('activities', reg.activityId);
  const uid = byId('students', reg.studentId)?.userId;
  remove('registrations', reg.id);
  notify([uid], { title: 'Inscription retirée', message: `Votre inscription à « ${a.title} » a été retirée par l’administration.`, type: 'ACTIVITY', link: `/activities/${a.id}` });
  res.json({ ok: true });
});

/* ======================= NOTIFICATIONS ======================= */
router.get('/notifications', (req, res) => {
  const { filter } = req.query; // unread | all
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const mine = where('notifications', (n) => n.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = mine.filter((n) => !n.read).length;
  const rows = (filter === 'unread' ? mine.filter((n) => !n.read) : mine).slice(0, limit);
  res.json({ data: rows, unread, total: mine.length });
});

router.get('/notifications/unread-count', (req, res) => {
  res.json({ unread: where('notifications', (n) => n.userId === req.user.id && !n.read).length });
});

router.patch('/notifications/read-all', (req, res) => {
  const list = where('notifications', (n) => n.userId === req.user.id && !n.read);
  for (const n of list) update('notifications', n.id, { read: true });
  res.json({ ok: true, updated: list.length });
});

router.patch('/notifications/:id/read', (req, res) => {
  const n = byId('notifications', req.params.id);
  if (!n || n.userId !== req.user.id) throw notFound('Notification introuvable.');
  update('notifications', n.id, { read: req.body?.read === false ? false : true });
  res.json({ data: n });
});

router.delete('/notifications/:id', (req, res) => {
  const n = byId('notifications', req.params.id);
  if (!n || n.userId !== req.user.id) throw notFound('Notification introuvable.');
  remove('notifications', n.id);
  res.json({ ok: true });
});

/* ======================= ANNOUNCEMENTS ======================= */
const visibleAnnouncements = (user) => all('announcements')
  .filter((a) => user.role === 'ADMIN' || a.audience === 'ALL' || a.audience === user.role)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .map((a) => ({ ...a, author: publicUser(byId('users', a.authorId))?.fullName || 'Administration' }));

router.get('/announcements', (req, res) => {
  res.json({ data: visibleAnnouncements(req.user) });
});

router.post('/announcements', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, {
    title: { type: 'string', required: true, min: 3, max: 120, label: 'Le titre' },
    body: { type: 'string', required: true, min: 5, max: 2000, label: 'Le message' },
    audience: { type: 'enum', required: true, values: ['ALL', 'STUDENT', 'PROFESSOR'], label: 'Le public' },
  });
  const a = insert('announcements', { ...data, authorId: req.user.id });
  const recipients = data.audience === 'ALL' ? allUserIds() : userIdsByRole(data.audience);
  notify(recipients.filter((id) => id !== req.user.id), { title: a.title, message: a.body, type: 'ANNOUNCEMENT', link: '/' });
  logActivity(req.user.id, `Annonce publiée : ${a.title}`, recipients);
  res.status(201).json({ data: a });
});

router.delete('/announcements/:id', authorize('ADMIN'), (req, res) => {
  if (!remove('announcements', req.params.id)) throw notFound('Annonce introuvable.');
  res.json({ ok: true });
});

/* ======================= DASHBOARD ======================= */
const feedFor = (user, limit = 6) => where('activityLog', (l) => l.audience?.includes(user.id))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
  .map((l) => ({ ...l, actor: publicUser(byId('users', l.actorId))?.fullName || 'Système' }));

router.get('/dashboard', (req, res) => {
  const user = req.user;
  const settings = getSettings();
  const base = { settings, announcements: visibleAnnouncements(user).slice(0, 4), recentActivity: feedFor(user) };

  if (user.role === 'STUDENT') {
    const s = studentOf(user);
    const report = studentReport(s.id);
    const upcomingActivities = all('activities').map((a) => activityView(a, user)).filter((a) => !a.isPast)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    return res.json({
      data: {
        ...base,
        profile: studentView(s),
        upcomingClasses: upcomingSessions(timetableFor(user), 7, 5),
        recentGrades: recentGrades(s.id, 5),
        generalAverage: report.generalAverage,
        creditsEarned: report.creditsEarned,
        creditsTotal: report.creditsTotal,
        courseCount: report.courses.length,
        upcomingActivities,
      },
    });
  }

  if (user.role === 'PROFESSOR') {
    const p = professorOf(user);
    const courses = coursesFor(user).map(courseView).map((c) => {
      const evals = where('evaluations', (e) => e.courseId === c.id);
      const enrolled = where('enrollments', (e) => e.courseId === c.id).map((e) => e.studentId);
      const missing = evals.reduce((acc, ev) => acc + enrolled.filter((sid) => !find('grades', (g) => g.evaluationId === ev.id && g.studentId === sid)).length, 0);
      const avgs = enrolled.map((sid) => courseAverage(sid, c.id)).filter((x) => x !== null);
      return { ...c, evaluationCount: evals.length, missingGrades: missing, classAverage: avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length * 100) / 100 : null };
    });
    const studentIds = new Set(where('enrollments', (e) => courses.some((c) => c.id === e.courseId)).map((e) => e.studentId));
    return res.json({
      data: {
        ...base,
        profile: professorView(p),
        courses,
        studentCount: studentIds.size,
        upcomingClasses: upcomingSessions(timetableFor(user), 7, 5),
        weeklyHours: timetableFor(user).reduce((acc, t) => {
          const [sh, sm] = t.startTime.split(':').map(Number); const [eh, em] = t.endTime.split(':').map(Number);
          return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }, 0),
      },
    });
  }

  // ADMIN
  const reports = all('students').map((s) => studentReport(s.id).generalAverage).filter((x) => x !== null);
  return res.json({
    data: {
      ...base,
      counts: {
        students: all('students').length,
        professors: all('professors').length,
        courses: all('courses').length,
        classes: all('classes').length,
        activities: all('activities').filter((a) => a.date >= today()).length,
        timetable: all('timetable').length,
      },
      institutionAverage: reports.length ? Math.round(reports.reduce((a, b) => a + b, 0) / reports.length * 100) / 100 : null,
      unassignedCourses: all('courses').filter((c) => !c.professorId).map(courseView),
      upcomingActivities: all('activities').map((a) => activityView(a, user)).filter((a) => !a.isPast)
        .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4),
      recentActivity: where('activityLog', () => true).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
        .map((l) => ({ ...l, actor: publicUser(byId('users', l.actorId))?.fullName || 'Système' })),
    },
  });
});

/* ======================= REPORTS (admin) ======================= */
router.get('/reports', authorize('ADMIN'), (_req, res) => {
  const round = (x) => (x === null ? null : Math.round(x * 100) / 100);
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const reports = all('students').map((s) => ({ s, r: studentReport(s.id) }));

  const byClass = all('classes').map((c) => {
    const rs = reports.filter((x) => x.s.classId === c.id).map((x) => x.r.generalAverage).filter((x) => x !== null);
    return { id: c.id, name: c.name, code: c.code, students: reports.filter((x) => x.s.classId === c.id).length, average: round(mean(rs)), passRate: rs.length ? Math.round(rs.filter((x) => x >= 10).length / rs.length * 100) : null };
  });

  const byCourse = all('courses').map((c) => {
    const ids = where('enrollments', (e) => e.courseId === c.id).map((e) => e.studentId);
    const avgs = ids.map((sid) => courseAverage(sid, c.id)).filter((x) => x !== null);
    const v = courseView(c);
    return { id: c.id, code: c.code, title: c.title, className: v.className, professor: v.professor?.fullName || null, students: ids.length, average: round(mean(avgs)), passRate: avgs.length ? Math.round(avgs.filter((x) => x >= 10).length / avgs.length * 100) : null };
  }).sort((a, b) => a.code.localeCompare(b.code));

  const general = reports.map((x) => x.r.generalAverage).filter((x) => x !== null);
  const buckets = [[0, 8, '< 8'], [8, 10, '8 – 10'], [10, 12, '10 – 12'], [12, 14, '12 – 14'], [14, 16, '14 – 16'], [16, 20.01, '≥ 16']];
  const distribution = buckets.map(([lo, hi, label]) => ({ label, count: general.filter((x) => x >= lo && x < hi).length }));

  const activities = all('activities').map((a) => {
    const n = where('registrations', (r) => r.activityId === a.id).length;
    return { id: a.id, title: a.title, date: a.date, capacity: a.capacity, registered: n, fillRate: Math.round(n / a.capacity * 100) };
  }).sort((a, b) => b.date.localeCompare(a.date));

  const professors = all('professors').map(professorView).map((p) => ({
    id: p.id, fullName: p.fullName, department: p.department, courses: p.courseCount,
    weeklyHours: all('timetable').filter((t) => byId('courses', t.courseId)?.professorId === p.id).reduce((acc, t) => {
      const [sh, sm] = t.startTime.split(':').map(Number); const [eh, em] = t.endTime.split(':').map(Number);
      return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0),
  }));

  res.json({
    data: {
      summary: {
        students: all('students').length,
        professors: all('professors').length,
        courses: all('courses').length,
        institutionAverage: round(mean(general)),
        passRate: general.length ? Math.round(general.filter((x) => x >= 10).length / general.length * 100) : null,
        gradesRecorded: all('grades').length,
        registrations: all('registrations').length,
      },
      byClass, byCourse, distribution, activities, professors,
    },
  });
});

/* ======================= GLOBAL SEARCH ======================= */
router.get('/search', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  if (q.length < 2) return res.json({ data: [] });
  const out = [];
  for (const c of coursesFor(req.user).map(courseView)) {
    if (matches(q, c.code, c.title, c.professor?.fullName)) out.push({ type: 'course', id: c.id, title: `${c.code} — ${c.title}`, subtitle: c.className, link: `/courses/${c.id}` });
  }
  for (const a of all('activities')) {
    if (matches(q, a.title, a.location, a.category)) out.push({ type: 'activity', id: a.id, title: a.title, subtitle: `${a.date} · ${a.location}`, link: `/activities/${a.id}` });
  }
  if (req.user.role === 'ADMIN') {
    for (const s of all('students').map(studentView)) {
      if (matches(q, s.fullName, s.email, s.matricule)) out.push({ type: 'student', id: s.id, title: s.fullName, subtitle: `${s.matricule} · ${s.className || ''}`, link: `/students/${s.id}` });
    }
    for (const p of all('professors').map(professorView)) {
      if (matches(q, p.fullName, p.email, p.department)) out.push({ type: 'professor', id: p.id, title: p.fullName, subtitle: p.department, link: `/professors/${p.id}` });
    }
    for (const c of all('classes').map(classView)) {
      if (matches(q, c.name, c.code)) out.push({ type: 'class', id: c.id, title: c.name, subtitle: `${c.studentCount} étudiants`, link: `/classes/${c.id}` });
    }
  }
  if (req.user.role === 'PROFESSOR') {
    const mine = new Set(coursesFor(req.user).map((c) => c.id));
    const ids = new Set(where('enrollments', (e) => mine.has(e.courseId)).map((e) => e.studentId));
    for (const s of all('students').filter((x) => ids.has(x.id)).map(studentView)) {
      if (matches(q, s.fullName, s.email, s.matricule)) out.push({ type: 'student', id: s.id, title: s.fullName, subtitle: `${s.matricule} · ${s.className || ''}`, link: `/students/${s.id}` });
    }
  }
  res.json({ data: out.slice(0, 20) });
});

/* ======================= SETTINGS ======================= */
router.get('/settings', (_req, res) => res.json({ data: getSettings() }));

router.put('/settings', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, {
    institutionName: { type: 'string', min: 3, max: 120, label: 'Le nom de l’établissement' },
    institutionShortName: { type: 'string', min: 2, max: 40, label: 'Le nom court' },
    academicYear: { type: 'string', min: 4, max: 20, label: 'L’année académique' },
    currentSemester: { type: 'string', min: 3, max: 40, label: 'Le semestre en cours' },
    city: { type: 'string', max: 80, label: 'La ville' },
  }, { partial: true });
  const s = updateSettings(data);
  logActivity(req.user.id, 'Paramètres de l’établissement mis à jour');
  res.json({ data: s });
});

export default router;
