import { Link } from 'react-router-dom';
import { CalendarDays, Megaphone, Activity, MapPin, Clock, Trash2 } from 'lucide-react';
import { EmptyState, Button, Badge } from './ui/index.js';
import { relativeDay, relativeTime, formatDate } from '../lib/format.js';

export function UpcomingClasses({ sessions, showClass = false }) {
  if (!sessions?.length) {
    return <EmptyState icon={CalendarDays} title="Aucun cours dans les 7 prochains jours" action={<Link to="/timetable"><Button size="sm">Voir l’emploi du temps</Button></Link>} />;
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {sessions.map((s) => (
        <li key={`${s.id}-${s.date}`}>
          <Link to={`/courses/${s.courseId}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-[#FAFAF9]">
            <div className="w-24 shrink-0">
              <div className="text-xs font-medium text-ink">{relativeDay(s.date)}</div>
              <div className="text-xs text-ink-soft">{s.startTime} – {s.endTime}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{s.course?.title}</div>
              <div className="flex flex-wrap gap-x-3 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1"><MapPin size={12} />{s.room}</span>
                {showClass ? <span>{s.className}</span> : <span>{s.professor?.fullName || 'Professeur à assigner'}</span>}
              </div>
            </div>
            <Badge tone="gray" className="hidden sm:inline-flex">{s.course?.code}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementList({ items, onDelete }) {
  if (!items?.length) return <EmptyState icon={Megaphone} title="Aucune annonce" message="Les annonces de l’établissement apparaîtront ici." />;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="group rounded-lg border border-line p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft whitespace-pre-line">{a.body}</p>
              <p className="mt-1.5 text-xs text-ink-muted">
                {a.author} · {formatDate(a.createdAt)}
                {onDelete && <> · {{ ALL: 'Tous', STUDENT: 'Étudiants', PROFESSOR: 'Professeurs' }[a.audience]}</>}
              </p>
            </div>
            {onDelete && <Button size="icon-sm" variant="danger-ghost" icon={Trash2} onClick={() => onDelete(a)} aria-label={`Supprimer l’annonce ${a.title}`} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ActivityFeed({ items }) {
  if (!items?.length) return <EmptyState icon={Activity} title="Aucune activité récente" />;
  return (
    <ol className="relative ml-1.5 border-l border-line">
      {items.map((l) => (
        <li key={l.id} className="relative pl-4 pb-3 last:pb-0">
          <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-line ring-2 ring-white" aria-hidden="true" />
          <p className="text-sm text-ink">{l.message}</p>
          <p className="text-xs text-ink-muted">{l.actor} · {relativeTime(l.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

export function ActivityMiniList({ items }) {
  if (!items?.length) return <EmptyState icon={CalendarDays} title="Aucune activité à venir" />;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((a) => (
        <li key={a.id}>
          <Link to={`/activities/${a.id}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-[#FAFAF9]">
            <div className="w-12 shrink-0 text-center">
              <div className="text-[11px] uppercase text-danger font-semibold">{formatDate(a.date, { month: 'short' })}</div>
              <div className="text-lg font-semibold leading-none">{formatDate(a.date, { day: 'numeric' })}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{a.title}</div>
              <div className="flex gap-3 text-xs text-ink-soft"><span className="inline-flex items-center gap-1"><Clock size={12} />{a.startTime}</span><span className="truncate">{a.location}</span></div>
            </div>
            {a.isRegistered ? <Badge tone="green">Inscrit</Badge> : <span className="text-xs text-ink-muted whitespace-nowrap">{a.spotsLeft} places</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
