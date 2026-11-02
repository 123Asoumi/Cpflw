import { useApi } from './useApi.js';

/** Select options loaded from the API (classes, professors, courses). */
export function useClassOptions(enabled = true) {
  const { data } = useApi('/classes', null, { enabled });
  return (data || []).map((c) => ({ value: c.id, label: c.name }));
}

export function useProfessorOptions(enabled = true) {
  const { data } = useApi('/professors', null, { enabled });
  return (data || []).map((p) => ({ value: p.id, label: `${p.fullName} — ${p.department}` }));
}

export function useCourseOptions(enabled = true) {
  const { data } = useApi('/courses', null, { enabled });
  return (data || []).map((c) => ({ value: c.id, label: `${c.code} — ${c.title}${c.className ? ` (${c.className})` : ''}` }));
}
