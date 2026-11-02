import { Link } from 'react-router-dom';
import { Hash, Layers, CalendarRange, Mail, GraduationCap, ArrowRight } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { PageHeader, Section, Properties, StatLine, SkeletonRows, ErrorState, EmptyState, Button } from '../../components/ui/index.js';
import { UpcomingClasses, AnnouncementList, ActivityFeed, ActivityMiniList } from '../../components/dashboard.jsx';
import { formatGrade, gradeTone, formatDate, EVAL_TYPES } from '../../lib/format.js';
import { greeting } from '../../lib/format.js';


export default function StudentOverview() {
  const { data, loading, error, refresh } = useApi('/dashboard');
  if (loading) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const p = data.profile;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${p.user.firstName}`}
        description={`${data.settings.currentSemester} · Année ${data.settings.academicYear}`}
      />

      <StatLine items={[
        { label: 'Moyenne générale', value: formatGrade(data.generalAverage), tone: gradeTone(data.generalAverage), hint: 'pondérée par coefficient' },
        { label: 'Crédits validés', value: `${data.creditsEarned} / ${data.creditsTotal}` },
        { label: 'Cours suivis', value: data.courseCount },
        { label: 'Semestre en cours', value: data.settings.currentSemester },
      ]} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Section title="Prochains cours" action={<Link to="/timetable" className="text-xs text-ink-soft hover:text-ink">Emploi du temps →</Link>}>
            <UpcomingClasses sessions={data.upcomingClasses} />
          </Section>

          <Section title="Notes récentes" action={<Link to="/grades" className="text-xs text-ink-soft hover:text-ink">Toutes les notes →</Link>}>
            {data.recentGrades.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {data.recentGrades.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-1 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{g.courseTitle}</div>
                      <div className="text-xs text-ink-soft">{g.evaluation} · {EVAL_TYPES[g.type]} · {formatDate(g.date)}</div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${gradeTone(g.value)}`}>{formatGrade(g.value)}<span className="text-ink-muted font-normal">/20</span></span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={GraduationCap} title="Aucune note publiée pour le moment" />}
          </Section>

          <Section title="Annonces académiques">
            <AnnouncementList items={data.announcements} />
          </Section>
        </div>

        <aside>
          <Section title="Mon profil">
            <Properties items={[
              { icon: Hash, label: 'Matricule', value: p.matricule },
              { icon: Layers, label: 'Classe', value: p.className },
              { icon: CalendarRange, label: 'Semestre', value: data.settings.currentSemester },
              { icon: Mail, label: 'E-mail', value: <span className="break-all">{p.email}</span> },
            ]} />
            <Link to="/settings"><Button size="sm" variant="ghost" className="mt-2 -ml-2" icon={ArrowRight}>Gérer mon profil</Button></Link>
          </Section>
          <Section title="Activités à venir" action={<Link to="/activities" className="text-xs text-ink-soft hover:text-ink">Tout voir →</Link>}>
            <ActivityMiniList items={data.upcomingActivities} />
          </Section>
          <Section title="Activité récente">
            <ActivityFeed items={data.recentActivity} />
          </Section>
        </aside>
      </div>
    </>
  );
}
