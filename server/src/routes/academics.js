import { Router } from 'express';
import {
  all, byId, find, where, insert, update, remove, removeWhere,
} from '../store/index.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/http.js';
import {
  classView, courseView, studentView, timetableView, coursesFor, assertCourseAccess, assertCanGrade,
  studentsOfCourse, courseAverage, studentReport, studentOf, timetableFor, toMinutes,
} from '../services/academics.js';
import { notify, logActivity } from '../services/notify.js';

const router = Router();
const matches = (q, ...fields) => !q || fields.some((f) => (f || '').toLowerCase().includes(q));
const DAYS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const userIdsOfClass = (classId) => where('students', (s) => s.classId === classId).map((s) => s.userId);
const userIdsOfCourse = (courseId) => {
  const ids = new Set(where('enrollments', (e) => e.courseId === courseId).map((e) => e.studentId));
  return where('students', (s) => ids.has(s.id)).map((s) => s.userId);
};
const profUserId = (professorId) => byId('professors', professorId)?.userId;

/* ======================= CLASSES ======================= */
const classSchema = {
  name: { type: 'string', required: true, min: 3, max: 80, label: 'Le nom' },
  code: { type: 'string', required: true, min: 2, max: 20, label: 'Le code' },
  level: { type: 'string', required: true, max: 40, label: 'Le niveau' },
  program: { type: 'string', required: true, max: 60, label: 'La filière' },
  academicYear: { type: 'string', required: true, max: 20, label: 'L’année académique' },
};

router.get('/classes', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  let list = all('classes');
  if (req.user.role === 'PROFESSOR') {
    const ids = new Set(coursesFor(req.user).map((c) => c.classId));
    list = list.filter((c) => ids.has(c.id));
  }
  const rows = list.map(classView).filter((c) => matches(q, c.name, c.code, c.program))
    .sort((a, b) => a.code.localeCompare(b.code));
  res.json({ data: rows, total: rows.length });
});

router.get('/classes/:id', authorize('ADMIN'), (req, res) => {
  const c = byId('classes', req.params.id);
  if (!c) throw notFound('Classe introuvable.');
  res.json({
    data: {
      ...classView(c),
      students: where('students', (s) => s.classId === c.id).map(studentView).sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr')),
      courses: where('courses', (x) => x.classId === c.id).map(courseView),
    },
  });
});

router.post('/classes', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, classSchema);
  if (find('classes', (c) => c.code.toLowerCase() === data.code.toLowerCase())) throw conflict('Ce code de classe existe déjà.', { code: 'Code déjà utilisé.' });
  const c = insert('classes', data);
  logActivity(req.user.id, `Classe créée : ${c.name}`);
  res.status(201).json({ data: classView(c) });
});

router.put('/classes/:id', authorize('ADMIN'), (req, res) => {
  const c = byId('classes', req.params.id);
  if (!c) throw notFound('Classe introuvable.');
  const data = validate(req.body, classSchema, { partial: true });
  if (data.code && find('classes', (x) => x.code.toLowerCase() === data.code.toLowerCase() && x.id !== c.id)) throw conflict('Ce code de classe existe déjà.', { code: 'Code déjà utilisé.' });
  update('classes', c.id, data);
  logActivity(req.user.id, `Classe modifiée : ${c.name}`);
  res.json({ data: classView(c) });
});

router.delete('/classes/:id', authorize('ADMIN'), (req, res) => {
  const c = byId('classes', req.params.id);
  if (!c) throw notFound('Classe introuvable.');
  const nStudents = where('students', (s) => s.classId === c.id).length;
  const nCourses = where('courses', (x) => x.classId === c.id).length;
  if (nStudents || nCourses) {
    throw conflict(`Impossible de supprimer cette classe : elle contient ${nStudents} étudiant(s) et ${nCourses} cours. Déplacez-les ou supprimez-les d’abord.`);
  }
  remove('classes', c.id);
  logActivity(req.user.id, `Classe supprimée : ${c.name}`);
  res.json({ ok: true });
});

