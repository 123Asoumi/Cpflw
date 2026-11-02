import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, CalendarDays, Clock, MapPin, Users, Tag, Pencil, Trash2, UserMinus, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCrumb } from '../context/CrumbContext.jsx';
import { useApi } from '../lib/useApi.js';
import { api, errorMessage } from '../lib/api.js';
import { formatDayLong, formatDate } from '../lib/format.js';
import {
  PageHeader, Section, Properties, Button, DataTable, Badge, Meter, EmptyState, ErrorState, SkeletonRows, ConfirmDialog,
} from '../components/ui/index.js';
import { ActivityForm } from '../components/forms/ActivityForm.jsx';
import { RegistrationButton } from '../components/RegistrationButton.jsx';

export default function ActivityDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navigate = useNavigate();
  const toast = useToast();
  const { data: a, loading, error, refresh, setData } = useApi(`/activities/${id}`);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [toggling, setToggling] = useState(false);
  useCrumb(a?.title);

  if (loading && !a) return <SkeletonRows rows={6} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const del = async () => {
    try { await api.delete(`/activities/${a.id}`); toast.success('Activité supprimée.'); navigate('/activities'); } catch (err) { toast.error(errorMessage(err)); throw err; }
  };
  const removeReg = async () => {
    try { await api.delete(`/activities/${a.id}/registrations/${removing.id}`); toast.success('Inscription retirée.'); refresh({ silent: true }); } catch (err) { toast.error(errorMessage(err)); throw err; }
  };
  const toggleRegistration = async () => {
    setToggling(true);
    try {
      await api.put(`/activities/${a.id}`, { registrationOpen: !a.registrationOpen });
      toast.success(a.registrationOpen ? 'Inscriptions fermées.' : 'Inscriptions ouvertes.');
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); } finally { setToggling(false); }
  };

  return (
    <>
      <PageHeader
        icon={Sparkles}
        title={a.title}
        actions={(
          <>
            {role === 'STUDENT' && <RegistrationButton activity={a} onChange={setData} />}
            {isAdmin && <Button icon={a.registrationOpen ? Lock : Unlock} onClick={toggleRegistration} loading={toggling} disabled={a.isPast}>{a.registrationOpen ? 'Fermer les inscriptions' : 'Ouvrir les inscriptions'}</Button>}
            {isAdmin && <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>}
            {isAdmin && <Button variant="danger-ghost" icon={Trash2} onClick={() => setDeleting(true)}>Supprimer</Button>}
          </>
        )}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 lg:order-1">
          <Section title="Description">
            <p className="text-sm leading-relaxed whitespace-pre-line">{a.description}</p>
          </Section>
          {isAdmin && (
            <Section title={`Inscriptions (${a.registrations.length})`}>
              <DataTable
                rows={a.registrations}
                empty={<EmptyState icon={Users} title="Aucune inscription pour le moment" />}
                columns={[
                  { key: 'fullName', header: 'Étudiant', render: (r) => <span className="font-medium">{r.fullName}</span> },
                  { key: 'matricule', header: 'Matricule', hideBelow: 'sm' },
                  { key: 'className', header: 'Classe', hideBelow: 'md' },
                  { key: 'createdAt', header: 'Inscrit le', hideBelow: 'sm', render: (r) => formatDate(r.createdAt) },
                  { key: 'actions', header: '', sortable: false, align: 'right', render: (r) => <Button size="icon-sm" variant="danger-ghost" icon={UserMinus} onClick={() => setRemoving(r)} aria-label={`Retirer ${r.fullName}`} /> },
                ]}
              />
            </Section>
          )}
        </div>
        <aside className="order-1 lg:order-2">
          <Section title="Informations">
            <Properties items={[
              { icon: CalendarDays, label: 'Date', value: <span className="capitalize">{formatDayLong(a.date)}</span> },
              { icon: Clock, label: 'Horaire', value: `${a.startTime} – ${a.endTime}` },
              { icon: MapPin, label: 'Lieu', value: a.location },
              { icon: Tag, label: 'Catégorie', value: <Badge>{a.category}</Badge> },
              { icon: Users, label: 'Places', value: `${a.registeredCount} / ${a.capacity} (${a.spotsLeft} restantes)` },
              {
                label: 'Statut',
                value: a.isPast ? <Badge>Terminée</Badge> : a.isFull ? <Badge tone="red">Complet</Badge> : a.registrationOpen ? <Badge tone="green">Inscriptions ouvertes</Badge> : <Badge tone="orange">Inscriptions fermées</Badge>,
              },
              role === 'STUDENT' && { label: 'Mon inscription', value: a.isRegistered ? <Badge tone="green">Inscrit(e) le {formatDate(a.registeredAt)}</Badge> : <Badge>Non inscrit(e)</Badge> },
            ]} />
            <Meter className="mt-3" value={a.registeredCount} max={a.capacity} tone={a.isFull ? 'red' : 'brand'} />
          </Section>
        </aside>
      </div>

      {isAdmin && (
        <>
          <ActivityForm open={editing} activity={a} onClose={() => setEditing(false)} onSaved={() => refresh({ silent: true })} />
          <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={del} title="Supprimer l’activité ?" message="Les inscrits seront notifiés de l’annulation." confirmLabel="Supprimer" />
          <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={removeReg} title="Retirer l’inscription ?" message={`${removing?.fullName} sera désinscrit(e) et notifié(e).`} confirmLabel="Retirer" />
        </>
      )}
    </>
  );
}
