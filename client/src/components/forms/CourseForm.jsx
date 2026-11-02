import { useEffect } from 'react';
import { api } from '../../lib/api.js';
import { useForm } from '../../lib/useForm.js';
import { useClassOptions, useProfessorOptions } from '../../lib/useOptions.js';
import { Modal, Button, Input, Select, Textarea } from '../ui/index.js';

const EMPTY = { code: '', title: '', description: '', coefficient: '2', credits: '4', semester: 'Semestre 1', classId: '', professorId: '' };

export function CourseForm({ open, onClose, course, onSaved }) {
  const classes = useClassOptions(open);
  const profs = useProfessorOptions(open);
  const f = useForm(EMPTY, {
    validate: (v) => ({
      code: !v.code.trim() && 'Le code est obligatoire.',
      title: v.title.trim().length < 3 && 'L’intitulé doit contenir au moins 3 caractères.',
      classId: !v.classId && 'Choisissez une classe.',
      coefficient: !(Number(v.coefficient) > 0) && 'Coefficient invalide.',
      credits: !(Number(v.credits) >= 0) && 'Crédits invalides.',
    }),
  });

  useEffect(() => {
    if (!open) return;
    f.reset(course ? {
      code: course.code, title: course.title, description: course.description || '', coefficient: String(course.coefficient),
      credits: String(course.credits), semester: course.semester, classId: course.classId, professorId: course.professorId || '',
    } : EMPTY);
  }, [open, course]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const res = await f.submit(async (v) => {
      const body = { ...v, coefficient: Number(v.coefficient), credits: Number(v.credits), professorId: v.professorId || null };
      const r = course ? await api.put(`/courses/${course.id}`, body) : await api.post('/courses', body);
      return r.data.data;
    }, { success: course ? 'Cours mis à jour.' : 'Cours créé. Les étudiants de la classe y sont inscrits.' });
    if (res) { onSaved?.(res); onClose(); }
  };

  return (
    <Modal
      open={open} onClose={onClose} busy={f.saving} size="lg"
      title={course ? 'Modifier le cours' : 'Nouveau cours'}
      description="Les étudiants de la classe choisie sont inscrits automatiquement."
      footer={<><Button onClick={onClose} disabled={f.saving}>Annuler</Button><Button variant="primary" type="submit" form="course-form" loading={f.saving}>{course ? 'Enregistrer' : 'Créer le cours'}</Button></>}
    >
      <form id="course-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <Input label="Code" required placeholder="INF205" value={f.values.code} onChange={f.bind('code')} error={f.errors.code} />
        <Input label="Intitulé" required value={f.values.title} onChange={f.bind('title')} error={f.errors.title} />
        <Select label="Classe" required placeholder="Choisir…" options={classes} value={f.values.classId} onChange={f.bind('classId')} error={f.errors.classId} />
        <Select label="Professeur" placeholder="Non assigné" options={profs} value={f.values.professorId} onChange={f.bind('professorId')} error={f.errors.professorId} />
        <Input label="Coefficient" required type="number" min="0.5" step="0.5" value={f.values.coefficient} onChange={f.bind('coefficient')} error={f.errors.coefficient} />
        <Input label="Crédits (ECTS)" required type="number" min="0" step="1" value={f.values.credits} onChange={f.bind('credits')} error={f.errors.credits} />
        <Select label="Semestre" options={[{ value: 'Semestre 1', label: 'Semestre 1' }, { value: 'Semestre 2', label: 'Semestre 2' }]} value={f.values.semester} onChange={f.bind('semester')} />
        <Textarea className="sm:col-span-2" label="Description" rows={3} value={f.values.description} onChange={f.bind('description')} error={f.errors.description} />
      </form>
    </Modal>
  );
}