/* ======================= COURSES ======================= */
const courseSchema = {
  code: { type: 'string', required: true, min: 2, max: 20, label: 'Le code' },
  title: { type: 'string', required: true, min: 3, max: 120, label: 'L’intitulé' },
  description: { type: 'string', max: 1000, label: 'La description' },
  coefficient: { type: 'number', required: true, min: 0.5, max: 20, label: 'Le coefficient' },
  credits: { type: 'number', required: true, min: 0, max: 30, integer: true, label: 'Les crédits' },
  semester: { type: 'string', required: true, max: 40, label: 'Le semestre' },
  classId: { type: 'id', required: true, label: 'La classe' },
  professorId: { type: 'id', label: 'Le professeur' },
};

function enrollClass(courseId, classId) {
  for (const s of where('students', (x) => x.classId === classId)) {
    if (!find('enrollments', (e) => e.courseId === courseId && e.studentId === s.id)) insert('enrollments', { courseId, studentId: s.id });
  }
}

router.get('/courses', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const { classId, professorId, semester } = req.query;
  const rows = coursesFor(req.user).map(courseView)
    .filter((c) => !classId || c.classId === classId)
    .filter((c) => !professorId || c.professorId === professorId)
    .filter((c) => !semester || c.semester === semester)
    .filter((c) => matches(q, c.code, c.title, c.professor?.fullName, c.className))
    .sort((a, b) => a.code.localeCompare(b.code));
  if (req.user.role === 'STUDENT') {
    const s = studentOf(req.user);
    for (const r of rows) r.myAverage = s ? courseAverage(s.id, r.id) : null;
  }
  res.json({ data: rows, total: rows.length });
});

router.get('/courses/:id', (req, res) => {
  const course = assertCourseAccess(req.user, req.params.id);
  const view = courseView(course);
  const schedule = where('timetable', (t) => t.courseId === course.id).map(timetableView)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  const evaluations = where('evaluations', (e) => e.courseId === course.id).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const payload = { ...view, schedule, evaluations };
  if (req.user.role === 'STUDENT') {
    const s = studentOf(req.user);
    payload.myReport = studentReport(s.id).courses.find((c) => c.courseId === course.id) || null;
  } else {
    payload.students = studentsOfCourse(course.id).map((s) => ({ ...s, average: courseAverage(s.id, course.id) }));
  }
  res.json({ data: payload });
});

router.post('/courses', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, courseSchema);
  if (!byId('classes', data.classId)) throw badRequest('Classe introuvable.', { classId: 'Classe introuvable.' });
  if (data.professorId && !byId('professors', data.professorId)) throw badRequest('Professeur introuvable.', { professorId: 'Professeur introuvable.' });
  if (find('courses', (c) => c.code.toLowerCase() === data.code.toLowerCase())) throw conflict('Ce code de cours existe déjà.', { code: 'Code déjà utilisé.' });
  const c = insert('courses', { description: '', professorId: null, ...data });
  enrollClass(c.id, c.classId);
  if (c.professorId) notify([profUserId(c.professorId)], { title: 'Nouveau cours assigné', message: `Le cours « ${c.title} » (${c.code}) vous a été assigné.`, type: 'COURSE', link: `/courses/${c.id}` });
  notify(userIdsOfClass(c.classId), { title: 'Nouveau cours', message: `Vous êtes inscrit(e) au cours « ${c.title} » (${c.code}).`, type: 'COURSE', link: `/courses/${c.id}` });
  logActivity(req.user.id, `Cours créé : ${c.code} — ${c.title}`, userIdsOfClass(c.classId));
  res.status(201).json({ data: courseView(c) });
});

