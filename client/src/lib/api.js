import axios from 'axios';

const TOKEN_KEY = 'campusflow.token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) onUnauthorized();
    return Promise.reject(err);
  },
);

/** Human-readable error message from an axios error. */
export function errorMessage(err, fallback = 'Une erreur est survenue.') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre.';
  if (err?.message === 'Network Error') return 'Impossible de joindre le serveur. Vérifiez que l’API est démarrée.';
  return fallback;
}

/** Field-level errors from the API (validation). */
export const fieldErrors = (err) => err?.response?.data?.details || {};
