import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Check, Trash2, Circle, RefreshCw } from 'lucide-react';
import { useApi } from '../lib/useApi.js';
import { api, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { relativeTime, formatDate } from '../lib/format.js';
import { PageHeader, Tabs, Button, EmptyState, ErrorState, SkeletonRows, Toolbar } from '../components/ui/index.js';
import { NOTIF_ICONS } from '../components/layout/NotificationsMenu.jsx';
import { Info } from 'lucide-react';

const TYPE_LABEL = { GRADE: 'Notes', TIMETABLE: 'Emploi du temps', ACTIVITY: 'Activités', ANNOUNCEMENT: 'Annonces', COURSE: 'Cours', INFO: 'Information' };

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const { data, meta, loading, error, refresh, setData } = useApi('/notifications', { filter });
  const { setUnread, refreshCount } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();

  const mark = async (n, read = true) => {
    try {
      await api.patch(`/notifications/${n.id}/read`, { read });
      setData((xs) => (filter === 'unread' && read ? xs.filter((x) => x.id !== n.id) : xs.map((x) => (x.id === n.id ? { ...x, read } : x))));
      refreshCount();
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const remove = async (n) => {
    try {
      await api.delete(`/notifications/${n.id}`);
      setData((xs) => xs.filter((x) => x.id !== n.id));
      refreshCount();
      toast.success('Notification supprimée.');
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const readAll = async () => {
    try {
      const r = await api.patch('/notifications/read-all');
      setUnread(0);
      toast.success(`${r.data.updated} notification(s) marquée(s) comme lue(s).`);
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const open = async (n) => {
    if (!n.read) await mark(n, true);
    if (n.link) navigate(n.link);
  };

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Notes publiées, changements d’emploi du temps, activités et annonces."
        actions={<Button icon={CheckCheck} onClick={readAll} disabled={!meta?.unread}>Tout marquer comme lu</Button>}
      />
      <Toolbar>
        <Tabs
          className="flex-1"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'Toutes', count: meta?.total },
            { value: 'unread', label: 'Non lues', count: meta?.unread },
          ]}
        />
        <Button variant="ghost" size="icon" icon={RefreshCw} onClick={() => refresh()} aria-label="Actualiser" />
      </Toolbar>

      {loading && !data ? <SkeletonRows rows={6} /> : error ? <ErrorState message={error} onRetry={refresh} /> : !data.length ? (
        <EmptyState icon={Bell} title={filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'} message="Vous serez notifié(e) ici des événements qui vous concernent." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((n) => {
            const Icon = NOTIF_ICONS[n.type] || Info;
            return (
              <li key={n.id} className={`group flex items-start gap-3 px-1 py-3 ${n.read ? '' : 'bg-brand-sky/20'}`}>
                <Icon size={17} strokeWidth={1.8} className="mt-0.5 shrink-0 text-ink-soft" />
                <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {!n.read && <Circle size={7} className="fill-brand text-brand shrink-0" aria-label="Non lue" />}
                    <span className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</span>
                  </div>
                  <p className="text-sm text-ink-soft">{n.message}</p>
                  <p className="mt-0.5 text-xs text-ink-muted" title={formatDate(n.createdAt, { dateStyle: 'full' })}>{TYPE_LABEL[n.type]} · {relativeTime(n.createdAt)}</p>
                </button>
                <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <Button size="icon-sm" variant="ghost" icon={n.read ? Circle : Check} onClick={() => mark(n, !n.read)} aria-label={n.read ? 'Marquer comme non lue' : 'Marquer comme lue'} title={n.read ? 'Marquer comme non lue' : 'Marquer comme lue'} />
                  <Button size="icon-sm" variant="danger-ghost" icon={Trash2} onClick={() => remove(n)} aria-label="Supprimer" title="Supprimer" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