router.put('/courses/:id', authorize('ADMIN'), (req, res) => {
  const c = byId('courses', req.params.id);
  if (!c) throw notFound('Cours introuvable.');
  const data = validate(req.body, courseSchema, { partial: true });
  if (data.classId && !byId('classes', data.classId)) throw badRequest('Classe introuvable.');
  if (data.professorId && !byId('professors', data.professorId)) throw badRequest('Professeur introuvable.');
  if (data.code && find('courses', (x) => x.code.toLowerCase() === data.code.toLowerCase() && x.id !== c.id)) throw conflict('Ce code de cours existe déjà.', { code: 'Code déjà utilisé.' });
  const profChanged = 'professorId' in data && data.professorId !== c.professorId;
  const classChanged = data.classId && data.classId !== c.classId;
  update('courses', c.id, data);
  if (classChanged) {
    removeWhere('enrollments', (e) => e.courseId === c.id);
    enrollClass(c.id, c.classId);
  }
  if (profChanged && c.professorId) {
    notify([profUserId(c.professorId)], { title: 'Nouveau cours assigné', message: `Le cours « ${c.title} » (${c.code}) vous a été assigné.`, type: 'COURSE', link: `/courses/${c.id}` });
  }
  if (profChanged || classChanged) {
    notify(userIdsOfCourse(c.id), { title: 'Cours mis à jour', message: `Les informations du cours « ${c.title} » ont changé.`, type: 'COURSE', link: `/courses/${c.id}` });
  }
  logActivity(req.user.id, `Cours modifié : ${c.code} — ${c.title}`);
  res.json({ data: courseView(c) });
});

router.delete('/courses/:id', authorize('ADMIN'), (req, res) => {
  const c = byId('courses', req.params.id);
  if (!c) throw notFound('Cours introuvable.');
  const recipients = [...userIdsOfCourse(c.id), profUserId(c.professorId)];
  const evalIds = new Set(where('evaluations', (e) => e.courseId === c.id).map((e) => e.id));
  removeWhere('grades', (g) => evalIds.has(g.evaluationId));
  removeWhere('evaluations', (e) => e.courseId === c.id);
  removeWhere('timetable', (t) => t.courseId === c.id);
  removeWhere('enrollments', (e) => e.courseId === c.id);
  remove('courses', c.id);
  notify(recipients, { title: 'Cours supprimé', message: `Le cours « ${c.title} » (${c.code}) a été retiré.`, type: 'COURSE', link: '/courses' });
  logActivity(req.user.id, `Cours supprimé : ${c.code} — ${c.title}`);
  res.json({ ok: true });
});

/* ======================= GRADES ======================= */
const evaluationSchema = {
  title: { type: 'string', required: true, min: 2, max: 80, label: 'L’intitulé' },
  type: { type: 'enum', required: true, values: ['DEVOIR', 'EXAMEN', 'TP', 'PROJET', 'ORAL'], label: 'Le type' },
  weight: { type: 'number', required: true, min: 0.5, max: 10, label: 'Le poids' },
  date: { type: 'date', required: true, label: 'La date' },
};

function gradebook(courseId) {
  const course = byId('courses', courseId);
  const evaluations = where('evaluations', (e) => e.courseId === courseId).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const evalIds = new Set(evaluations.map((e) => e.id));
  const students = studentsOfCourse(courseId).map((s) => ({
    id: s.id, fullName: s.fullName, matricule: s.matricule, email: s.email, average: courseAverage(s.id, courseId),
  }));
  const grades = where('grades', (g) => evalIds.has(g.evaluationId)).map((g) => ({ id: g.id, evaluationId: g.evaluationId, studentId: g.studentId, value: g.value }));
  const avgs = students.map((s) => s.average).filter((x) => x !== null);
  return {
    course: courseView(course),
    evaluations,
    students,
    grades,
    stats: {
      classAverage: avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100 : null,
      passing: avgs.filter((x) => x >= 10).length,
      graded: avgs.length,
      total: students.length,
    },
  };
}

router.get('/grades/me', authorize('STUDENT'), (req, res) => {
  const s = studentOf(req.user);
  if (!s) throw notFound('Profil étudiant introuvable.');
  res.json({ data: studentReport(s.id) });
});

router.get('/grades/records', authorize('ADMIN'), (req, res) => {
  const { classId } = req.query;
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const students = all('students').filter((s) => !classId || s.classId === classId);
  const rows = students.map((s) => {
    const v = studentView(s);
    const r = studentReport(s.id);
    return {
      studentId: s.id, fullName: v.fullName, matricule: s.matricule, className: v.className, classId: s.classId,
      generalAverage: r.generalAverage, creditsEarned: r.creditsEarned, creditsTotal: r.creditsTotal,
      courses: r.courses.map((c) => ({ courseId: c.courseId, code: c.code, average: c.average })),
    };
  }).filter((r) => matches(q, r.fullName, r.matricule, r.className))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
  res.json({ data: rows, total: rows.length });
});

