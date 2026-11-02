export const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const DAYS_SHORT = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const parseDate = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d));

export function formatDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  return parseDate(d).toLocaleDateString('fr-FR', opts);
}

export function formatDayLong(d) {
  return formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'à l’instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return formatDate(iso);
}

export function relativeDay(dateStr) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = parseDate(dateStr);
  const n = Math.round((d - t) / 86400000);
  if (n === 0) return 'Aujourd’hui';
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  return formatDate(dateStr, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const formatGrade = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function gradeTone(v) {
  if (v === null || v === undefined) return 'text-ink-muted';
  if (v >= 14) return 'text-success';
  if (v >= 10) return 'text-ink';
  return 'text-danger';
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const initials = (name = '') => name.replace(/^(Dr\.|Pr\.|M\.|Mme)\s+/, '').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

export const ROLE_LABEL = { STUDENT: 'Étudiant', PROFESSOR: 'Professeur', ADMIN: 'Administrateur' };
export const EVAL_TYPES = { DEVOIR: 'Devoir', EXAMEN: 'Examen', TP: 'TP', PROJET: 'Projet', ORAL: 'Oral' };

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
}
