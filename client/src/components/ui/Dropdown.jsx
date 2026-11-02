import { useEffect, useRef, useState } from 'react';

/**
 * Minimal dropdown menu.
 * <Dropdown trigger={(props) => <Button {...props}/>} items={[{label, icon, onClick, danger}]} />
 */
export function Dropdown({ trigger, items = [], align = 'right', width = 'w-48', children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      {trigger({ onClick: (e) => { e.stopPropagation(); setOpen((o) => !o); }, 'aria-haspopup': 'menu', 'aria-expanded': open })}
      {open && (
        <div role="menu" className={`absolute z-40 mt-1 ${align === 'right' ? 'right-0' : 'left-0'} ${width} rounded-lg bg-white p-1 shadow-pop animate-pop-in`}>
          {children ? children(() => setOpen(false)) : items.filter(Boolean).map((it, i) => (it.divider ? <div key={i} className="my-1 border-t border-line" /> : (
            <button
              key={i}
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick?.(); }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-left hover:bg-hover ${it.danger ? 'text-danger' : 'text-ink'}`}
            >
              {it.icon && <it.icon size={15} strokeWidth={1.8} className={it.danger ? '' : 'text-ink-soft'} />}
              {it.label}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}
