import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  all, byId, find, where, insert, update, remove, removeWhere, getSettings,
} from '../store/index.js';
import { authorize } from '../middleware/auth.js';
import { validate, passwordRule } from '../lib/validate.js';
import { conflict, notFound, forbidden, badRequest } from '../lib/http.js';
import {
  studentView, professorView, courseView, coursesFor, studentReport,
} from '../services/academics.js';
import { notify, logActivity } from '../services/notify.js';

const router = Router();
const DEFAULT_PASSWORDS = { STUDENT: 'Etudiant123!', PROFESSOR: 'Prof123!' };

const matches = (q, ...fields) => !q || fields.some((f) => (f || '').toLowerCase().includes(q));

function assertEmailFree(email, exceptUserId) {
  if (find('users', (u) => u.email === email && u.id !== exceptUserId)) {
    throw conflict('Cette adresse e-mail est déjà utilisée.', { email: 'Adresse déjà utilisée.' });
  }
}

function enrollInClassCourses(studentId, classId) {
  for (const c of where('courses', (x) => x.classId === classId)) {
    if (!find('enrollments', (e) => e.studentId === studentId && e.courseId === c.id)) {
      insert('enrollments', { studentId, courseId: c.id });
    }
  }
}

/* ======================= STUDENTS ======================= */
const studentSchema = {
  firstName: { type: 'string', required: true, min: 2, max: 60, label: 'Le prénom' },
  lastName: { type: 'string', required: true, min: 2, max: 60, label: 'Le nom' },
  email: { type: 'email', required: true, label: 'L’adresse e-mail' },
  phone: { type: 'string', max: 30, label: 'Le téléphone' },
  classId: { type: 'id', required: true, label: 'La classe' },
  matricule: { type: 'string', max: 30, label: 'Le matricule' },
  dateOfBirth: { type: 'date', label: 'La date de naissance' },
  password: passwordRule(),
};

router.get('/students', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const { classId, courseId } = req.query;
  let list = all('students');
  if (req.user.role === 'PROFESSOR') {
    const myCourses = coursesFor(req.user).map((c) => c.id);
    const allowed = new Set(where('enrollments', (e) => myCourses.includes(e.courseId)).map((e) => e.studentId));
    list = list.filter((s) => allowed.has(s.id));
  }
  if (courseId) {
    const ids = new Set(where('enrollments', (e) => e.courseId === courseId).map((e) => e.studentId));
    list = list.filter((s) => ids.has(s.id));
  }
  if (classId) list = list.filter((s) => s.classId === classId);
  const rows = list.map(studentView)
    .filter((s) => matches(q, s.fullName, s.email, s.matricule, s.className))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
  res.json({ data: rows, total: rows.length });
});

router.get('/students/:id', authorize('ADMIN', 'PROFESSOR'), (req, res) => {
  const s = byId('students', req.params.id);
  if (!s) throw notFound('Étudiant introuvable.');
  if (req.user.role === 'PROFESSOR') {
    const mine = coursesFor(req.user).map((c) => c.id);
    if (!where('enrollments', (e) => e.studentId === s.id && mine.includes(e.courseId)).length) throw forbidden();
  }
  const report = studentReport(s.id);
  if (req.user.role === 'PROFESSOR') {
    const mine = new Set(coursesFor(req.user).map((c) => c.id));
    report.courses = report.courses.filter((c) => mine.has(c.courseId));
    report.generalAverage = undefined;
  }
  const registrations = where('registrations', (r) => r.studentId === s.id)
    .map((r) => byId('activities', r.activityId)).filter(Boolean);
  res.json({ data: { ...studentView(s), report, activities: registrations } });
});

