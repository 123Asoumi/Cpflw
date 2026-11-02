import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext(null);

/** Keeps the unread counter in sync (polls every 30 s and on demand). */
export function NotificationsProvider({ children }) {
  const { status } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const r = await api.get('/notifications/unread-count');
      setUnread(r.data.unread);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') { setUnread(0); return undefined; }
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [status, refreshCount]);

  return <Ctx.Provider value={{ unread, setUnread, refreshCount }}>{children}</Ctx.Provider>;
}

export const useNotifications = () => useContext(Ctx);
