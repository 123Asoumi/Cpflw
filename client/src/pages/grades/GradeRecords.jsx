import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Download } from 'lucide-react';
import { useApi, useDebounced } from '../../lib/useApi.js';
import { useClassOptions } from '../../lib/useOptions.js';
import { formatGrade, gradeTone } from '../../lib/format.js';
import { Toolbar, SearchInput, Select, DataTable, EmptyState, ErrorState, SkeletonRows, Button, Badge } from '../../components/ui/index.js';

export default function GradeRecords() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState('');
  const dq = useDebounced(q);
  const classes = useClassOptions();
  const { data, loading, error, refresh } = useApi('/grades/records', { q: dq, classId });

  const exportCsv = () => {
    const codes = [...new Set((data || []).flatMap((r) => r.courses.map((c) => c.code)))].sort();
    const head = ['Matricule', 'Nom', 'Classe', ...codes, 'Moyenne générale', 'Crédits'];
    const lines = data.map((r) => [
      r.matricule, r.fullName, r.className,
      ...codes.map((code) => { const c = r.courses.find((x) => x.code === code); return c?.average ?? ''; }),
      r.generalAverage ?? '', `${r.creditsEarned}/${r.creditsTotal}`,
    ]);
    const csv = [head, ...lines].map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dossiers-academiques${classId ? '-classe' : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un étudiant…" className="sm:w-64" />
        <Select className="sm:w-56" placeholder="Toutes les classes" options={classes} value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Filtrer par classe" />
        <Button icon={Download} onClick={exportCsv} disabled={!data?.length} className="sm:ml-auto">Exporter (CSV)</Button>
      </Toolbar>
      {loading && !data ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <DataTable
          rows={data}
          rowKey={(r) => r.studentId}
          onRowClick={(r) => navigate(`/students/${r.studentId}`)}
          initialSort={{ key: 'fullName', dir: 'asc' }}
          empty={<EmptyState icon={FolderOpen} title="Aucun dossier trouvé" />}
          columns={[
            { key: 'fullName', header: 'Étudiant', render: (r) => <span className="font-medium">{r.fullName}</span> },
            { key: 'matricule', header: 'Matricule', hideBelow: 'md' },
            { key: 'className', header: 'Classe', hideBelow: 'sm' },
            { key: 'credits', header: 'Crédits', align: 'right', hideBelow: 'md', sortValue: (r) => r.creditsEarned, render: (r) => `${r.creditsEarned} / ${r.creditsTotal}` },
            {
              key: 'status', header: 'Statut', hideBelow: 'lg', sortable: false,
              render: (r) => (r.generalAverage === null ? <Badge>Sans note</Badge> : r.generalAverage >= 10 ? <Badge tone="green">Admis</Badge> : <Badge tone="red">Ajourné</Badge>),
            },
            { key: 'generalAverage', header: 'Moyenne', align: 'right', render: (r) => <span className={`font-semibold tabular-nums ${gradeTone(r.generalAverage)}`}>{formatGrade(r.generalAverage)}</span> },
          ]}
        />
      )}
    </>
  );
}