router.get('/courses/:id/gradebook', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  assertCanGrade(req.user, req.params.id);
  res.json({ data: gradebook(req.params.id) });
});

router.post('/courses/:id/evaluations', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const course = assertCanGrade(req.user, req.params.id);
  const data = validate(req.body, evaluationSchema);
  const ev = insert('evaluations', { ...data, courseId: course.id });
  logActivity(req.user.id, `Évaluation créée : ${ev.title} — ${course.title}`);
  res.status(201).json({ data: ev });
});

router.put('/evaluations/:id', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const ev = byId('evaluations', req.params.id);
  if (!ev) throw notFound('Évaluation introuvable.');
  assertCanGrade(req.user, ev.courseId);
  const data = validate(req.body, evaluationSchema, { partial: true });
  update('evaluations', ev.id, data);
  res.json({ data: ev });
});

router.delete('/evaluations/:id', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const ev = byId('evaluations', req.params.id);
  if (!ev) throw notFound('Évaluation introuvable.');
  const course = assertCanGrade(req.user, ev.courseId);
  removeWhere('grades', (g) => g.evaluationId === ev.id);
  remove('evaluations', ev.id);
  logActivity(req.user.id, `Évaluation supprimée : ${ev.title} — ${course.title}`);
  res.json({ ok: true });
});

/** Bulk upsert of the grades of one evaluation. value=null clears the grade. */
router.put('/evaluations/:id/grades', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const ev = byId('evaluations', req.params.id);
  if (!ev) throw notFound('Évaluation introuvable.');
  const course = assertCanGrade(req.user, ev.courseId);
  const entries = req.body?.grades;
  if (!Array.isArray(entries)) throw badRequest('Le champ « grades » doit être une liste.');
  const enrolled = new Set(where('enrollments', (e) => e.courseId === course.id).map((e) => e.studentId));
  const errors = {};
  const clean = entries.map((g, i) => {
    if (!g || typeof g.studentId !== 'string' || !enrolled.has(g.studentId)) { errors[i] = 'Étudiant non inscrit à ce cours.'; return null; }
    if (g.value === null || g.value === '' || g.value === undefined) return { studentId: g.studentId, value: null };
    const v = Number(String(g.value).replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 20) { errors[g.studentId] = 'La note doit être comprise entre 0 et 20.'; return null; }
    return { studentId: g.studentId, value: Math.round(v * 100) / 100 };
  });
  if (Object.keys(errors).length) throw badRequest('Certaines notes sont invalides (0 à 20).', errors);

  const changedUsers = [];
  let changed = 0;
  for (const g of clean) {
    const existing = find('grades', (x) => x.evaluationId === ev.id && x.studentId === g.studentId);
    if (g.value === null) {
      if (existing) { remove('grades', existing.id); changed++; }
      continue;
    }
    if (existing) {
      if (existing.value !== g.value) { update('grades', existing.id, { value: g.value }); changed++; changedUsers.push(g.studentId); }
    } else {
      insert('grades', { evaluationId: ev.id, studentId: g.studentId, value: g.value });
      changed++; changedUsers.push(g.studentId);
    }
  }
  const userIds = changedUsers.map((sid) => byId('students', sid)?.userId);
  if (userIds.length) {
    notify(userIds, { title: 'Nouvelle note publiée', message: `Votre note de « ${ev.title} » en ${course.title} est disponible.`, type: 'GRADE', link: '/grades' });
    logActivity(req.user.id, `Notes publiées : ${ev.title} — ${course.title}`, userIds);
  }
  res.json({ data: gradebook(course.id), changed });
});

/* ======================= TIMETABLE ======================= */
const slotSchema = {
  courseId: { type: 'id', required: true, label: 'Le cours' },
  dayOfWeek: { type: 'number', required: true, min: 1, max: 6, integer: true, label: 'Le jour' },
  startTime: { type: 'time', required: true, label: 'L’heure de début' },
  endTime: { type: 'time', required: true, label: 'L’heure de fin' },
  room: { type: 'string', required: true, min: 1, max: 60, label: 'La salle' },
  startDate: { type: 'date', required: true, label: 'La date de début' },
  endDate: { type: 'date', required: true, label: 'La date de fin' },
};

