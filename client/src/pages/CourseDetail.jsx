import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  BookOpen, Hash, Layers, User, Mail, MapPin, Scale, Award, CalendarRange, Pencil, Trash2, ClipboardList, CalendarDays, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCrumb } from '../context/CrumbContext.jsx';
import { useApi } from '../lib/useApi.js';
import { api, errorMessage } from '../lib/api.js';
import { DAYS, EVAL_TYPES, formatDate, formatGrade, gradeTone } from '../lib/format.js';
import {
  PageHeader, Section, Properties, Button, DataTable, Badge, EmptyState, ErrorState, SkeletonRows, ConfirmDialog, Avatar,
} from '../components/ui/index.js';
import { CourseForm } from '../components/forms/CourseForm.jsx';

export default function CourseDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: c, loading, error, refresh } = useApi(`/courses/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useCrumb(c ? `${c.code} — ${c.title}` : null);

  if (loading && !c) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const del = async () => {
    try {
      await api.delete(`/courses/${c.id}`);
      toast.success('Cours supprimé.');
      navigate('/courses');
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  return (
    <>
      <PageHeader
        icon={BookOpen}
        title={c.title}
        description={c.description}
        actions={(
          <>
            {role !== 'STUDENT' && <Link to={`/grades?course=${c.id}`}><Button icon={ClipboardList}>Carnet de notes</Button></Link>}
            {role === 'ADMIN' && <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>}
            {role === 'ADMIN' && <Button variant="danger-ghost" icon={Trash2} onClick={() => setDeleting(true)}>Supprimer</Button>}
          </>
        )}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 lg:order-1">
          {role === 'STUDENT' && c.myReport && (
            <Section title="Mes résultats" description="Moyenne du cours = Σ(note × poids) / Σ(poids)">
              {c.myReport.evaluations.length ? (
                <ul className="divide-y divide-line border-y border-line">
                  {c.myReport.evaluations.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-1 py-2.5 text-sm">
                      <span className="flex-1">{e.title} <span className="text-ink-soft">· {EVAL_TYPES[e.type]} · poids {e.weight}</span></span>
                      <span className="text-xs text-ink-soft hidden sm:inline">{formatDate(e.date)}</span>
                      <span className={`w-16 text-right font-semibold tabular-nums ${gradeTone(e.value)}`}>{e.value === null ? 'Non noté' : formatGrade(e.value)}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3 px-1 py-2.5 text-sm font-semibold">
                    <span className="flex-1">Moyenne du cours</span>
                    <span className={`w-16 text-right tabular-nums ${gradeTone(c.myReport.average)}`}>{formatGrade(c.myReport.average)}</span>
                  </li>
                </ul>
              ) : <EmptyState icon={ClipboardList} title="Aucune évaluation pour l’instant" />}
            </Section>
          )}

          <Section title="Horaires" action={<Link to="/timetable" className="text-xs text-ink-soft hover:text-ink">Emploi du temps →</Link>}>
            {c.schedule.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {c.schedule.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-2.5 text-sm">
                    <span className="w-24 font-medium">{DAYS[s.dayOfWeek]}</span>
                    <span className="tabular-nums">{s.startTime} – {s.endTime}</span>
                    <span className="inline-flex items-center gap-1 text-ink-soft"><MapPin size={13} />{s.room}</span>
                    <span className="text-xs text-ink-muted sm:ml-auto">du {formatDate(s.startDate)} au {formatDate(s.endDate)}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={CalendarDays} title="Aucun créneau programmé" action={role === 'ADMIN' && <Link to="/timetable?new=1"><Button size="sm">Programmer un créneau</Button></Link>} />}
          </Section>

          {role !== 'STUDENT' && (
            <Section title={`Étudiants inscrits (${c.students.length})`}>
              <DataTable
                rows={c.students}
                pageSize={10}
                onRowClick={(s) => navigate(`/students/${s.id}`)}
                empty={<EmptyState icon={Users} title="Aucun étudiant inscrit" />}
                columns={[
                  { key: 'fullName', header: 'Étudiant', render: (s) => <span className="flex items-center gap-2"><Avatar name={s.fullName} size={22} /><span className="font-medium">{s.fullName}</span></span> },
                  { key: 'matricule', header: 'Matricule', hideBelow: 'sm' },
                  { key: 'email', header: 'E-mail', hideBelow: 'lg' },
                  { key: 'average', header: 'Moyenne', align: 'right', render: (s) => <span className={`tabular-nums ${gradeTone(s.average)}`}>{formatGrade(s.average)}</span> },
                ]}
              />
            </Section>
          )}

          <Section title="Évaluations">
            {c.evaluations.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {c.evaluations.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-1 py-2 text-sm">
                    <span className="flex-1">{e.title}</span>
                    <Badge>{EVAL_TYPES[e.type]}</Badge>
                    <span className="text-ink-soft w-16 text-right">poids {e.weight}</span>
                    <span className="text-ink-soft hidden sm:inline w-28 text-right">{formatDate(e.date)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">Aucune évaluation programmée.</p>}
          </Section>
        </div>

        <aside className="order-1 lg:order-2">
          <Section title="Propriétés">
            <Properties items={[
              { icon: Hash, label: 'Code', value: <Badge>{c.code}</Badge> },
              { icon: Layers, label: 'Classe', value: c.className },
              { icon: CalendarRange, label: 'Semestre', value: c.semester },
              { icon: Scale, label: 'Coefficient', value: c.coefficient },
              { icon: Award, label: 'Crédits', value: c.credits },
              { icon: Users, label: 'Inscrits', value: c.studentCount },
            ]} />
          </Section>
          <Section title="Professeur">
            {c.professor ? (
              <Properties items={[
                { icon: User, label: 'Nom', value: c.professor.fullName },
                { icon: Layers, label: 'Département', value: c.professor.department },
                { icon: MapPin, label: 'Bureau', value: c.professor.office || '—' },
                { icon: Mail, label: 'E-mail', value: <a className="text-brand hover:underline break-all" href={`mailto:${c.professor.email}`}>{c.professor.email}</a> },
              ]} />
            ) : (
              <div className="text-sm text-ink-soft">
                Aucun professeur assigné.
                {role === 'ADMIN' && <Button size="sm" className="mt-2" icon={User} onClick={() => setEditing(true)}>Assigner un professeur</Button>}
              </div>
            )}
          </Section>
        </aside>
      </div>

      {role === 'ADMIN' && (
        <>
          <CourseForm open={editing} course={c} onClose={() => setEditing(false)} onSaved={() => refresh({ silent: true })} />
          <ConfirmDialog
            open={deleting} onClose={() => setDeleting(false)} onConfirm={del}
            title={`Supprimer ${c.code} ?`}
            message="Les évaluations, notes, créneaux et inscriptions liés seront supprimés."
            confirmLabel="Supprimer le cours"
          />
        </>
      )}
    </>
  );
}
