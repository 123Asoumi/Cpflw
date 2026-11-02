import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Hash, Layers, Mail, Phone, Cake, Pencil, Trash2, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCrumb } from '../../context/CrumbContext.jsx';
import { useApi } from '../../lib/useApi.js';
import { api, errorMessage } from '../../lib/api.js';
import { formatDate, formatGrade, gradeTone } from '../../lib/format.js';
import {
  PageHeader, Section, Properties, Button, DataTable, Badge, EmptyState, ErrorState, SkeletonRows, ConfirmDialog, Avatar, StatLine,
} from '../../components/ui/index.js';
import { StudentForm } from '../../components/forms/PeopleForms.jsx';

export default function StudentDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navigate = useNavigate();
  const toast = useToast();
  const { data: s, loading, error, refresh } = useApi(`/students/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useCrumb(s?.fullName);

  if (loading && !s) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const del = async () => {
    try { await api.delete(`/students/${s.id}`); toast.success('Étudiant supprimé.'); navigate('/students'); } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  return (
    <>
      <div className="mb-3"><Avatar name={s.fullName} size={48} /></div>
      <PageHeader
        title={s.fullName}
        description={`${s.className || 'Sans classe'} · ${s.matricule}`}
        actions={isAdmin && (
          <>
            <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>
            <Button variant="danger-ghost" icon={Trash2} onClick={() => setDeleting(true)}>Supprimer</Button>
          </>
        )}
      />

      {isAdmin && (
        <StatLine items={[
          { label: 'Moyenne générale', value: formatGrade(s.report.generalAverage), tone: gradeTone(s.report.generalAverage) },
          { label: 'Crédits validés', value: `${s.report.creditsEarned} / ${s.report.creditsTotal}` },
          { label: 'Cours', value: s.report.courses.length },
          { label: 'Activités', value: s.activities.length },
        ]} />
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 lg:order-1">
          <Section title={isAdmin ? 'Résultats par cours' : 'Résultats dans mes cours'}>
            <DataTable
              rows={s.report.courses}
              rowKey={(c) => c.courseId}
              onRowClick={(c) => navigate(`/courses/${c.courseId}`)}
              empty={<EmptyState icon={GraduationCap} title="Aucun cours" />}
              columns={[
                { key: 'code', header: 'Code', render: (c) => <Badge>{c.code}</Badge> },
                { key: 'title', header: 'Cours' },
                { key: 'coefficient', header: 'Coef.', align: 'right', hideBelow: 'sm' },
                { key: 'evals', header: 'Notes', align: 'right', hideBelow: 'md', sortable: false, render: (c) => `${c.evaluations.filter((e) => e.value !== null).length}/${c.evaluations.length}` },
                { key: 'average', header: 'Moyenne', align: 'right', render: (c) => <span className={`font-semibold tabular-nums ${gradeTone(c.average)}`}>{formatGrade(c.average)}</span> },
              ]}
            />
          </Section>
          {isAdmin && (
            <Section title="Activités">
              {s.activities.length ? (
                <ul className="divide-y divide-line border-y border-line">
                  {s.activities.map((a) => (
                    <li key={a.id}><Link to={`/activities/${a.id}`} className="flex justify-between gap-2 px-1 py-2 text-sm hover:bg-[#FAFAF9]"><span>{a.title}</span><span className="text-ink-soft">{formatDate(a.date)}</span></Link></li>
                  ))}
                </ul>
              ) : <EmptyState icon={Sparkles} title="Aucune inscription à une activité" />}
            </Section>
          )}
        </div>
        <aside className="order-1 lg:order-2">
          <Section title="Informations">
            <Properties items={[
              { icon: Hash, label: 'Matricule', value: s.matricule },
              { icon: Layers, label: 'Classe', value: s.className },
              { icon: Mail, label: 'E-mail', value: <a href={`mailto:${s.email}`} className="text-brand hover:underline break-all">{s.email}</a> },
              { icon: Phone, label: 'Téléphone', value: s.user?.phone || '—' },
              { icon: Cake, label: 'Naissance', value: s.dateOfBirth ? formatDate(s.dateOfBirth) : '—' },
            ]} />
          </Section>
        </aside>
      </div>

      {isAdmin && (
        <>
          <StudentForm open={editing} student={s} onClose={() => setEditing(false)} onSaved={() => refresh({ silent: true })} />
          <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={del} title={`Supprimer ${s.fullName} ?`} message="Toutes ses données (notes, inscriptions) seront supprimées." confirmLabel="Supprimer" />
        </>
      )}
    </>
  );
}