function checkSlot(slot, exceptId) {
  if (toMinutes(slot.endTime) <= toMinutes(slot.startTime)) throw badRequest('L’heure de fin doit être après l’heure de début.', { endTime: 'Doit être après le début.' });
  if (slot.endDate < slot.startDate) throw badRequest('La date de fin doit être après la date de début.', { endDate: 'Doit être après la date de début.' });
  const course = byId('courses', slot.courseId);
  if (!course) throw badRequest('Cours introuvable.', { courseId: 'Cours introuvable.' });
  const s = toMinutes(slot.startTime);
  const e = toMinutes(slot.endTime);
  for (const t of all('timetable')) {
    if (t.id === exceptId || t.dayOfWeek !== slot.dayOfWeek) continue;
    if (t.endDate < slot.startDate || t.startDate > slot.endDate) continue;
    if (!(s < toMinutes(t.endTime) && toMinutes(t.startTime) < e)) continue;
    const other = byId('courses', t.courseId);
    const label = `${other?.code || ''} (${DAYS[t.dayOfWeek]} ${t.startTime}–${t.endTime})`;
    if (t.room.toLowerCase() === slot.room.toLowerCase()) throw conflict(`Conflit : la salle ${t.room} est déjà occupée par ${label}.`);
    if (other && course.professorId && other.professorId === course.professorId) throw conflict(`Conflit : le professeur a déjà cours — ${label}.`);
    if (other && other.classId === course.classId) throw conflict(`Conflit : la classe a déjà cours — ${label}.`);
  }
  return course;
}

router.get('/timetable', (req, res) => {
  const { classId, professorId, courseId } = req.query;
  const rows = timetableFor(req.user).map(timetableView)
    .filter((t) => !classId || t.classId === classId)
    .filter((t) => !professorId || t.professor?.id === professorId)
    .filter((t) => !courseId || t.courseId === courseId)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  res.json({ data: rows, total: rows.length });
});

function notifySlot(course, title, message) {
  notify([...userIdsOfCourse(course.id), profUserId(course.professorId)], { title, message, type: 'TIMETABLE', link: '/timetable' });
}

router.post('/timetable', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, slotSchema);
  const course = checkSlot(data);
  const t = insert('timetable', data);
  notifySlot(course, 'Emploi du temps mis à jour', `Nouveau créneau : ${course.title}, ${DAYS[t.dayOfWeek]} ${t.startTime}–${t.endTime}, ${t.room}.`);
  logActivity(req.user.id, `Créneau ajouté : ${course.code} ${DAYS[t.dayOfWeek]} ${t.startTime}`, userIdsOfCourse(course.id));
  res.status(201).json({ data: timetableView(t) });
});

router.put('/timetable/:id', authorize('ADMIN'), (req, res) => {
  const t = byId('timetable', req.params.id);
  if (!t) throw notFound('Créneau introuvable.');
  const data = validate(req.body, slotSchema, { partial: true });
  const merged = { ...t, ...data };
  const course = checkSlot(merged, t.id);
  update('timetable', t.id, data);
  notifySlot(course, 'Créneau modifié', `${course.title} : ${DAYS[t.dayOfWeek]} ${t.startTime}–${t.endTime}, ${t.room}.`);
  logActivity(req.user.id, `Créneau modifié : ${course.code} ${DAYS[t.dayOfWeek]} ${t.startTime}`, userIdsOfCourse(course.id));
  res.json({ data: timetableView(t) });
});

router.delete('/timetable/:id', authorize('ADMIN'), (req, res) => {
  const t = byId('timetable', req.params.id);
  if (!t) throw notFound('Créneau introuvable.');
  const course = byId('courses', t.courseId);
  remove('timetable', t.id);
  if (course) notifySlot(course, 'Créneau supprimé', `${course.title} du ${DAYS[t.dayOfWeek]} ${t.startTime}–${t.endTime} est supprimé.`);
  logActivity(req.user.id, `Créneau supprimé : ${course?.code || ''} ${DAYS[t.dayOfWeek]} ${t.startTime}`);
  res.json({ ok: true });
});

export default router;
