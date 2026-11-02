import { useEffect } from 'react';
import { api } from '../../lib/api.js';
import { useForm } from '../../lib/useForm.js';
import { todayISO } from '../../lib/format.js';
import { Modal, Button, Input, Select, Textarea } from '../ui/index.js';

export const CATEGORIES = ['Conférence', 'Atelier', 'Compétition', 'Sport', 'Culture', 'Vie de campus'];
const EMPTY = { title: '', description: '', date: todayISO(), startTime: '14:00', endTime: '16:00', location: '', capacity: '30', category: 'Conférence', registrationOpen: true };

export function ActivityForm({ open, onClose, activity, onSaved }) {
  const f = useForm(EMPTY, {
    validate: (v) => ({
      title: v.title.trim().length < 3 && 'Le titre doit contenir au moins 3 caractères.',
      description: v.description.trim().length < 10 && 'La description doit contenir au moins 10 caractères.',
      location: !v.location.trim() && 'Le lieu est obligatoire.',
      capacity: !(Number(v.capacity) >= 1) && 'La capacité doit être au moins 1.',
      endTime: v.endTime <= v.startTime && 'Doit être après l’heure de début.',
    }),
  });

  useEffect(() => {
    if (!open) return;
    f.reset(activity ? {
      title: activity.title, description: activity.description, date: activity.date, startTime: activity.startTime, endTime: activity.endTime,
      location: activity.location, capacity: String(activity.capacity), category: activity.category, registrationOpen: activity.registrationOpen,
    } : EMPTY);
  }, [open, activity]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const res = await f.submit(async (v) => {
      const body = { ...v, capacity: Number(v.capacity) };
      const r = activity ? await api.put(`/activities/${activity.id}`, body) : await api.post('/activities', body);
      return r.data.data;
    }, { success: activity ? 'Activité mise à jour. Les inscrits sont notifiés.' : 'Activité créée. Les étudiants sont notifiés.' });
    if (res) { onSaved?.(res); onClose(); }
  };

  return (
    <Modal
      open={open} onClose={onClose} busy={f.saving} size="lg"
      title={activity ? 'Modifier l’activité' : 'Nouvelle activité'}
      footer={<><Button onClick={onClose} disabled={f.saving}>Annuler</Button><Button variant="primary" type="submit" form="activity-form" loading={f.saving}>{activity ? 'Enregistrer' : 'Créer l’activité'}</Button></>}
    >
      <form id="activity-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Titre" required value={f.values.title} onChange={f.bind('title')} error={f.errors.title} />
        <Textarea className="sm:col-span-2" label="Description" required rows={3} value={f.values.description} onChange={f.bind('description')} error={f.errors.description} />
        <Select label="Catégorie" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={f.values.category} onChange={f.bind('category')} />
        <Input label="Lieu" required value={f.values.location} onChange={f.bind('location')} error={f.errors.location} />
        <Input label="Date" required type="date" value={f.values.date} onChange={f.bind('date')} error={f.errors.date} />
        <Input label="Capacité" required type="number" min="1" value={f.values.capacity} onChange={f.bind('capacity')} error={f.errors.capacity} />
        <Input label="Début" required type="time" value={f.values.startTime} onChange={f.bind('startTime')} error={f.errors.startTime} />
        <Input label="Fin" required type="time" value={f.values.endTime} onChange={f.bind('endTime')} error={f.errors.endTime} />
        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={!!f.values.registrationOpen} onChange={f.bind('registrationOpen')} />
          Inscriptions ouvertes
        </label>
      </form>
    </Modal>
  );
}
