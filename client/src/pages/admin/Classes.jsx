import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi, useDebounced } from '../../lib/useApi.js';
import { api, errorMessage } from '../../lib/api.js';
import {
  PageHeader, Toolbar, SearchInput, Button, DataTable, EmptyState, ErrorState, SkeletonRows, Dropdown, ConfirmDialog, Badge,
} from '../../components/ui/index.js';
import { ClassForm } from '../../components/forms/PeopleForms.jsx';

export default function Classes() {
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, refresh } = useApi('/classes', { q: dq });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const del = async () => {
    try { await api.delete(`/classes/${deleting.id}`); toast.success('Classe supprimée.'); refresh({ silent: true }); } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  return (
    <>
      <PageHeader
        icon={Layers} title="Classes" description="Promotions et groupes : chaque étudiant appartient à une classe, chaque cours est rattaché à une classe."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nouvelle classe</Button>}
      />
      <Toolbar><SearchInput value={q} onChange={setQ} placeholder="Rechercher une classe…" className="sm:w-64" /></Toolbar>
      {loading && !data ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <DataTable
          rows={data}
          onRowClick={(c) => navigate(`/classes/${c.id}`)}
          empty={<EmptyState icon={Layers} title="Aucune classe" action={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Créer une classe</Button>} />}
          columns={[
            { key: 'code', header: 'Code', render: (c) => <Badge>{c.code}</Badge> },
            { key: 'name', header: 'Nom', render: (c) => <span className="font-medium">{c.name}</span> },
            { key: 'program', header: 'Filière', hideBelow: 'md' },
            { key: 'academicYear', header: 'Année', hideBelow: 'lg' },
            { key: 'studentCount', header: 'Étudiants', align: 'right' },
            { key: 'courseCount', header: 'Cours', align: 'right', hideBelow: 'sm' },
            {
              key: 'actions', header: '', sortable: false, align: 'right',
              render: (c) => (
                <Dropdown
                  trigger={(t) => <Button {...t} size="icon-sm" variant="ghost" icon={MoreHorizontal} aria-label={`Actions pour ${c.name}`} />}
                  items={[
                    { label: 'Voir la classe', icon: Eye, onClick: () => navigate(`/classes/${c.id}`) },
                    { label: 'Modifier', icon: Pencil, onClick: () => setEditing(c) },
                    { divider: true },
                    { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setDeleting(c) },
                  ]}
                />
              ),
            },
          ]}
        />
      )}
      <ClassForm open={!!editing} cls={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => refresh({ silent: true })} />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del}
        title={`Supprimer ${deleting?.name} ?`}
        message="Une classe ne peut être supprimée que si elle ne contient plus d’étudiants ni de cours."
        confirmLabel="Supprimer"
      />
    </>
  );
}
