import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Mail, Phone, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { useCrumb } from '../../context/CrumbContext.jsx';
import { useApi } from '../../lib/useApi.js';
import { api, errorMessage } from '../../lib/api.js';
import {
  PageHeader, Section, Properties, Button, DataTable, Badge, EmptyState, ErrorState, SkeletonRows, ConfirmDialog, Avatar,
} from '../../components/ui/index.js';
import { ProfessorForm } from '../../components/forms/PeopleForms.jsx';

export default function ProfessorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: p, loading, error, refresh } = useApi(`/professors/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useCrumb(p?.fullName);

  if (loading && !p) return <SkeletonRows rows={6} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const del = async () => {
    try { await api.delete(`/professors/${p.id}`); toast.success('Professeur supprimé.'); navigate('/professors'); } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  return (
    <>
      <div className="mb-3"><Avatar name={p.fullName} size={48} /></div>
      <PageHeader
        title={p.fullName}
        description={p.department}
        actions={(
          <>
            <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>
            <Button variant="danger-ghost" icon={Trash2} onClick={() => setDeleting(true)}>Supprimer</Button>
          </>
        )}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 lg:order-1">
          <Section title={`Cours assignés (${p.courses.length})`} action={<Button size="sm" variant="ghost" onClick={() => navigate('/courses')}>Assigner un cours →</Button>}>
            <DataTable
              rows={p.courses}
              onRowClick={(c) => navigate(`/courses/${c.id}`)}
              empty={<EmptyState icon={BookOpen} title="Aucun cours assigné" message="Assignez un cours depuis la page Cours (Modifier → Professeur)." />}
              columns={[
                { key: 'code', header: 'Code', render: (c) => <Badge>{c.code}</Badge> },
                { key: 'title', header: 'Cours' },
                { key: 'className', header: 'Classe', hideBelow: 'sm' },
                { key: 'studentCount', header: 'Étudiants', align: 'right' },
              ]}
            />
          </Section>
        </div>
        <aside className="order-1 lg:order-2">
          <Section title="Informations">
            <Properties items={[
              { icon: Building2, label: 'Département', value: p.department },
              { icon: MapPin, label: 'Bureau', value: p.office || '—' },
              { icon: Mail, label: 'E-mail', value: <a href={`mailto:${p.email}`} className="text-brand hover:underline break-all">{p.email}</a> },
              { icon: Phone, label: 'Téléphone', value: p.user?.phone || '—' },
            ]} />
          </Section>
        </aside>
      </div>
      <ProfessorForm open={editing} professor={p} onClose={() => setEditing(false)} onSaved={() => refresh({ silent: true })} />
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={del} title={`Supprimer ${p.fullName} ?`} message="Ses cours deviendront non assignés." confirmLabel="Supprimer" />
    </>
  );
}
