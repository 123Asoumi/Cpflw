import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, MoreHorizontal, Pencil, Trash2, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi, useDebounced } from '../lib/useApi.js';
import { useClassOptions, useProfessorOptions } from '../lib/useOptions.js';
import { api, errorMessage } from '../lib/api.js';
import { formatGrade, gradeTone } from '../lib/format.js';
import {
  PageHeader, Toolbar, SearchInput, Select, Button, DataTable, Badge, EmptyState, ErrorState, SkeletonRows, Dropdown, ConfirmDialog,
} from '../components/ui/index.js';
import { CourseForm } from '../components/forms/CourseForm.jsx';

export default function Courses() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, refresh } = useApi('/courses', { q: dq, classId, professorId });
  const classes = useClassOptions(role !== 'STUDENT');
  const profs = useProfessorOptions(isAdmin);
  const [editing, setEditing] = useState(null); // null | 'new' | course
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (isAdmin && params.get('new') === '1') { setEditing('new'); params.delete('new'); setParams(params, { replace: true }); }
  }, [params, isAdmin, setParams]);

  const del = async () => {
    try {
      await api.delete(`/courses/${deleting.id}`);
      toast.success(`Cours ${deleting.code} supprimé.`);
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  const title = role === 'ADMIN' ? 'Cours' : 'Mes cours';
  const description = {
    STUDENT: 'Les cours auxquels vous êtes inscrit(e) ce semestre.',
    PROFESSOR: 'Les cours qui vous sont assignés.',
    ADMIN: 'Créez, modifiez et assignez les cours de l’établissement.',
  }[role];

  const columns = [
    { key: 'code', header: 'Code', render: (c) => <Badge>{c.code}</Badge> },
    { key: 'title', header: 'Intitulé', render: (c) => <span className="font-medium">{c.title}</span> },
    role !== 'PROFESSOR' && { key: 'professor', header: 'Professeur', hideBelow: 'md', sortValue: (c) => c.professor?.fullName, render: (c) => c.professor?.fullName || <Badge tone="orange">Non assigné</Badge> },
    role !== 'STUDENT' && { key: 'className', header: 'Classe', hideBelow: 'md' },
    { key: 'coefficient', header: 'Coef.', align: 'right', hideBelow: 'sm' },
    { key: 'credits', header: 'Crédits', align: 'right', hideBelow: 'lg' },
    role === 'STUDENT' && { key: 'myAverage', header: 'Ma moyenne', align: 'right', render: (c) => <span className={`font-medium tabular-nums ${gradeTone(c.myAverage)}`}>{formatGrade(c.myAverage)}</span> },
    role !== 'STUDENT' && { key: 'studentCount', header: 'Étudiants', align: 'right', hideBelow: 'sm' },
    {
      key: 'actions', header: '', sortable: false, align: 'right',
      render: (c) => (
        <Dropdown
          trigger={(p) => <Button {...p} size="icon-sm" variant="ghost" icon={MoreHorizontal} aria-label={`Actions pour ${c.code}`} />}
          items={[
            { label: 'Voir le détail', icon: Eye, onClick: () => navigate(`/courses/${c.id}`) },
            role !== 'STUDENT' && { label: 'Carnet de notes', icon: BookOpen, onClick: () => navigate(`/grades?course=${c.id}`) },
            isAdmin && { label: 'Modifier', icon: Pencil, onClick: () => setEditing(c) },
            isAdmin && { divider: true },
            isAdmin && { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setDeleting(c) },
          ]}
        />
      ),
    },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        icon={BookOpen} title={title} description={description}
        actions={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nouveau cours</Button>}
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un cours…" className="sm:w-64" />
        {role !== 'STUDENT' && <Select className="sm:w-52" placeholder="Toutes les classes" options={classes} value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Filtrer par classe" />}
        {isAdmin && <Select className="sm:w-60" placeholder="Tous les professeurs" options={profs} value={professorId} onChange={(e) => setProfessorId(e.target.value)} aria-label="Filtrer par professeur" />}
        <Button variant="ghost" icon={RefreshCw} onClick={() => refresh()} className="sm:ml-auto" aria-label="Actualiser">Actualiser</Button>
      </Toolbar>

      {loading && !data ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <DataTable
          rows={data}
          columns={columns}
          onRowClick={(c) => navigate(`/courses/${c.id}`)}
          empty={(
            <EmptyState
              icon={BookOpen}
              title={q || classId || professorId ? 'Aucun cours ne correspond à ces filtres' : 'Aucun cours pour le moment'}
              action={q || classId || professorId
                ? <Button onClick={() => { setQ(''); setClassId(''); setProfessorId(''); }}>Réinitialiser les filtres</Button>
                : isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Créer un cours</Button>}
            />
          )}
        />
      )}

      <CourseForm open={!!editing} course={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => refresh({ silent: true })} />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del}
        title={`Supprimer ${deleting?.code} ?`}
        message="Les évaluations, notes, créneaux et inscriptions liés à ce cours seront supprimés. Les étudiants et le professeur seront notifiés."
        confirmLabel="Supprimer le cours"
      />
    </>
  );
}