router.post('/students', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, studentSchema);
  assertEmailFree(data.email);
  if (!byId('classes', data.classId)) throw badRequest('Classe introuvable.', { classId: 'Classe introuvable.' });
  const year = getSettings().academicYear.slice(0, 4);
  let matricule = data.matricule;
  if (matricule) {
    if (find('students', (s) => s.matricule === matricule)) throw conflict('Ce matricule existe déjà.', { matricule: 'Matricule déjà utilisé.' });
  } else {
    let n = all('students').length + 1;
    do { matricule = `CF-${year}-${String(n++).padStart(4, '0')}`; } while (find('students', (s) => s.matricule === matricule));
  }
  const password = data.password || DEFAULT_PASSWORDS.STUDENT;
  const user = insert('users', {
    email: data.email, passwordHash: bcrypt.hashSync(password, 10), role: 'STUDENT',
    firstName: data.firstName, lastName: data.lastName, phone: data.phone || '', active: true,
  });
  const student = insert('students', { userId: user.id, classId: data.classId, matricule, dateOfBirth: data.dateOfBirth || null });
  enrollInClassCourses(student.id, data.classId);
  notify([user.id], { title: 'Bienvenue sur CampusFlow', message: `Votre compte étudiant a été créé. Classe : ${byId('classes', data.classId).name}.`, type: 'INFO', link: '/' });
  logActivity(req.user.id, `Étudiant créé : ${user.firstName} ${user.lastName}`);
  res.status(201).json({ data: studentView(student), initialPassword: data.password ? undefined : password });
});

router.put('/students/:id', authorize('ADMIN'), (req, res) => {
  const s = byId('students', req.params.id);
  if (!s) throw notFound('Étudiant introuvable.');
  const data = validate(req.body, studentSchema, { partial: true });
  if (data.email) assertEmailFree(data.email, s.userId);
  if (data.classId && !byId('classes', data.classId)) throw badRequest('Classe introuvable.');
  if (data.matricule && find('students', (x) => x.matricule === data.matricule && x.id !== s.id)) {
    throw conflict('Ce matricule existe déjà.', { matricule: 'Matricule déjà utilisé.' });
  }
  const userPatch = {};
  for (const k of ['firstName', 'lastName', 'email', 'phone']) if (k in data) userPatch[k] = data[k];
  if (data.password) userPatch.passwordHash = bcrypt.hashSync(data.password, 10);
  update('users', s.userId, userPatch);
  const studentPatch = {};
  for (const k of ['matricule', 'dateOfBirth', 'classId']) if (k in data) studentPatch[k] = data[k];
  const classChanged = data.classId && data.classId !== s.classId;
  if (classChanged) {
    const oldCourses = new Set(where('courses', (c) => c.classId === s.classId).map((c) => c.id));
    removeWhere('enrollments', (e) => e.studentId === s.id && oldCourses.has(e.courseId));
  }
  update('students', s.id, studentPatch);
  if (classChanged) {
    enrollInClassCourses(s.id, data.classId);
    notify([s.userId], { title: 'Changement de classe', message: `Vous êtes maintenant inscrit(e) en ${byId('classes', data.classId).name}.`, type: 'INFO', link: '/courses' });
  }
  logActivity(req.user.id, `Fiche étudiant modifiée : ${studentView(s).fullName}`);
  res.json({ data: studentView(byId('students', s.id)) });
});

router.delete('/students/:id', authorize('ADMIN'), (req, res) => {
  const s = byId('students', req.params.id);
  if (!s) throw notFound('Étudiant introuvable.');
  const name = studentView(s).fullName;
  removeWhere('enrollments', (e) => e.studentId === s.id);
  removeWhere('grades', (g) => g.studentId === s.id);
  removeWhere('registrations', (r) => r.studentId === s.id);
  removeWhere('notifications', (n) => n.userId === s.userId);
  remove('users', s.userId);
  remove('students', s.id);
  logActivity(req.user.id, `Étudiant supprimé : ${name}`);
  res.json({ ok: true });
});

