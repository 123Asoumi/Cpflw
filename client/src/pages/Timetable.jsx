import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Plus, MapPin, Pencil, Trash2, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../lib/useApi.js';
import { useForm } from '../lib/useForm.js';
import { useClassOptions, useCourseOptions, useProfessorOptions } from '../lib/useOptions.js';
import { api, errorMessage } from '../lib/api.js';
import { DAYS, DAYS_SHORT, formatDate, todayISO } from '../lib/format.js';
import {
  PageHeader, Toolbar, Select, Button, Modal, Input, ConfirmDialog, SkeletonRows, ErrorState, EmptyState, Tabs, DataTable, Badge,
} from '../components/ui/index.js';

const START_H = 7;
const END_H = 19;
const HOUR_PX = 52;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const PALETTE = ['#E3ECFF:#2449D8', '#E3F3EC:#16845B', '#FBF0E1:#A2600E', '#F3E8FD:#7A3EB8', '#FBE9E9:#B53A3A', '#E8EEF3:#3A5A73', '#FFF6D6:#8A6A00'];
const colorFor = (code = '') => PALETTE[[...code].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length].split(':');

function addMonths(iso, n) {
  const d = new Date(`${iso}T00:00:00`); d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SlotForm({ open, onClose, slot, onSaved, onDelete }) {
  const courses = useCourseOptions(open);
  const EMPTY = { courseId: '', dayOfWeek: '1', startTime: '08:00', endTime: '10:00', room: '', startDate: todayISO(), endDate: addMonths(todayISO(), 4) };
  const f = useForm(EMPTY, {
    validate: (v) => ({
      courseId: !v.courseId && 'Choisissez un cours.',
      room: !v.room.trim() && 'La salle est obligatoire.',
      endTime: v.startTime && v.endTime && toMin(v.endTime) <= toMin(v.startTime) && 'Doit être après l’heure de début.',
      endDate: v.endDate < v.startDate && 'Doit être après la date de début.',
    }),
  });
  useEffect(() => {
    if (!open) return;
    f.reset(slot ? {
      courseId: slot.courseId, dayOfWeek: String(slot.dayOfWeek), startTime: slot.startTime, endTime: slot.endTime,
      room: slot.room, startDate: slot.startDate, endDate: slot.endDate,
    } : EMPTY);
  }, [open, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const ok = await f.submit(async (v) => {
      const body = { ...v, dayOfWeek: Number(v.dayOfWeek) };
      if (slot) await api.put(`/timetable/${slot.id}`, body); else await api.post('/timetable', body);
    }, { success: slot ? 'Créneau modifié. Les personnes concernées sont notifiées.' : 'Créneau ajouté. Les personnes concernées sont notifiées.' });
    if (ok) { onSaved(); onClose(); }
  };

  return (
    <Modal
      open={open} onClose={onClose} busy={f.saving}
      title={slot ? 'Modifier le créneau' : 'Nouveau créneau'}
      description="Les conflits de salle, de professeur et de classe sont vérifiés automatiquement."
      footer={(
        <>
          {slot && <Button variant="danger-ghost" icon={Trash2} className="mr-auto" onClick={() => { onClose(); onDelete(slot); }} disabled={f.saving}>Supprimer</Button>}
          <Button onClick={onClose} disabled={f.saving}>Annuler</Button>
          <Button variant="primary" type="submit" form="slot-form" loading={f.saving}>Enregistrer</Button>
        </>
      )}
    >
      <form id="slot-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <Select className="sm:col-span-2" label="Cours (le professeur et la classe en découlent)" required placeholder="Choisir un cours…" options={courses} value={f.values.courseId} onChange={f.bind('courseId')} error={f.errors.courseId} />
        <Select label="Jour" options={DAYS.slice(1).map((d, i) => ({ value: String(i + 1), label: d }))} value={f.values.dayOfWeek} onChange={f.bind('dayOfWeek')} error={f.errors.dayOfWeek} />
        <Input label="Salle" required placeholder="Amphi A" value={f.values.room} onChange={f.bind('room')} error={f.errors.room} />
        <Input label="Début" required type="time" min="07:00" max="19:00" value={f.values.startTime} onChange={f.bind('startTime')} error={f.errors.startTime} />
        <Input label="Fin" required type="time" min="07:00" max="20:00" value={f.values.endTime} onChange={f.bind('endTime')} error={f.errors.endTime} />
        <Input label="Du" required type="date" value={f.values.startDate} onChange={f.bind('startDate')} error={f.errors.startDate} />
        <Input label="Au" required type="date" value={f.values.endDate} onChange={f.bind('endDate')} error={f.errors.endDate} />
      </form>
    </Modal>
  );
}

function WeekGrid({ slots, onSelect, showClass }) {
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const todayDow = new Date().getDay();
  return (
    <div className="overflow-x-auto scrollbar-thin rounded-lg border border-line">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '52px repeat(6, 1fr)' }}>
        <div className="border-b border-line" />
        {DAYS.slice(1).map((d, i) => (
          <div key={d} className={`border-b border-l border-line px-2 py-2 text-xs font-medium ${i + 1 === todayDow ? 'text-brand' : 'text-ink-soft'}`}>
            {d}{i + 1 === todayDow && <span className="ml-1 rounded bg-brand-sky px-1 text-[10px]">aujourd’hui</span>}
          </div>
        ))}
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="relative text-right pr-2 text-[11px] text-ink-muted" style={{ height: HOUR_PX }}>
              <span className="relative -top-2">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        {DAYS.slice(1).map((d, i) => (
          <div key={d} className="relative border-l border-line" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h) => <div key={h} className="border-t border-line/60" style={{ height: HOUR_PX }} />)}
            {slots.filter((s) => s.dayOfWeek === i + 1).map((s) => {
              const top = ((toMin(s.startTime) - START_H * 60) / 60) * HOUR_PX;
              const height = Math.max(24, ((toMin(s.endTime) - toMin(s.startTime)) / 60) * HOUR_PX - 3);
              const [bg, fg] = colorFor(s.course?.code);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s)}
                  className="absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-xs transition-shadow hover:shadow-pop focus-visible:shadow-pop"
                  style={{ top: top + 1, height, background: bg, color: fg }}
                  aria-label={`${s.course?.title}, ${DAYS[s.dayOfWeek]} ${s.startTime}–${s.endTime}, ${s.room}`}
                >
                  <div className="font-semibold truncate">{s.course?.code} · {s.course?.title}</div>
                  <div className="opacity-80 truncate">{s.startTime}–{s.endTime} · {s.room}</div>
                  {height > 60 && <div className="opacity-70 truncate">{showClass ? s.className : s.professor?.fullName}</div>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayList({ slots, onSelect, showClass }) {
  const todayDow = new Date().getDay() || 7;
  const [day, setDay] = useState(Math.min(todayDow, 6));
  const list = slots.filter((s) => s.dayOfWeek === day);
  return (
    <>
      <div className="mb-3 grid grid-cols-6 gap-1" role="tablist" aria-label="Jour">
        {DAYS_SHORT.slice(1).map((d, i) => (
          <button
            key={d} type="button" role="tab" aria-selected={day === i + 1} onClick={() => setDay(i + 1)}
            className={`rounded-md py-1.5 text-xs font-medium ${day === i + 1 ? 'bg-ink text-white' : 'bg-side text-ink-soft'}`}
          >
            {d}<span className="block text-[10px] font-normal opacity-70">{slots.filter((s) => s.dayOfWeek === i + 1).length} cours</span>
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="space-y-2">
          {list.map((s) => {
            const [bg, fg] = colorFor(s.course?.code);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => onSelect(s)} className="flex w-full gap-3 rounded-lg border border-line p-3 text-left active:bg-hover">
                  <span className="w-1 self-stretch rounded-full" style={{ background: fg }} />
                  <span className="w-14 shrink-0 text-xs tabular-nums"><b className="block text-sm">{s.startTime}</b>{s.endTime}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{s.course?.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-soft">
                      <span className="inline-flex items-center gap-1"><MapPin size={12} />{s.room}</span>
                      <span>{showClass ? s.className : s.professor?.fullName}</span>
                      <span className="rounded px-1" style={{ background: bg, color: fg }}>{s.course?.code}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={CalendarDays} title={`Aucun cours le ${DAYS[day].toLowerCase()}`} />}
    </>
  );
}

export default function Timetable() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [classId, setClassId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [view, setView] = useState('grid');
  const { data, loading, error, refresh } = useApi('/timetable', { classId, professorId });
  const classes = useClassOptions(isAdmin);
  const profs = useProfessorOptions(isAdmin);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (isAdmin && params.get('new') === '1') { setEditing('new'); params.delete('new'); setParams(params, { replace: true }); }
  }, [params, isAdmin, setParams]);

  // Admin with no filter: default to first class so the grid stays readable.
  useEffect(() => { if (isAdmin && !classId && !professorId && classes.length) setClassId(classes[0].value); }, [isAdmin, classes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (s) => (isAdmin ? setEditing(s) : navigate(`/courses/${s.courseId}`));
  const hours = useMemo(() => (data || []).reduce((a, s) => a + (toMin(s.endTime) - toMin(s.startTime)) / 60, 0), [data]);

  const del = async () => {
    try {
      await api.delete(`/timetable/${deleting.id}`);
      toast.success('Créneau supprimé.');
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  const title = isAdmin ? 'Emplois du temps' : 'Emploi du temps';
  const desc = {
    STUDENT: 'Votre semaine de cours, salles et professeurs.',
    PROFESSOR: 'Vos séances d’enseignement de la semaine.',
    ADMIN: 'Planifiez les cours : jours, horaires, salles et périodes.',
  }[role];

  return (
    <>
      <PageHeader
        icon={CalendarDays} title={title} description={desc}
        actions={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nouveau créneau</Button>}
      />

      <Toolbar>
        {isAdmin && (
          <>
            <Select className="sm:w-56" placeholder="Toutes les classes" options={classes} value={classId} onChange={(e) => { setClassId(e.target.value); setProfessorId(''); }} aria-label="Filtrer par classe" />
            <Select className="sm:w-64" placeholder="Tous les professeurs" options={profs} value={professorId} onChange={(e) => { setProfessorId(e.target.value); setClassId(''); }} aria-label="Filtrer par professeur" />
          </>
        )}
        <span className="text-xs text-ink-soft">{data?.length || 0} créneaux · {hours} h / semaine</span>
        <div className="flex items-center gap-1 sm:ml-auto">
          <Button variant="ghost" size="icon" icon={RefreshCw} onClick={() => refresh()} aria-label="Actualiser" />
          <Tabs
            className="border-0"
            value={view}
            onChange={setView}
            tabs={[{ value: 'grid', label: 'Semaine', icon: LayoutGrid }, { value: 'list', label: 'Liste', icon: List }]}
          />
        </div>
      </Toolbar>

      {loading && !data ? <SkeletonRows rows={8} /> : error ? <ErrorState message={error} onRetry={refresh} /> : !data.length ? (
        <EmptyState icon={CalendarDays} title="Aucun créneau programmé" action={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Ajouter un créneau</Button>} />
      ) : view === 'grid' ? (
        <>
          <div className="hidden md:block"><WeekGrid slots={data} onSelect={select} showClass={role !== 'STUDENT'} /></div>
          <div className="md:hidden"><DayList slots={data} onSelect={select} showClass={role !== 'STUDENT'} /></div>
        </>
      ) : (
        <DataTable
          rows={data}
          pageSize={20}
          initialSort={{ key: 'dayOfWeek', dir: 'asc' }}
          onRowClick={select}
          columns={[
            { key: 'dayOfWeek', header: 'Jour', sortValue: (s) => s.dayOfWeek * 10000 + toMin(s.startTime), render: (s) => DAYS[s.dayOfWeek] },
            { key: 'time', header: 'Horaire', sortable: false, render: (s) => <span className="tabular-nums">{s.startTime} – {s.endTime}</span> },
            { key: 'course', header: 'Cours', sortValue: (s) => s.course?.code, render: (s) => <span><Badge>{s.course?.code}</Badge> <span className="ml-1 hidden sm:inline">{s.course?.title}</span></span> },
            { key: 'room', header: 'Salle' },
            { key: 'professor', header: 'Professeur', hideBelow: 'md', sortValue: (s) => s.professor?.fullName, render: (s) => s.professor?.fullName || '—' },
            { key: 'className', header: 'Classe', hideBelow: 'lg' },
            { key: 'period', header: 'Période', hideBelow: 'lg', sortable: false, render: (s) => <span className="text-xs text-ink-soft">{formatDate(s.startDate)} → {formatDate(s.endDate)}</span> },
            isAdmin && {
              key: 'actions', header: '', sortable: false, align: 'right',
              render: (s) => (
                <span className="inline-flex gap-0.5">
                  <Button size="icon-sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); setEditing(s); }} aria-label="Modifier" />
                  <Button size="icon-sm" variant="danger-ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); setDeleting(s); }} aria-label="Supprimer" />
                </span>
              ),
            },
          ].filter(Boolean)}
        />
      )}

      {isAdmin && (
        <>
          <SlotForm open={!!editing} slot={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => refresh({ silent: true })} onDelete={setDeleting} />
          <ConfirmDialog
            open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del}
            title="Supprimer ce créneau ?"
            message={deleting ? `${deleting.course?.code} — ${DAYS[deleting.dayOfWeek]} ${deleting.startTime}–${deleting.endTime}, ${deleting.room}. Les étudiants et le professeur seront notifiés.` : ''}
            confirmLabel="Supprimer"
          />
        </>
      )}
    </>
  );
}
