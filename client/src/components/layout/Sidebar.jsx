import { NavLink } from 'react-router-dom';
import { LogOut, ChevronsLeft, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { NAV, SETTINGS_ITEM } from '../../config/navigation.js';
import { LogoMark, LogoFull } from './Logo.jsx';
import { Avatar } from '../ui/index.js';
import { ROLE_LABEL } from '../../lib/format.js';

function NavItem({ item, collapsed, onNavigate, badge }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `group relative flex items-center gap-2.5 rounded-md px-2 h-8 text-sm transition-colors ${
        isActive ? 'bg-hover text-ink font-medium' : 'text-ink-soft hover:bg-hover hover:text-ink'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brand" aria-hidden="true" />}
          <Icon size={17} strokeWidth={isActive ? 2 : 1.7} className={isActive ? 'text-brand' : ''} />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {badge > 0 && (
            <span className={`${collapsed ? 'absolute top-0.5 right-0.5 h-2 w-2 p-0' : 'min-w-[18px] px-1'} rounded-full bg-brand text-[10px] leading-[18px] text-white text-center`}>
              {!collapsed && (badge > 99 ? '99+' : badge)}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, settings, logout } = useAuth();
  const { unread } = useNotifications();
  const items = NAV[user.role] || [];

  const content = (isMobile) => {
    const c = isMobile ? false : collapsed;
    return (
      <div className="flex h-full flex-col">
        <div className={`flex items-center gap-2 px-3 pt-3 pb-2 ${c ? 'justify-center' : ''}`}>
          {c ? <LogoMark size={28} /> : (
            <div className="min-w-0 flex-1">
              <LogoFull height={22} />
              <p className="mt-1.5 truncate text-xs text-ink-soft" title={settings?.institutionName}>{settings?.institutionName}</p>
            </div>
          )}
          {isMobile ? (
            <button type="button" onClick={onCloseMobile} className="rounded p-1 text-ink-soft hover:bg-hover" aria-label="Fermer le menu"><X size={18} /></button>
          ) : !c && (
            <button type="button" onClick={onToggleCollapse} className="rounded p-1 text-ink-muted hover:bg-hover hover:text-ink" aria-label="Réduire la barre latérale" title="Réduire (Ctrl+\)">
              <ChevronsLeft size={16} />
            </button>
          )}
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5" aria-label="Navigation principale">
          {items.map((it) => (
            <NavItem key={it.to} item={it} collapsed={c} onNavigate={isMobile ? onCloseMobile : undefined} badge={it.badge === 'unread' ? unread : 0} />
          ))}
        </nav>

        <div className="border-t border-line px-2 py-2 space-y-0.5">
          <NavItem item={SETTINGS_ITEM} collapsed={c} onNavigate={isMobile ? onCloseMobile : undefined} />
          <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${c ? 'flex-col' : ''}`}>
            <NavLink to="/settings" onClick={isMobile ? onCloseMobile : undefined} className="flex min-w-0 flex-1 items-center gap-2" title="Mon profil">
              <Avatar name={user.fullName} size={26} />
              {!c && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{user.fullName}</span>
                  <span className="block truncate text-xs text-ink-soft">{ROLE_LABEL[user.role]}</span>
                </span>
              )}
            </NavLink>
            <button type="button" onClick={logout} className="rounded p-1.5 text-ink-soft hover:bg-hover hover:text-danger" aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside className={`hidden md:block shrink-0 border-r border-line bg-side transition-[width] duration-200 ${collapsed ? 'w-[60px]' : 'w-[248px]'}`}>
        <div className="sticky top-0 h-screen">{content(false)}</div>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-side shadow-pop animate-slide-in" aria-label="Menu">
            {content(true)}
          </aside>
        </div>
      )}
    </>
  );
}
