import { Link, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Mail, ClipboardList, BookOpen } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { PageHeader, Section, Properties, StatLine, SkeletonRows, ErrorState, DataTable, Badge, Button, EmptyState } from '../../components/ui/index.js';
import { UpcomingClasses, AnnouncementList, ActivityFeed } from '../../components/dashboard.jsx';
import { formatGrade, gradeTone } from '../../lib/format.js';
import { greeting } from '../../lib/format.js';


export default function ProfessorOverview() {
  const { data, loading, error, refresh } = useApi('/dashboard');
  const navigate = useNavigate();
  if (loading) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const p = data.profile;
  const missing = data.courses.reduce((a, c) => a + c.missingGrades, 0);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${p.fullName}`}
        description={`${data.settings.currentSemester} · ${data.settings.institutionName}`}
        actions={<Link to="/grades"><Button variant="primary" icon={ClipboardList}>Saisir des notes</Button></Link>}
      />

      <StatLine items={[
        { label: 'Cours assignés', value: data.courses.length },
        { label: 'Étudiants', value: data.studentCount },
        { label: 'Heures / semaine', value: `${data.weeklyHours} h` },
        { label: 'Notes à saisir', value: missing, tone: missing ? 'text-[#B26F14]' : 'text-success' },
      ]} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Section title="Mes cours">
            <DataTable
              rows={data.courses}
              onRowClick={(c) => navigate(`/courses/${c.id}`)}
              empty={<EmptyState icon={BookOpen} title="Aucun cours assigné" />}
              columns={[
                { key: 'code', header: 'Code', render: (c) => <Badge>{c.code}</Badge> },
                { key: 'title', header: 'Cours', render: (c) => <span className="font-medium">{c.title}</span> },
                { key: 'className', header: 'Classe', hideBelow: 'md' },
                { key: 'studentCount', header: 'Étudiants', align: 'right', hideBelow: 'sm' },
                { key: 'classAverage', header: 'Moyenne', align: 'right', render: (c) => <span className={gradeTone(c.classAverage)}>{formatGrade(c.classAverage)}</span> },
                {
                  key: 'actions', header: '', sortable: false, align: 'right',
                  render: (c) => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/grades?course=${c.id}`); }}>Notes</Button>,
                },
              ]}
            />
          </Section>
          <Section title="Prochaines séances" action={<Link to="/timetable" className="text-xs text-ink-soft hover:text-ink">Emploi du temps →</Link>}>
            <UpcomingClasses sessions={data.upcomingClasses} showClass />
          </Section>
          <Section title="Annonces">
            <AnnouncementList items={data.announcements} />
          </Section>
        </div>
        <aside>
          <Section title="Mon profil">
            <Properties items={[
              { icon: Building2, label: 'Département', value: p.department },
              { icon: MapPin, label: 'Bureau', value: p.office },
              { icon: Mail, label: 'E-mail', value: <span className="break-all">{p.email}</span> },
            ]} />
          </Section>
          <Section title="Activité récente">
            <ActivityFeed items={data.recentActivity} />
          </Section>
        </aside>
      </div>
    </>
  );
}
