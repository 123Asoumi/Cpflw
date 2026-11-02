import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = { success: 'text-success', error: 'text-danger', info: 'text-brand' };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 items-stretch sm:items-end" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className="animate-pop-in flex items-start gap-2.5 rounded-lg bg-white shadow-pop px-3 py-2.5 text-sm sm:max-w-sm" role={t.type === 'error' ? 'alert' : 'status'}>
              <Icon size={16} className={`mt-0.5 shrink-0 ${tones[t.type]}`} />
              <span className="flex-1 text-ink">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="text-ink-muted hover:text-ink" aria-label="Fermer">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
