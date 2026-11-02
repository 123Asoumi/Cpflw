import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button.jsx';

/** Accessible modal: Esc closes, focus is trapped and restored. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }) {
  const panel = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const t = setTimeout(() => {
      const el = panel.current?.querySelector('[data-autofocus], input:not([type=hidden]), select, textarea, button:not([data-close])');
      el?.focus();
    }, 20);
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      lastFocus.current?.focus?.();
    };
  }, [open, onClose, busy]);

  if (!open) return null;
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-[10vh] sm:px-4">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`relative w-full ${widths[size]} max-h-[92vh] sm:max-h-[80vh] flex flex-col bg-white rounded-t-xl sm:rounded-xl shadow-pop animate-pop-in`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          <Button data-close variant="ghost" size="icon-sm" icon={X} onClick={onClose} disabled={busy} aria-label="Fermer" />
        </div>
        <div className="px-5 pb-4 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmation dialog. onConfirm may return a promise; the dialog shows a
 * loading state and closes when it resolves.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger = true }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch { /* caller shows the toast */ } finally { setBusy(false); }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      title={title}
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>Annuler</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={run} loading={busy} data-autofocus>{confirmLabel}</Button>
        </>
      )}
    >
      <div className="flex gap-3">
        {danger && <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />}
        <p className="text-sm text-ink-soft">{message}</p>
      </div>
    </Modal>
  );
}
