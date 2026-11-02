import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserSquare2, Plus, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi, useDebounced } from '../../lib/useApi.js';
import { api, errorMessage } from '../../lib/api.js';
import {
  PageHeader, Toolbar, SearchInput, Select, Button, DataTable, EmptyState, ErrorState, SkeletonRows, Dropdown, ConfirmDialog, Avatar, Badge,
} from '../../components/ui/index.js';
import { ProfessorForm } from '../../components/forms/PeopleForms.jsx';

export default function Professors() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, refresh } = useApi('/professors', { q: dq, department });
  const { data: all } = useApi('/professors');
  const departments = useMemo(() => [...new Set((all || []).map((p) => p.department))].sort().map((d) => ({ value: d, label: d })), [all]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (params.get('new') === '1') { setEditing('new'); params.delete('new'); setParams(params, { replace: true }); }
  }, [params, setParams]);

  const del = async () => {
    try {
      const r = await api.delete(`/professors/${deleting.id}`);
      toast.success(r.data.unassignedCourses ? `Professeur supprimé. ${r.data.unassignedCourses} cours sont à réassigner.` : 'Professeur supprimé.');
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  return (
    <>
      <PageHeader
        icon={UserSquare2} title="Professeurs" description="Gérez le corps enseignant et ses affectations."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nouveau professeur</Button>}
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nom, e-mail, département…" className="sm:w-64" />
        <Select className="sm:w-52" placeholder="Tous les départements" options={departments} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Département" />
      </Toolbar>
      {loading && !data ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <DataTable
          rows={data}
          onRowClick={(p) => navigate(`/professors/${p.id}`)}
          empty={<EmptyState icon={UserSquare2} title="Aucun professeur trouvé" action={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Ajouter un professeur</Button>} />}
          columns={[
            { key: 'fullName', header: 'Nom', sortValue: (p) => p.user.lastName, render: (p) => <span className="flex items-center gap-2"><Avatar name={p.fullName} size={24} /><span className="font-medium">{p.fullName}</span></span> },
            { key: 'department', header: 'Département', hideBelow: 'sm', render: (p) => <Badge>{p.department}</Badge> },
            { key: 'office', header: 'Bureau', hideBelow: 'lg' },
            { key: 'email', header: 'E-mail', hideBelow: 'md' },
            { key: 'courseCount', header: 'Cours', align: 'right' },
            {
              key: 'actions', header: '', sortable: false, align: 'right',
              render: (p) => (
                <Dropdown
                  trigger={(t) => <Button {...t} size="icon-sm" variant="ghost" icon={MoreHorizontal} aria-label={`Actions pour ${p.fullName}`} />}
                  items={[
                    { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/professors/${p.id}`) },
                    { label: 'Modifier', icon: Pencil, onClick: () => setEditing(p) },
                    { divider: true },
                    { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setDeleting(p) },
                  ]}
                />
              ),
            },
          ]}
        />
      )}
      <ProfessorForm open={!!editing} professor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => refresh({ silent: true })} />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del}
        title={`Supprimer ${deleting?.fullName} ?`}
        message={deleting?.courseCount ? `Ses ${deleting.courseCount} cours deviendront « non assignés » et devront être réassignés.` : 'Le compte sera définitivement supprimé.'}
        confirmLabel="Supprimer"
      />
    </>
  );
}
