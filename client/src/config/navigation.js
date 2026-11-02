import {
  Home, BookOpen, GraduationCap, CalendarDays, Sparkles, Bell, Settings, Users, UserSquare2,
  Layers, BarChart3, ClipboardList,
} from 'lucide-react';

export const NAV = {
  STUDENT: [
    { to: '/', label: 'Vue d’ensemble', icon: Home, end: true },
    { to: '/courses', label: 'Mes cours', icon: BookOpen },
    { to: '/grades', label: 'Notes', icon: GraduationCap },
    { to: '/timetable', label: 'Emploi du temps', icon: CalendarDays },
    { to: '/activities', label: 'Activités', icon: Sparkles },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  ],
  PROFESSOR: [
    { to: '/', label: 'Vue d’ensemble', icon: Home, end: true },
    { to: '/courses', label: 'Mes cours', icon: BookOpen },
    { to: '/students', label: 'Étudiants', icon: Users },
    { to: '/grades', label: 'Gestion des notes', icon: ClipboardList },
    { to: '/timetable', label: 'Emploi du temps', icon: CalendarDays },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  ],
  ADMIN: [
    { to: '/', label: 'Vue d’ensemble', icon: Home, end: true },
    { to: '/students', label: 'Étudiants', icon: Users },
    { to: '/professors', label: 'Professeurs', icon: UserSquare2 },
    { to: '/courses', label: 'Cours', icon: BookOpen },
    { to: '/classes', label: 'Classes', icon: Layers },
    { to: '/timetable', label: 'Emplois du temps', icon: CalendarDays },
    { to: '/activities', label: 'Activités académiques', icon: Sparkles },
    { to: '/grades', label: 'Notes & dossiers', icon: GraduationCap },
    { to: '/reports', label: 'Rapports', icon: BarChart3 },
  ],
};

export const SETTINGS_ITEM = { to: '/settings', label: 'Paramètres', icon: Settings };

/** Labels used to build breadcrumbs from the URL. */
export const CRUMB_LABELS = {
  courses: 'Cours',
  grades: 'Notes',
  gradebook: 'Carnet de notes',
  timetable: 'Emploi du temps',
  activities: 'Activités',
  notifications: 'Notifications',
  settings: 'Paramètres',
  students: 'Étudiants',
  professors: 'Professeurs',
  classes: 'Classes',
  reports: 'Rapports',
};
