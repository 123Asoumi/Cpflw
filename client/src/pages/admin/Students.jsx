import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Plus, MoreHorizontal, Pencil, Trash2, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi, useDebounced } from '../../lib/useApi.js';
import { useClassOptions, useCourseOptions } from '../../lib/useOptions.js';
import { api, errorMessage } from '../../lib/api.js';
import {
  PageHeader, Toolbar, SearchInput, Select, Button, DataTable, EmptyState, ErrorState, SkeletonRows, Dropdown, ConfirmDialog, Avatar,
} from '../../components/ui/index.js';
import { StudentForm } from '../../components/forms/PeopleForms.jsx';

export default function Students() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState(params.get('class') || '');
  const [courseId, setCourseId] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, refresh } = useApi('/students', { q: dq, classId, courseId });
  const classes = useClassOptions();
  const courses = useCourseOptions(!isAdmin);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (isAdmin && params.get('new') === '1') { setEditing('new'); params.delete('new'); setParams(params, { replace: true }); }
  }, [params, isAdmin, setParams]);

  const del = async () => {
    try {
      await api.delete(`/students/${deleting.id}`);
      toast.success(`${deleting.fullName} a été supprimé(e).`);
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  const filtered = q || classId || courseId;

  return (
    <>
      <PageHeader
        icon={Users}
        title="Étudiants"
        description={isAdmin ? 'Gérez les dossiers étudiants de l’établissement.' : 'Les étudiants inscrits à vos cours.'}
        actions={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nouvel étudiant</Button>}
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nom, e-mail ou matricule…" className="sm:w-64" />
        <Select className="sm:w-52" placeholder="Toutes les classes" options={classes} value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Filtrer par classe" />
        {!isAdmin && <Select className="sm:w-64" placeholder="Tous mes cours" options={courses} value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Filtrer par cours" />}
        <span className="text-xs text-ink-soft">{data ? `${data.length} étudiant${data.length > 1 ? 's' : ''}` : ''}</span>
        <Button variant="ghost" icon={RefreshCw} onClick={() => refresh()} className="sm:ml-auto">Actualiser</Button>
      </Toolbar>

      {loading && !data ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <DataTable
          rows={data}
          onRowClick={(s) => navigate(`/students/${s.id}`)}
          empty={(
            <EmptyState
              icon={Users}
              title={filtered ? 'Aucun étudiant ne correspond' : 'Aucun étudiant'}
              action={filtered ? <Button onClick={() => { setQ(''); setClassId(''); setCourseId(''); }}>Réinitialiser les filtres</Button> : isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Ajouter un étudiant</Button>}
            />
          )}
          columns={[
            { key: 'fullName', header: 'Nom', render: (s) => <span className="flex items-center gap-2"><Avatar name={s.fullName} size={24} /><span className="font-medium">{s.fullName}</span></span> },
            { key: 'matricule', header: 'Matricule', hideBelow: 'sm' },
            { key: 'className', header: 'Classe', hideBelow: 'md' },
            { key: 'email', header: 'E-mail', hideBelow: 'lg' },
            {
              key: 'actions', header: '', sortable: false, align: 'right',
              render: (s) => (
                <Dropdown
                  trigger={(p) => <Button {...p} size="icon-sm" variant="ghost" icon={MoreHorizontal} aria-label={`Actions pour ${s.fullName}`} />}
                  items={[
                    { label: 'Voir le dossier', icon: Eye, onClick: () => navigate(`/students/${s.id}`) },
                    isAdmin && { label: 'Modifier', icon: Pencil, onClick: () => setEditing(s) },
                    isAdmin && { divider: true },
                    isAdmin && { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setDeleting(s) },
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      {isAdmin && (
        <>
          <StudentForm open={!!editing} student={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => refresh({ silent: true })} />
          <ConfirmDialog
            open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del}
            title={`Supprimer ${deleting?.fullName} ?`}
            message="Le compte, les inscriptions, les notes et les inscriptions aux activités seront définitivement supprimés."
            confirmLabel="Supprimer l’étudiant"
          />
        </>
      )}
    </>
  );
}
