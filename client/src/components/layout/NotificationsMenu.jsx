import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, GraduationCap, CalendarDays, Sparkles, Megaphone, BookOpen, Info } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { relativeTime } from '../../lib/format.js';
import { Button, Spinner, EmptyState, ErrorState } from '../ui/index.js';

export const NOTIF_ICONS = { GRADE: GraduationCap, TIMETABLE: CalendarDays, ACTIVITY: Sparkles, ANNOUNCEMENT: Megaphone, COURSE: BookOpen, INFO: Info };

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { unread, setUnread } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();
  const root = useRef(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.get('/notifications', { params: { limit: 8 } });
      setItems(r.data.data); setUnread(r.data.unread);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openItem = async (n) => {
    if (!n.read) {
      try { await api.patch(`/notifications/${n.id}/read`); setUnread((u) => Math.max(0, u - 1)); } catch { /* non-blocking */ }
    }
    setOpen(false);
    navigate(n.link || '/notifications');
  };

  const readAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems((xs) => xs.map((x) => ({ ...x, read: true })));
      setUnread(0);
      toast.success('Toutes les notifications sont marquées comme lues.');
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <div className="relative" ref={root}>
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`} aria-expanded={open} className="relative">
        <Bell size={17} strokeWidth={1.8} />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[15px] h-[15px] rounded-full bg-danger px-1 text-[9px] font-semibold leading-[15px] text-white">{unread > 9 ? '9+' : unread}</span>}
      </Button>
      {open && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-12 sm:top-auto sm:mt-1 z-40 sm:w-[380px] rounded-lg bg-white shadow-pop animate-pop-in">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line">
            <span className="text-sm font-semibold">Notifications</span>
            <Button size="sm" variant="ghost" icon={CheckCheck} onClick={readAll} disabled={!unread}>Tout marquer comme lu</Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            {loading && !items ? <Spinner /> : error ? <ErrorState message={error} onRetry={load} /> : !items?.length ? (
              <EmptyState icon={Bell} title="Aucune notification" message="Vous êtes à jour." />
            ) : items.map((n) => {
              const Icon = NOTIF_ICONS[n.type] || Info;
              return (
                <button key={n.id} type="button" onClick={() => openItem(n)} className="flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-hover border-b border-line last:border-0">
                  <Icon size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-ink-soft" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.read ? 'text-ink-soft' : 'text-ink font-medium'}`}>{n.title}</span>
                    <span className="block text-xs text-ink-soft line-clamp-2">{n.message}</span>
                    <span className="block mt-0.5 text-[11px] text-ink-muted">{relativeTime(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Non lue" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-line p-1">
            <button type="button" onClick={() => { setOpen(false); navigate('/notifications'); }} className="w-full rounded px-2 py-1.5 text-sm text-ink-soft hover:bg-hover hover:text-ink">
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
