/**
 * Shared academic business logic: presenters, scoping and grade maths.
 * Every route goes through these helpers so rules live in one place.
 */
import { all, byId, find, where } from '../store/index.js';
import { forbidden, notFound } from '../lib/http.js';

/* ---------------- Presenters ---------------- */
export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, tokenVersionAt, ...rest } = u;
  return { ...rest, fullName: `${u.firstName} ${u.lastName}` };
}

export function classView(c) {
  if (!c) return null;
  return {
    ...c,
    studentCount: where('students', (s) => s.classId === c.id).length,
    courseCount: where('courses', (x) => x.classId === c.id).length,
  };
}

export function studentView(s) {
  if (!s) return null;
  const u = byId('users', s.userId);
  const cls = byId('classes', s.classId);
  return {
    ...s,
    user: publicUser(u),
    fullName: u ? `${u.firstName} ${u.lastName}` : '—',
    email: u?.email,
    className: cls?.name || null,
  };
}

export function professorView(p) {
  if (!p) return null;
  const u = byId('users', p.userId);
  return {
    ...p,
    user: publicUser(u),
    fullName: u ? `${p.title ? p.title + ' ' : ''}${u.firstName} ${u.lastName}` : '—',
    email: u?.email,
    courseCount: where('courses', (c) => c.professorId === p.id).length,
  };
}

export function courseView(c) {
  if (!c) return null;
  const prof = byId('professors', c.professorId);
  const cls = byId('classes', c.classId);
  return {
    ...c,
    professor: prof ? { id: prof.id, fullName: professorView(prof).fullName, email: professorView(prof).email, office: prof.office, department: prof.department } : null,
    className: cls?.name || null,
    studentCount: where('enrollments', (e) => e.courseId === c.id).length,
  };
}

export function timetableView(t) {
  const c = byId('courses', t.courseId);
  const cv = c ? courseView(c) : null;
  return {
    ...t,
    course: cv ? { id: cv.id, code: cv.code, title: cv.title } : null,
    professor: cv?.professor ? { id: cv.professor.id, fullName: cv.professor.fullName } : null,
    classId: c?.classId || null,
    className: cv?.className || null,
  };
}

/* ---------------- Identity helpers ---------------- */
export const studentOf = (user) => find('students', (s) => s.userId === user.id);
export const professorOf = (user) => find('professors', (p) => p.userId === user.id);

/** Courses visible to a given user. */
export function coursesFor(user) {
  if (user.role === 'ADMIN') return all('courses');
  if (user.role === 'PROFESSOR') {
    const p = professorOf(user);
    return p ? where('courses', (c) => c.professorId === p.id) : [];
  }
  const s = studentOf(user);
  if (!s) return [];
  const ids = new Set(where('enrollments', (e) => e.studentId === s.id).map((e) => e.courseId));
  return where('courses', (c) => ids.has(c.id));
}

export function assertCourseAccess(user, courseId) {
  const course = byId('courses', courseId);
  if (!course) throw notFound('Cours introuvable.');
  if (!coursesFor(user).some((c) => c.id === courseId)) throw forbidden('Vous n’avez pas accès à ce cours.');
  return course;
}

/** Professors may only edit grades of their own courses; admins can edit any. */
export function assertCanGrade(user, courseId) {
  const course = byId('courses', courseId);
  if (!course) throw notFound('Cours introuvable.');
  if (user.role === 'ADMIN') return course;
  const p = professorOf(user);
  if (user.role !== 'PROFESSOR' || !p || course.professorId !== p.id) {
    throw forbidden('Seul le professeur responsable du cours peut saisir ces notes.');
  }
  return course;
}

export function studentsOfCourse(courseId) {
  const ids = new Set(where('enrollments', (e) => e.courseId === courseId).map((e) => e.studentId));
  return where('students', (s) => ids.has(s.id)).map(studentView)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'));
}

/* ---------------- Grade maths ---------------- */
const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Weighted course average for one student:
 *   Σ(note × poids de l’évaluation) / Σ(poids des évaluations notées)
 * Returns null when the student has no grade yet in this course.
 */
export function courseAverage(studentId, courseId) {
  const evals = where('evaluations', (e) => e.courseId === courseId);
  let sum = 0;
  let weights = 0;
  for (const ev of evals) {
    const g = find('grades', (x) => x.evaluationId === ev.id && x.studentId === studentId);
    if (g && g.value !== null && g.value !== undefined) {
      sum += g.value * ev.weight;
      weights += ev.weight;
    }
  }
  return weights ? round2(sum / weights) : null;
}

/**
 * Full academic report for a student:
 * per-course averages + general average weighted by course coefficients
 *   Σ(moyenne du cours × coefficient) / Σ(coefficients des cours notés)
 */
export function studentReport(studentId) {
  const enrolled = new Set(where('enrollments', (e) => e.studentId === studentId).map((e) => e.courseId));
  const courses = where('courses', (c) => enrolled.has(c.id));
  let sum = 0;
  let coefs = 0;
  let creditsEarned = 0;
  let creditsTotal = 0;
  const passing = 10;
  const rows = courses.map((c) => {
    const evals = where('evaluations', (e) => e.courseId === c.id)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map((ev) => {
        const g = find('grades', (x) => x.evaluationId === ev.id && x.studentId === studentId);
        return { id: ev.id, title: ev.title, type: ev.type, weight: ev.weight, date: ev.date, value: g?.value ?? null, gradedAt: g?.updatedAt || null };
      });
    const average = courseAverage(studentId, c.id);
    creditsTotal += c.credits || 0;
    if (average !== null) {
      sum += average * c.coefficient;
      coefs += c.coefficient;
      if (average >= passing) creditsEarned += c.credits || 0;
    }
    const v = courseView(c);
    return {
      courseId: c.id, code: c.code, title: c.title, coefficient: c.coefficient, credits: c.credits,
      professor: v.professor?.fullName || null, average, evaluations: evals,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));
  return {
    courses: rows,
    generalAverage: coefs ? round2(sum / coefs) : null,
    coefficientsCounted: coefs,
    creditsEarned,
    creditsTotal,
  };
}

/** Latest grades received by a student (for dashboards). */
export function recentGrades(studentId, limit = 5) {
  return where('grades', (g) => g.studentId === studentId && g.value !== null)
    .map((g) => {
      const ev = byId('evaluations', g.evaluationId);
      const c = ev ? byId('courses', ev.courseId) : null;
      return ev && c ? { id: g.id, value: g.value, evaluation: ev.title, type: ev.type, date: ev.date, courseCode: c.code, courseTitle: c.title, updatedAt: g.updatedAt } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

/* ---------------- Timetable ---------------- */
export function timetableFor(user) {
  const courseIds = new Set(coursesFor(user).map((c) => c.id));
  return all('timetable').filter((t) => courseIds.has(t.courseId));
}

const DAY_MS = 86400000;
/** Next occurrences of weekly slots within `days` days, sorted. */
export function upcomingSessions(entries, days = 7, limit = 6) {
  const out = [];
  const start = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (const t of entries) {
      if (t.dayOfWeek !== dow) continue;
      if (t.startDate && dateStr < t.startDate) continue;
      if (t.endDate && dateStr > t.endDate) continue;
      const [h, m] = t.endTime.split(':').map(Number);
      const end = new Date(d); end.setHours(h, m, 0, 0);
      if (end < start) continue; // already finished today
      out.push({ ...timetableView(t), date: dateStr });
    }
  }
  return out.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).slice(0, limit);
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