/* ======================= PROFESSORS ======================= */
const professorSchema = {
  firstName: { type: 'string', required: true, min: 2, max: 60, label: 'Le prénom' },
  lastName: { type: 'string', required: true, min: 2, max: 60, label: 'Le nom' },
  email: { type: 'email', required: true, label: 'L’adresse e-mail' },
  phone: { type: 'string', max: 30, label: 'Le téléphone' },
  title: { type: 'enum', values: ['M.', 'Mme', 'Dr.', 'Pr.'], label: 'Le titre' },
  department: { type: 'string', required: true, max: 80, label: 'Le département' },
  office: { type: 'string', max: 80, label: 'Le bureau' },
  password: passwordRule(),
};

router.get('/professors', authorize('ADMIN'), (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const { department } = req.query;
  const rows = all('professors').map(professorView)
    .filter((p) => !department || p.department === department)
    .filter((p) => matches(q, p.fullName, p.email, p.department))
    .sort((a, b) => a.user.lastName.localeCompare(b.user.lastName, 'fr'));
  res.json({ data: rows, total: rows.length });
});

router.get('/professors/:id', authorize('ADMIN'), (req, res) => {
  const p = byId('professors', req.params.id);
  if (!p) throw notFound('Professeur introuvable.');
  const courses = where('courses', (c) => c.professorId === p.id).map(courseView);
  res.json({ data: { ...professorView(p), courses } });
});

router.post('/professors', authorize('ADMIN'), (req, res) => {
  const data = validate(req.body, professorSchema);
  assertEmailFree(data.email);
  const password = data.password || DEFAULT_PASSWORDS.PROFESSOR;
  const user = insert('users', {
    email: data.email, passwordHash: bcrypt.hashSync(password, 10), role: 'PROFESSOR',
    firstName: data.firstName, lastName: data.lastName, phone: data.phone || '', active: true,
  });
  const prof = insert('professors', { userId: user.id, title: data.title || 'M.', department: data.department, office: data.office || '' });
  notify([user.id], { title: 'Bienvenue sur CampusFlow', message: 'Votre compte professeur a été créé.', type: 'INFO', link: '/' });
  logActivity(req.user.id, `Professeur créé : ${user.firstName} ${user.lastName}`);
  res.status(201).json({ data: professorView(prof), initialPassword: data.password ? undefined : password });
});

router.put('/professors/:id', authorize('ADMIN'), (req, res) => {
  const p = byId('professors', req.params.id);
  if (!p) throw notFound('Professeur introuvable.');
  const data = validate(req.body, professorSchema, { partial: true });
  if (data.email) assertEmailFree(data.email, p.userId);
  const userPatch = {};
  for (const k of ['firstName', 'lastName', 'email', 'phone']) if (k in data) userPatch[k] = data[k];
  if (data.password) userPatch.passwordHash = bcrypt.hashSync(data.password, 10);
  update('users', p.userId, userPatch);
  const profPatch = {};
  for (const k of ['title', 'department', 'office']) if (k in data) profPatch[k] = data[k];
  update('professors', p.id, profPatch);
  logActivity(req.user.id, `Fiche professeur modifiée : ${professorView(p).fullName}`);
  res.json({ data: professorView(byId('professors', p.id)) });
});

router.delete('/professors/:id', authorize('ADMIN'), (req, res) => {
  const p = byId('professors', req.params.id);
  if (!p) throw notFound('Professeur introuvable.');
  const name = professorView(p).fullName;
  const orphaned = where('courses', (c) => c.professorId === p.id);
  for (const c of orphaned) update('courses', c.id, { professorId: null });
  removeWhere('notifications', (n) => n.userId === p.userId);
  remove('users', p.userId);
  remove('professors', p.id);
  logActivity(req.user.id, `Professeur supprimé : ${name}${orphaned.length ? ` (${orphaned.length} cours à réassigner)` : ''}`);
  res.json({ ok: true, unassignedCourses: orphaned.length });
});

export default router;
