import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Plus, MapPin, Clock, Users, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi, useDebounced } from '../lib/useApi.js';
import { api, errorMessage } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import {
  PageHeader, Toolbar, SearchInput, Select, Button, Tabs, EmptyState, ErrorState, SkeletonRows, Badge, Meter, Dropdown, ConfirmDialog,
} from '../components/ui/index.js';
import { ActivityForm, CATEGORIES } from '../components/forms/ActivityForm.jsx';
import { RegistrationButton } from '../components/RegistrationButton.jsx';

export default function Activities() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('upcoming');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, refresh, setData } = useApi('/activities', { status, category, q: dq });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (isAdmin && params.get('new') === '1') { setEditing('new'); params.delete('new'); setParams(params, { replace: true }); }
  }, [params, isAdmin, setParams]);

  const replace = (a) => setData((xs) => (status === 'registered' && !a.isRegistered ? xs.filter((x) => x.id !== a.id) : xs.map((x) => (x.id === a.id ? a : x))));

  const del = async () => {
    try {
      await api.delete(`/activities/${deleting.id}`);
      toast.success('Activité supprimée. Les inscrits ont été notifiés.');
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  const tabs = [
    { value: 'upcoming', label: 'À venir' },
    role === 'STUDENT' && { value: 'registered', label: 'Mes inscriptions' },
    { value: 'past', label: 'Passées' },
    { value: '', label: 'Toutes' },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        icon={Sparkles}
        title={isAdmin ? 'Activités académiques' : 'Activités'}
        description={isAdmin ? 'Créez des événements et suivez les inscriptions.' : 'Conférences, ateliers et événements du campus. Inscrivez-vous en un clic.'}
        actions={isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Nouvelle activité</Button>}
      />
      <Tabs className="mb-4" tabs={tabs} value={status} onChange={setStatus} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher une activité…" className="sm:w-64" />
        <Select className="sm:w-48" placeholder="Toutes catégories" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie" />
      </Toolbar>

      {loading && !data ? <SkeletonRows rows={6} /> : error ? <ErrorState message={error} onRetry={refresh} /> : !data.length ? (
        <EmptyState
          icon={Sparkles}
          title={status === 'registered' ? 'Vous n’êtes inscrit(e) à aucune activité' : 'Aucune activité'}
          action={status === 'registered' ? <Button onClick={() => setStatus('upcoming')}>Voir les activités à venir</Button> : isAdmin && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Créer une activité</Button>}
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((a) => (
            <li key={a.id} className={`group flex flex-col gap-3 py-4 sm:flex-row sm:items-center ${a.isPast ? 'opacity-70' : ''}`}>
              <button type="button" onClick={() => navigate(`/activities/${a.id}`)} className="flex min-w-0 flex-1 items-start gap-4 text-left">
                <div className="w-12 shrink-0 rounded-lg border border-line py-1 text-center">
                  <div className="text-[10px] font-semibold uppercase text-danger">{formatDate(a.date, { month: 'short' })}</div>
                  <div className="text-lg font-semibold leading-tight">{formatDate(a.date, { day: 'numeric' })}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium group-hover:underline">{a.title}</span>
                    <Badge>{a.category}</Badge>
                    {!a.registrationOpen && !a.isPast && <Badge tone="orange">Inscriptions fermées</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{a.description}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1"><Clock size={12} />{a.startTime} – {a.endTime}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={12} />{a.location}</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} />{a.registeredCount} / {a.capacity}</span>
                  </div>
                  <Meter className="mt-2 max-w-[220px]" value={a.registeredCount} max={a.capacity} tone={a.isFull ? 'red' : a.registeredCount / a.capacity > 0.8 ? 'orange' : 'brand'} />
                </div>
              </button>
              <div className="flex items-center gap-2 pl-16 sm:pl-0">
                {role === 'STUDENT' && <RegistrationButton activity={a} onChange={replace} size="sm" />}
                {isAdmin && (
                  <Dropdown
                    trigger={(p) => <Button {...p} size="icon-sm" variant="ghost" icon={MoreHorizontal} aria-label={`Actions pour ${a.title}`} />}
                    items={[
                      { label: 'Voir les inscrits', icon: Eye, onClick: () => navigate(`/activities/${a.id}`) },
                      { label: 'Modifier', icon: Pencil, onClick: () => setEditing(a) },
                      { divider: true },
                      { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setDeleting(a) },
                    ]}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <>
          <ActivityForm open={!!editing} activity={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => refresh({ silent: true })} />
          <ConfirmDialog
            open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del}
            title={`Supprimer « ${deleting?.title} » ?`}
            message={`${deleting?.registeredCount || 0} inscription(s) seront annulées et les étudiants notifiés.`}
            confirmLabel="Supprimer"
          />
        </>
      )}
    </>
  );
}
