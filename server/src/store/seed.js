/**
 * Demo data for CampusFlow (fictional institution, fictional people).
 * Dates are computed relative to "today" so upcoming classes and
 * activities always look current.
 */
import bcrypt from 'bcryptjs';

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@campusflow.bj', password: 'Admin123!' },
  professor: { email: 'prof@campusflow.bj', password: 'Prof123!' },
  student: { email: 'etudiant@campusflow.bj', password: 'Etudiant123!' },
};

// Deterministic pseudo-random generator so the seed is reproducible.
function rng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildSeed() {
  const rand = rng(2026);
  // Deterministic IDs: a regenerated seed (e.g. serverless cold start) keeps the
  // same user IDs, so existing login tokens stay valid.
  const idRand = rng(1337);
  const hex = (n) => Array.from({ length: n }, () => Math.floor(idRand() * 16).toString(16)).join('');
  const id = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
  const ts = new Date().toISOString();
  const stamp = (o) => ({ createdAt: ts, updatedAt: ts, ...o });
  const daysFromNow = (d, h = 9) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    x.setHours(h, 0, 0, 0);
    return x;
  };
  const isoDate = (d) => {
    const x = daysFromNow(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };

  const hashes = {
    admin: bcrypt.hashSync(DEMO_ACCOUNTS.admin.password, 10),
    prof: bcrypt.hashSync(DEMO_ACCOUNTS.professor.password, 10),
    student: bcrypt.hashSync(DEMO_ACCOUNTS.student.password, 10),
  };

  const users = [];
  const students = [];
  const professors = [];

  // ---------- Admin ----------
  const adminUser = stamp({
    id: id(), email: DEMO_ACCOUNTS.admin.email, passwordHash: hashes.admin, role: 'ADMIN',
    firstName: 'Mireille', lastName: 'Agossou', phone: '+229 01 90 00 00 01', active: true,
  });
  users.push(adminUser);

  // ---------- Professors ----------
  const profData = [
    ['prof@campusflow.bj', 'Rodrigue', 'Hounkpatin', 'Informatique', 'Dr.', 'Bâtiment A — Bureau 12'],
    ['s.adjovi@campusflow.bj', 'Sandrine', 'Adjovi', 'Informatique', 'Pr.', 'Bâtiment A — Bureau 08'],
    ['k.dossa@campusflow.bj', 'Koffi', 'Dossa', 'Mathématiques', 'Dr.', 'Bâtiment B — Bureau 03'],
    ['e.sossou@campusflow.bj', 'Edwige', 'Sossou', 'Gestion', 'Dr.', 'Bâtiment C — Bureau 05'],
    ['j.kpade@campusflow.bj', 'Jonas', 'Kpadé', 'Langues', 'M.', 'Bâtiment B — Bureau 10'],
  ];
  for (const [email, firstName, lastName, department, title, office] of profData) {
    const u = stamp({ id: id(), email, passwordHash: hashes.prof, role: 'PROFESSOR', firstName, lastName, phone: '', active: true });
    users.push(u);
    professors.push(stamp({ id: id(), userId: u.id, department, title, office }));
  }
  const [pHounk, pAdjovi, pDossa, pSossou, pKpade] = professors;

  // ---------- Classes ----------
  const year = '2026-2027';
  const classes = [
    stamp({ id: id(), name: 'Licence 2 Informatique', code: 'L2-INFO', level: 'Licence 2', program: 'Informatique', academicYear: year }),
    stamp({ id: id(), name: 'Licence 1 Informatique', code: 'L1-INFO', level: 'Licence 1', program: 'Informatique', academicYear: year }),
    stamp({ id: id(), name: 'Licence 1 Gestion', code: 'L1-GEST', level: 'Licence 1', program: 'Gestion', academicYear: year }),
  ];
  const [cL2, cL1, cG1] = classes;

  // ---------- Students ----------
  const studentData = [
    ['etudiant@campusflow.bj', 'Aïcha', 'Dossou', cL2],
    ['m.ahouansou@campusflow.bj', 'Marius', 'Ahouansou', cL2],
    ['f.zinsou@campusflow.bj', 'Fifamè', 'Zinsou', cL2],
    ['g.tossou@campusflow.bj', 'Gildas', 'Tossou', cL2],
    ['n.akpovi@campusflow.bj', 'Nadège', 'Akpovi', cL2],
    ['y.gbaguidi@campusflow.bj', 'Yannick', 'Gbaguidi', cL2],
    ['r.houessou@campusflow.bj', 'Roseline', 'Houessou', cL2],
    ['c.amoussou@campusflow.bj', 'Cédric', 'Amoussou', cL1],
    ['b.kiki@campusflow.bj', 'Bénédicte', 'Kiki', cL1],
    ['t.sagbo@campusflow.bj', 'Thierry', 'Sagbo', cL1],
    ['l.vodounon@campusflow.bj', 'Laure', 'Vodounon', cL1],
    ['p.dah@campusflow.bj', 'Prince', 'Dah', cG1],
    ['s.quenum@campusflow.bj', 'Sènan', 'Quenum', cG1],
    ['h.boko@campusflow.bj', 'Hermine', 'Boko', cG1],
  ];
  let n = 1;
  for (const [email, firstName, lastName, cls] of studentData) {
    const u = stamp({ id: id(), email, passwordHash: hashes.student, role: 'STUDENT', firstName, lastName, phone: '', active: true });
    users.push(u);
    students.push(stamp({
      id: id(), userId: u.id, classId: cls.id,
      matricule: `CF-${year.slice(0, 4)}-${String(n++).padStart(4, '0')}`,
      dateOfBirth: `200${4 + Math.floor(rand() * 3)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
    }));
  }

  // ---------- Courses ----------
  const courseData = [
    [cL2, pHounk, 'INF201', 'Algorithmique avancée', 4, 6, 'Structures de données, complexité, graphes et programmation dynamique.'],
    [cL2, pAdjovi, 'INF202', 'Bases de données', 3, 5, 'Modélisation relationnelle, SQL, normalisation et transactions.'],
    [cL2, pHounk, 'INF203', 'Développement web', 3, 5, 'HTML, CSS, JavaScript, API REST et frameworks front-end.'],
    [cL2, pAdjovi, 'INF204', 'Réseaux informatiques', 2, 4, 'Modèle OSI, TCP/IP, adressage et services réseau.'],
    [cL2, pDossa, 'MAT201', 'Mathématiques discrètes', 3, 4, 'Logique, ensembles, combinatoire et théorie des graphes.'],
    [cL2, pKpade, 'ANG201', 'Anglais technique', 1, 2, 'Lecture et rédaction de documentation technique en anglais.'],
    [cL1, pHounk, 'INF101', 'Introduction à la programmation', 4, 6, 'Bases de la programmation avec Python.'],
    [cL1, pDossa, 'MAT101', 'Algèbre linéaire', 3, 5, 'Vecteurs, matrices, systèmes linéaires.'],
    [cL1, pAdjovi, 'INF102', 'Architecture des ordinateurs', 2, 4, 'Logique binaire, processeur, mémoire.'],
    [cG1, pSossou, 'GES101', 'Comptabilité générale', 4, 6, 'Principes comptables, journal, grand livre, bilan.'],
    [cG1, pSossou, 'GES102', 'Microéconomie', 3, 5, 'Offre, demande, comportement du consommateur.'],
    [cG1, pKpade, 'ANG101', 'Anglais des affaires', 1, 2, 'Communication professionnelle en anglais.'],
  ];
  const courses = courseData.map(([cls, prof, code, title, coefficient, credits, description]) => stamp({
    id: id(), code, title, description, coefficient, credits, semester: 'Semestre 1',
    classId: cls.id, professorId: prof.id,
  }));

  // ---------- Enrollments (every student of a class follows its courses) ----------
  const enrollments = [];
  for (const c of courses) {
    for (const s of students.filter((x) => x.classId === c.classId)) {
      enrollments.push(stamp({ id: id(), studentId: s.id, courseId: c.id }));
    }
  }

  // ---------- Evaluations & grades ----------
  const evaluations = [];
  const grades = [];
  const evalPlan = [
    ['Devoir 1', 'DEVOIR', 1, -35],
    ['Partiel', 'EXAMEN', 2, -14],
  ];
  // Each student gets a stable "level" so results look realistic (some fail).
  const level = Object.fromEntries(students.map((s) => [s.id, 7 + rand() * 9]));
  level[students[0].id] = 13.5; // demo student account
  for (const c of courses) {
    const plan = c.code === 'ANG201' || c.code === 'ANG101' ? evalPlan.slice(0, 1) : evalPlan;
    for (const [title, type, weight, day] of plan) {
      const ev = stamp({ id: id(), courseId: c.id, title, type, weight, date: isoDate(day) });
      evaluations.push(ev);
      for (const e of enrollments.filter((x) => x.courseId === c.id)) {
        const raw = level[e.studentId] + (rand() - 0.5) * 7;
        const value = Math.max(2, Math.min(19.5, raw));
        grades.push(stamp({ id: id(), evaluationId: ev.id, studentId: e.studentId, value: Math.round(value * 4) / 4 }));
      }
    }
  }

  // ---------- Timetable (weekly recurring) ----------
  const room = { L2: ['Amphi B', 'Salle 204', 'Labo Info 1'], L1: ['Amphi A', 'Salle 102', 'Labo Info 2'], G1: ['Salle 301', 'Salle 302'] };
  const slots = [
    // [courseCode, day(1=lundi), start, end, room]
    ['INF201', 1, '08:00', '10:00', room.L2[0]],
    ['INF202', 1, '10:30', '12:30', room.L2[2]],
    ['MAT201', 2, '08:00', '10:00', room.L2[1]],
    ['INF203', 2, '14:00', '17:00', room.L2[2]],
    ['INF204', 3, '08:00', '10:00', room.L2[1]],
    ['INF201', 3, '10:30', '12:30', room.L2[2]],
    ['ANG201', 4, '08:00', '10:00', room.L2[1]],
    ['INF202', 4, '10:30', '12:30', room.L2[2]],
    ['INF203', 5, '08:00', '11:00', room.L2[2]],
    ['MAT201', 5, '14:00', '16:00', room.L2[0]],
    ['INF101', 1, '08:00', '11:00', room.L1[2]],
    ['MAT101', 2, '08:00', '10:00', room.L1[0]],
    ['INF102', 3, '14:00', '16:00', room.L1[1]],
    ['INF101', 4, '14:00', '17:00', room.L1[2]],
    ['MAT101', 5, '10:30', '12:30', room.L1[0]],
    ['GES101', 1, '08:00', '11:00', room.G1[0]],
    ['GES102', 2, '10:30', '12:30', room.G1[1]],
    ['ANG101', 3, '08:00', '10:00', room.G1[0]],
    ['GES101', 4, '08:00', '10:00', room.G1[0]],
    ['GES102', 5, '14:00', '16:00', room.G1[1]],
  ];
  const timetable = slots.map(([code, dayOfWeek, startTime, endTime, rm]) => {
    const c = courses.find((x) => x.code === code);
    return stamp({
      id: id(), courseId: c.id, dayOfWeek, startTime, endTime, room: rm,
      startDate: isoDate(-60), endDate: isoDate(120),
    });
  });

  // ---------- Activities ----------
  const activities = [
    ['Hackathon CampusFlow 2026', 'Compétition de 48 h : concevez une solution numérique pour un problème local en équipe de 4.', 12, '09:00', '18:00', 'Labo Info 1', 40, 'Compétition'],
    ['Conférence : l’IA en Afrique de l’Ouest', 'Panel de chercheurs et d’entrepreneurs sur les usages de l’intelligence artificielle dans la région.', 5, '15:00', '17:30', 'Amphi A', 150, 'Conférence'],
    ['Atelier CV et entretien', 'Atelier pratique avec des recruteurs : rédiger un CV clair et préparer ses entretiens.', 9, '10:00', '12:00', 'Salle 301', 25, 'Atelier'],
    ['Tournoi inter-filières de football', 'Tournoi amical entre filières. Inscription individuelle, équipes formées sur place.', 19, '16:00', '19:00', 'Terrain de sport', 60, 'Sport'],
    ['Journée portes ouvertes', 'Accueil des futurs étudiants et de leurs familles. Bénévoles recherchés.', -10, '08:00', '16:00', 'Hall principal', 30, 'Vie de campus'],
  ];
  const activityRows = activities.map(([title, description, d, startTime, endTime, location, capacity, category]) => stamp({
    id: id(), title, description, date: isoDate(d), startTime, endTime, location, capacity, category, registrationOpen: d > 0,
  }));

  const aicha = students[0];
  const registrations = [
    stamp({ id: id(), activityId: activityRows[1].id, studentId: aicha.id }),
    stamp({ id: id(), activityId: activityRows[0].id, studentId: students[1].id }),
    stamp({ id: id(), activityId: activityRows[0].id, studentId: students[2].id }),
    stamp({ id: id(), activityId: activityRows[2].id, studentId: students[7].id }),
    stamp({ id: id(), activityId: activityRows[4].id, studentId: aicha.id }),
  ];

  // ---------- Announcements ----------
  const announcements = [
    stamp({ id: id(), title: 'Calendrier des partiels publié', body: 'Les partiels du semestre 1 se dérouleront du 14 au 19 décembre. Consultez votre emploi du temps pour les salles.', audience: 'ALL', authorId: adminUser.id, createdAt: daysFromNow(-2).toISOString() }),
    stamp({ id: id(), title: 'Fermeture de la bibliothèque', body: 'La bibliothèque sera fermée samedi pour inventaire.', audience: 'STUDENT', authorId: adminUser.id, createdAt: daysFromNow(-6).toISOString() }),
    stamp({ id: id(), title: 'Saisie des notes de partiel', body: 'Merci de saisir les notes de partiel avant la fin du mois.', audience: 'PROFESSOR', authorId: adminUser.id, createdAt: daysFromNow(-3).toISOString() }),
  ];

  // ---------- Notifications ----------
  const profUser = users.find((u) => u.email === DEMO_ACCOUNTS.professor.email);
  const aichaUser = users.find((u) => u.id === aicha.userId);
  const notif = (userId, title, message, type, link, read, d) => stamp({ id: id(), userId, title, message, type, link, read, createdAt: daysFromNow(d, 10).toISOString() });
  const notifications = [
    notif(aichaUser.id, 'Nouvelle note publiée', 'Votre note de « Partiel » en Algorithmique avancée est disponible.', 'GRADE', '/grades', false, -1),
    notif(aichaUser.id, 'Inscription confirmée', 'Vous êtes inscrite à « Conférence : l’IA en Afrique de l’Ouest ».', 'ACTIVITY', '/activities', false, -2),
    notif(aichaUser.id, 'Calendrier des partiels publié', 'Les partiels du semestre 1 se dérouleront du 14 au 19 décembre.', 'ANNOUNCEMENT', '/', true, -2),
    notif(profUser.id, 'Saisie des notes de partiel', 'Merci de saisir les notes de partiel avant la fin du mois.', 'ANNOUNCEMENT', '/', false, -3),
    notif(profUser.id, 'Cours assigné', 'Le cours « Développement web » (INF203) vous a été assigné.', 'COURSE', '/courses', true, -20),
    notif(adminUser.id, 'Nouvelle inscription', 'Marius Ahouansou s’est inscrit à « Hackathon CampusFlow 2026 ».', 'ACTIVITY', '/activities', false, -1),
  ];

  // ---------- Activity log ----------
  const log = (actorId, message, audience, d) => stamp({ id: id(), actorId, message, audience, createdAt: daysFromNow(d, 11).toISOString() });
  const activityLog = [
    log(profUser.id, 'Rodrigue Hounkpatin a publié les notes « Partiel » — Algorithmique avancée', [aichaUser.id], -1),
    log(aichaUser.id, 'Inscription à « Conférence : l’IA en Afrique de l’Ouest »', [aichaUser.id, adminUser.id], -2),
    log(adminUser.id, 'Annonce publiée : Calendrier des partiels publié', [aichaUser.id, profUser.id], -2),
    log(adminUser.id, 'Emploi du temps de Licence 2 Informatique mis à jour', [aichaUser.id, profUser.id], -5),
  ];

  return {
    settings: {
      institutionName: 'Institut Supérieur du Numérique de Cotonou',
      institutionShortName: 'ISN Cotonou',
      academicYear: year,
      currentSemester: 'Semestre 1',
      city: 'Cotonou, Bénin',
      passingGrade: 10,
    },
    users, students, professors, classes, courses, enrollments,
    evaluations, grades, timetable, activities: activityRows, registrations,
    notifications, announcements, activityLog,
  };
}
