import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../lib/api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(tokenStore.get() ? 'loading' : 'anonymous');

  const clear = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => { setUnauthorizedHandler(clear); }, [clear]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/auth/me')
      .then((r) => { setUser(r.data.user); setSettings(r.data.settings); setStatus('authenticated'); })
      .catch(() => clear());
  }, [clear]);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    tokenStore.set(r.data.token);
    setUser(r.data.user);
    setSettings(r.data.settings);
    setStatus('authenticated');
    return r.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
    clear();
  }, [clear]);

  const value = useMemo(() => ({
    user, settings, status, login, logout, setUser, setSettings,
    role: user?.role,
  }), [user, settings, status, login, logout]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
