import { useState } from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { Button, ConfirmDialog } from './ui/index.js';

/** Student register / cancel button wired to the API. */
export function RegistrationButton({ activity, onChange, size = 'md' }) {
  const toast = useToast();
  const { refreshCount } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const register = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/activities/${activity.id}/register`);
      toast.success(`Inscription confirmée : ${activity.title}`);
      onChange?.(r.data.data);
      refreshCount();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const cancel = async () => {
    try {
      const r = await api.delete(`/activities/${activity.id}/register`);
      toast.success('Inscription annulée.');
      onChange?.(r.data.data);
      refreshCount();
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  if (activity.isRegistered) {
    return (
      <>
        <span className="inline-flex items-center gap-1">
          <span className="chip bg-success-soft text-success"><Check size={12} /> Inscrit(e)</span>
          {activity.canCancel && <Button size={size === 'md' ? 'sm' : size} variant="ghost" icon={X} onClick={(e) => { e.stopPropagation(); setConfirm(true); }}>Annuler</Button>}
        </span>
        <ConfirmDialog
          open={confirm} onClose={() => setConfirm(false)} onConfirm={cancel}
          title="Annuler votre inscription ?"
          message={`Votre place pour « ${activity.title} » sera libérée.`}
          confirmLabel="Annuler l’inscription"
        />
      </>
    );
  }
  if (activity.isPast) return <span className="chip bg-hover text-ink-soft">Terminée</span>;
  if (!activity.registrationOpen) return <span className="chip bg-hover text-ink-soft">Inscriptions fermées</span>;
  if (activity.isFull) return <span className="chip bg-danger-soft text-danger">Complet</span>;
  return (
    <Button size={size} variant="primary" icon={UserPlus} loading={busy} onClick={(e) => { e.stopPropagation(); register(); }}>
      S’inscrire
    </Button>
  );
}
