import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api.js';

/**
 * GET hook with loading/error/refresh.
 * const { data, loading, error, refresh, setData } = useApi('/courses', { q });
 */
export function useApi(url, params, { enabled = true, select = (r) => r.data } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params || {});
  const reqId = useRef(0);
  const selectRef = useRef(select);
  selectRef.current = select;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!url || !enabled) return;
    const id = ++reqId.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id !== reqId.current) return;
      setData(selectRef.current(res.data));
      setMeta(res.data);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(errorMessage(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [url, key, enabled]);

  useEffect(() => { load(); }, [load]);

  return { data, meta, loading, error, refresh: load, setData };
}

/** Debounce a value (used for search inputs). */
export function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
