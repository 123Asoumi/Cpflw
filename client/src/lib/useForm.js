import { useCallback, useState } from 'react';
import { errorMessage, fieldErrors } from './api.js';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Form state helper with API error mapping.
 * const f = useForm(initial);
 * <Input value={f.values.name} onChange={f.bind('name')} error={f.errors.name} />
 * f.submit(async (values) => api.post(...), { success: 'Créé.' })
 */
export function useForm(initial = {}, { validate } = {}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = useCallback((k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  }, []);

  const bind = (k) => (e) => set(k, e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e);

  const reset = useCallback((v = initial) => { setValues(v); setErrors({}); }, [initial]);

  const submit = async (fn, { success } = {}) => {
    const local = validate ? validate(values) : {};
    const clean = Object.fromEntries(Object.entries(local).filter(([, v]) => v));
    if (Object.keys(clean).length) { setErrors(clean); return false; }
    setSaving(true);
    setErrors({});
    try {
      const res = await fn(values);
      if (success) toast.success(success);
      return res ?? true;
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { values, setValues, errors, setErrors, saving, set, bind, reset, submit };
}
