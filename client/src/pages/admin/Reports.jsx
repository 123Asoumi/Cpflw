import { useNavigate } from 'react-router-dom';
import { BarChart3, RefreshCw, Printer } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { formatDate, formatGrade, gradeTone } from '../../lib/format.js';
import { PageHeader, Section, StatLine, DataTable, Meter, Button, SkeletonRows, ErrorState, Badge } from '../../components/ui/index.js';

function Distribution({ items }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="flex h-40 items-end gap-2 sm:gap-4 border-b border-line pb-px" role="img" aria-label="Répartition des moyennes générales">
      {items.map((i, idx) => (
        <div key={i.label} className="flex flex-1 flex-col items-center justify-end h-full">
          <span className="mb-1 text-xs font-medium tabular-nums">{i.count}</span>
          <div
            className={`w-full max-w-[56px] rounded-t ${idx < 2 ? 'bg-danger/70' : idx < 4 ? 'bg-brand/70' : 'bg-success/70'}`}
            style={{ height: `${(i.count / max) * 100}%`, minHeight: i.count ? 4 : 0 }}
          />
          <span className="mt-1.5 text-[11px] text-ink-soft whitespace-nowrap">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useApi('/reports');
  if (loading && !data) return <SkeletonRows rows={10} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const s = data.summary;

  return (
    <>
      <PageHeader
        icon={BarChart3} title="Rapports" description="Statistiques institutionnelles calculées à partir des données réelles."
        actions={<><Button icon={RefreshCw} onClick={() => refresh()}>Actualiser</Button><Button icon={Printer} onClick={() => window.print()}>Imprimer</Button></>}
      />
      <StatLine items={[
        { label: 'Moyenne établissement', value: formatGrade(s.institutionAverage), tone: gradeTone(s.institutionAverage) },
        { label: 'Taux de réussite', value: s.passRate === null ? '—' : `${s.passRate} %` },
        { label: 'Étudiants', value: s.students },
        { label: 'Professeurs', value: s.professors },
        { label: 'Notes saisies', value: s.gradesRecorded },
        { label: 'Inscriptions activités', value: s.registrations },
      ]} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-2">
        <Section title="Répartition des moyennes générales">
          <Distribution items={data.distribution} />
        </Section>
        <Section title="Par classe">
          <DataTable
            rows={data.byClass}
            onRowClick={(c) => navigate(`/classes/${c.id}`)}
            columns={[
              { key: 'name', header: 'Classe' },
              { key: 'students', header: 'Étud.', align: 'right' },
              { key: 'average', header: 'Moyenne', align: 'right', render: (c) => <span className={gradeTone(c.average)}>{formatGrade(c.average)}</span> },
              { key: 'passRate', header: 'Réussite', align: 'right', render: (c) => <span className="whitespace-nowrap">{c.passRate === null ? '—' : `${c.passRate} %`}</span> },
            ]}
          />
        </Section>
      </div>

      <Section title="Par cours">
        <DataTable
          rows={data.byCourse}
          pageSize={15}
          onRowClick={(c) => navigate(`/courses/${c.id}`)}
          columns={[
            { key: 'code', header: 'Code', render: (c) => <Badge>{c.code}</Badge> },
            { key: 'title', header: 'Cours', hideBelow: 'sm' },
            { key: 'className', header: 'Classe', hideBelow: 'lg' },
            { key: 'professor', header: 'Professeur', hideBelow: 'md', render: (c) => c.professor || <Badge tone="orange">Non assigné</Badge> },
            { key: 'average', header: 'Moyenne', align: 'right', render: (c) => <span className={gradeTone(c.average)}>{formatGrade(c.average)}</span> },
            {
              key: 'passRate', header: 'Réussite', align: 'right',
              render: (c) => (c.passRate === null ? '—' : (
                <span className="inline-flex items-center gap-2 whitespace-nowrap"><Meter className="w-16 hidden sm:block" value={c.passRate} tone={c.passRate >= 70 ? 'green' : c.passRate >= 50 ? 'orange' : 'red'} />{c.passRate} %</span>
              )),
            },
          ]}
        />
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-2">
        <Section title="Remplissage des activités">
          <DataTable
            rows={data.activities}
            onRowClick={(a) => navigate(`/activities/${a.id}`)}
            columns={[
              { key: 'title', header: 'Activité', render: (a) => <span className="line-clamp-1">{a.title}</span> },
              { key: 'date', header: 'Date', hideBelow: 'sm', render: (a) => formatDate(a.date) },
              { key: 'fillRate', header: 'Inscrits', align: 'right', render: (a) => <span className="tabular-nums">{a.registered}/{a.capacity}</span> },
            ]}
          />
        </Section>
        <Section title="Charge d’enseignement">
          <DataTable
            rows={data.professors}
            onRowClick={(p) => navigate(`/professors/${p.id}`)}
            columns={[
              { key: 'fullName', header: 'Professeur' },
              { key: 'courses', header: 'Cours', align: 'right' },
              { key: 'weeklyHours', header: 'H / sem.', align: 'right', render: (p) => `${p.weeklyHours} h` },
            ]}
          />
        </Section>
      </div>
    </>
  );
}
