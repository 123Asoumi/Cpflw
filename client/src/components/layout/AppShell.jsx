import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ChevronRight, ChevronsRight, Settings, LogOut, User } from 'lucide-react';
import { Sidebar } from './Sidebar.jsx';
import { NotificationsMenu } from './NotificationsMenu.jsx';
import { SearchDialog } from './SearchDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { CrumbProvider, useCrumbTitle } from '../../context/CrumbContext.jsx';
import { CRUMB_LABELS } from '../../config/navigation.js';
import { Avatar, Button, Dropdown } from '../ui/index.js';
import { ROLE_LABEL } from '../../lib/format.js';
import { LogoMark } from './Logo.jsx';

const COLLAPSE_KEY = 'campusflow.sidebar.collapsed';

function Breadcrumbs() {
  const { pathname } = useLocation();
  const title = useCrumbTitle();
  const { user } = useAuth();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [{ to: '/', label: 'Accueil' }];
  parts.forEach((p, i) => {
    const to = `/${parts.slice(0, i + 1).join('/')}`;
    let label = CRUMB_LABELS[p];
    if (p === 'grades' && user.role === 'PROFESSOR') label = 'Gestion des notes';
    if (!label) label = i === parts.length - 1 && title ? title : '…';
    crumbs.push({ to, label });
  });
  return (
    <nav aria-label="Fil d’Ariane" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm text-ink-soft min-w-0">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.to} className={`flex items-center gap-1 min-w-0 ${!last && i > 0 ? 'hidden sm:flex' : ''} ${i === 0 && crumbs.length > 1 ? 'hidden sm:flex' : ''}`}>
              {i > 0 && <ChevronRight size={13} className="text-ink-muted shrink-0" />}
              {last ? <span className="truncate text-ink" aria-current="page">{c.label}</span> : (
                <Link to={c.to} className="truncate rounded px-1 -mx-1 hover:bg-hover hover:text-ink">{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleCollapse = useCallback(() => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
    return !c;
  }), []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); toggleCollapse(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCollapse]);

  return (
    <CrumbProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-white/95 backdrop-blur px-3 sm:px-4">
            <Button variant="ghost" size="icon" className="md:hidden" icon={Menu} onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" />
            <Link to="/" className="md:hidden" aria-label="Accueil"><LogoMark size={22} /></Link>
            {collapsed && <Button variant="ghost" size="icon" className="hidden md:inline-flex" icon={ChevronsRight} onClick={toggleCollapse} aria-label="Déplier la barre latérale" title="Déplier (Ctrl+\)" />}
            <div className="min-w-0 flex-1"><Breadcrumbs /></div>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex h-8 w-56 lg:w-64 items-center gap-2 rounded-md border border-line px-2.5 text-sm text-ink-muted hover:bg-hover"
              aria-label="Rechercher"
            >
              <Search size={15} /> <span className="flex-1 text-left">Rechercher…</span> <span className="kbd">Ctrl K</span>
            </button>
            <Button variant="ghost" size="icon" className="sm:hidden" icon={Search} onClick={() => setSearchOpen(true)} aria-label="Rechercher" />
            <NotificationsMenu />
            <Dropdown
              width="w-56"
              trigger={(p) => (
                <button type="button" {...p} className="rounded-md p-1 hover:bg-hover" aria-label="Menu du profil">
                  <Avatar name={user.fullName} size={26} />
                </button>
              )}
            >
              {(close) => (
                <div>
                  <div className="px-2 py-2 border-b border-line mb-1">
                    <div className="text-sm font-medium truncate">{user.fullName}</div>
                    <div className="text-xs text-ink-soft truncate">{user.email} · {ROLE_LABEL[user.role]}</div>
                  </div>
                  {[
                    { label: 'Mon profil', icon: User, onClick: () => navigate('/settings') },
                    { label: 'Paramètres', icon: Settings, onClick: () => navigate('/settings?tab=security') },
                  ].map((it) => (
                    <button key={it.label} type="button" role="menuitem" onClick={() => { close(); it.onClick(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hover">
                      <it.icon size={15} className="text-ink-soft" /> {it.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-line" />
                  <button type="button" role="menuitem" onClick={() => { close(); logout(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-danger hover:bg-danger-soft">
                    <LogOut size={15} /> Se déconnecter
                  </button>
                </div>
              )}
            </Dropdown>
          </header>
          <main className="flex-1 min-w-0">
            <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-8 lg:px-16 py-6 sm:py-10">
              <Outlet />
            </div>
          </main>
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </CrumbProvider>
  );
}
