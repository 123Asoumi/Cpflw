import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Sparkles, Users, UserSquare2, Layers, Loader2, CornerDownLeft } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useDebounced } from '../../lib/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { NAV } from '../../config/navigation.js';

const ICONS = { course: BookOpen, activity: Sparkles, student: Users, professor: UserSquare2, class: Layers };
const TYPE_LABEL = { course: 'Cours', activity: 'Activité', student: 'Étudiant', professor: 'Professeur', class: 'Classe', page: 'Page' };

/** Global search palette (Ctrl/⌘ + K). */
export function SearchDialog({ open, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const dq = useDebounced(q, 200);
  const navigate = useNavigate();
  const { user } = useAuth();
  const input = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setResults([]); setActive(0); setTimeout(() => input.current?.focus(), 10); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const pages = (NAV[user.role] || []).filter((p) => !dq || p.label.toLowerCase().includes(dq.toLowerCase()))
      .map((p) => ({ type: 'page', id: p.to, title: p.label, link: p.to, icon: p.icon }));
    if (dq.trim().length < 2) { setResults(pages); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.get('/search', { params: { q: dq } })
      .then((r) => { if (!cancelled) { setResults([...pages, ...r.data.data]); setActive(0); } })
      .catch(() => { if (!cancelled) setResults(pages); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dq, open, user.role]);

  if (!open) return null;

  const go = (r) => { onClose(); navigate(r.link); };
  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && results[active]) go(results[active]);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]" onKeyDown={onKey}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Recherche" className="relative w-full max-w-xl rounded-xl bg-white shadow-pop animate-pop-in overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-3">
          {loading ? <Loader2 size={17} className="animate-spin text-ink-muted" /> : <Search size={17} className="text-ink-muted" />}
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un cours, une activité, une personne…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
            aria-label="Rechercher"
          />
          <span className="kbd hidden sm:inline-flex">Échap</span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto scrollbar-thin p-1" role="listbox">
          {results.length === 0 && !loading && (
            <li className="px-3 py-8 text-center text-sm text-ink-soft">{dq.length < 2 ? 'Tapez au moins 2 caractères.' : 'Aucun résultat.'}</li>
          )}
          {results.map((r, i) => {
            const Icon = r.icon || ICONS[r.type] || Search;
            return (
              <li key={`${r.type}-${r.id}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left ${i === active ? 'bg-hover' : ''}`}
                >
                  <Icon size={16} strokeWidth={1.8} className="text-ink-soft shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-xs text-ink-soft">{r.subtitle}</span>}
                  </span>
                  <span className="text-[11px] text-ink-muted">{TYPE_LABEL[r.type]}</span>
                  {i === active && <CornerDownLeft size={13} className="text-ink-muted" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
