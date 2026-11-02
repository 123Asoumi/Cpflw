import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layers, Pencil, UserPlus, BookPlus, CalendarDays, Users, BookOpen } from 'lucide-react';
import { useCrumb } from '../../context/CrumbContext.jsx';
import { useApi } from '../../lib/useApi.js';
import {
  PageHeader, Section, Properties, Button, DataTable, Badge, EmptyState, ErrorState, SkeletonRows, Avatar,
} from '../../components/ui/index.js';
import { ClassForm } from '../../components/forms/PeopleForms.jsx';

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: c, loading, error, refresh } = useApi(`/classes/${id}`);
  const [editing, setEditing] = useState(false);
  useCrumb(c?.name);

  if (loading && !c) return <SkeletonRows rows={6} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <>
      <PageHeader
        icon={Layers} title={c.name} description={`${c.program} · ${c.level} · ${c.academicYear}`}
        actions={(
          <>
            <Link to="/timetable"><Button icon={CalendarDays}>Emploi du temps</Button></Link>
            <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>
          </>
        )}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="order-2 lg:order-1">
          <Section title={`Cours (${c.courses.length})`} action={<Button size="sm" variant="ghost" icon={BookPlus} onClick={() => navigate('/courses?new=1')}>Ajouter</Button>}>
            <DataTable
              rows={c.courses}
              onRowClick={(x) => navigate(`/courses/${x.id}`)}
              empty={<EmptyState icon={BookOpen} title="Aucun cours" />}
              columns={[
                { key: 'code', header: 'Code', render: (x) => <Badge>{x.code}</Badge> },
                { key: 'title', header: 'Cours' },
                { key: 'professor', header: 'Professeur', hideBelow: 'sm', sortValue: (x) => x.professor?.fullName, render: (x) => x.professor?.fullName || <Badge tone="orange">Non assigné</Badge> },
                { key: 'coefficient', header: 'Coef.', align: 'right' },
              ]}
            />
          </Section>
          <Section title={`Étudiants (${c.students.length})`} action={<Button size="sm" variant="ghost" icon={UserPlus} onClick={() => navigate('/students?new=1')}>Ajouter</Button>}>
            <DataTable
              rows={c.students}
              onRowClick={(s) => navigate(`/students/${s.id}`)}
              empty={<EmptyState icon={Users} title="Aucun étudiant" />}
              columns={[
                { key: 'fullName', header: 'Nom', render: (s) => <span className="flex items-center gap-2"><Avatar name={s.fullName} size={22} />{s.fullName}</span> },
                { key: 'matricule', header: 'Matricule', hideBelow: 'sm' },
                { key: 'email', header: 'E-mail', hideBelow: 'md' },
              ]}
            />
          </Section>
        </div>
        <aside className="order-1 lg:order-2">
          <Section title="Propriétés">
            <Properties items={[
              { label: 'Code', value: <Badge>{c.code}</Badge> },
              { label: 'Niveau', value: c.level },
              { label: 'Filière', value: c.program },
              { label: 'Année', value: c.academicYear },
              { label: 'Étudiants', value: c.studentCount },
              { label: 'Cours', value: c.courseCount },
            ]} />
          </Section>
        </aside>
      </div>
      <ClassForm open={editing} cls={c} onClose={() => setEditing(false)} onSaved={() => refresh({ silent: true })} />
    </>
  );
}
