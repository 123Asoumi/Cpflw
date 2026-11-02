import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, UserPlus, BookPlus, CalendarPlus, Sparkles, AlertTriangle } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { api, errorMessage, fieldErrors } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  PageHeader, Section, StatLine, SkeletonRows, ErrorState, Button, Modal, Input, Textarea, Select, ConfirmDialog,
} from '../../components/ui/index.js';
import { AnnouncementList, ActivityFeed, ActivityMiniList } from '../../components/dashboard.jsx';
import { formatGrade, gradeTone } from '../../lib/format.js';
import { greeting } from '../../lib/format.js';

import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminOverview() {
  const { data, loading, error, refresh } = useApi('/dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [annOpen, setAnnOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  if (loading && !data) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const c = data.counts;

  const publish = async (e) => {
    e.preventDefault();
    setSaving(true); setErrors({});
    try {
      await api.post('/announcements', form);
      toast.success('Annonce publiée et notifiée aux destinataires.');
      setAnnOpen(false); setForm({ title: '', body: '', audience: 'ALL' });
      refresh({ silent: true });
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await api.delete(`/announcements/${toDelete.id}`);
      toast.success('Annonce supprimée.');
      refresh({ silent: true });
    } catch (err) { toast.error(errorMessage(err)); throw err; }
  };

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.firstName}`}
        description={`${data.settings.institutionName} · ${data.settings.currentSemester} ${data.settings.academicYear}`}
        actions={<Button variant="primary" icon={Megaphone} onClick={() => setAnnOpen(true)}>Publier une annonce</Button>}
      />

      <StatLine items={[
        { label: 'Étudiants', value: c.students },
        { label: 'Professeurs', value: c.professors },
        { label: 'Cours', value: c.courses },
        { label: 'Classes', value: c.classes },
        { label: 'Activités à venir', value: c.activities },
        { label: 'Moyenne établissement', value: formatGrade(data.institutionAverage), tone: gradeTone(data.institutionAverage) },
      ]} />

      <Section title="Actions rapides">
        <div className="flex flex-wrap gap-2">
          <Button icon={UserPlus} onClick={() => navigate('/students?new=1')}>Nouvel étudiant</Button>
          <Button icon={UserPlus} onClick={() => navigate('/professors?new=1')}>Nouveau professeur</Button>
          <Button icon={BookPlus} onClick={() => navigate('/courses?new=1')}>Nouveau cours</Button>
          <Button icon={CalendarPlus} onClick={() => navigate('/timetable?new=1')}>Nouveau créneau</Button>
          <Button icon={Sparkles} onClick={() => navigate('/activities?new=1')}>Nouvelle activité</Button>
        </div>
      </Section>

      {data.unassignedCourses.length > 0 && (
        <div className="mb-8 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-sm">
          <AlertTriangle size={16} className="mt-0.5 text-warning shrink-0" />
          <div>
            <span className="font-medium">{data.unassignedCourses.length} cours sans professeur : </span>
            {data.unassignedCourses.map((x, i) => (
              <span key={x.id}>{i > 0 && ', '}<Link className="underline" to={`/courses/${x.id}`}>{x.code}</Link></span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Section title="Annonces publiées">
            <AnnouncementList items={data.announcements} onDelete={setToDelete} />
          </Section>
          <Section title="Activité récente de l’établissement">
            <ActivityFeed items={data.recentActivity} />
          </Section>
        </div>
        <aside>
          <Section title="Activités à venir" action={<Link to="/activities" className="text-xs text-ink-soft hover:text-ink">Gérer →</Link>}>
            <ActivityMiniList items={data.upcomingActivities} />
          </Section>
          <Section title="Raccourcis">
            <ul className="text-sm space-y-1">
              <li><Link to="/reports" className="text-ink-soft hover:text-ink">Rapports et statistiques →</Link></li>
              <li><Link to="/grades" className="text-ink-soft hover:text-ink">Dossiers académiques →</Link></li>
              <li><Link to="/settings?tab=institution" className="text-ink-soft hover:text-ink">Paramètres de l’établissement →</Link></li>
            </ul>
          </Section>
        </aside>
      </div>

      <Modal
        open={annOpen}
        onClose={() => setAnnOpen(false)}
        busy={saving}
        title="Publier une annonce"
        description="Les destinataires reçoivent une notification interne."
        footer={<><Button onClick={() => setAnnOpen(false)} disabled={saving}>Annuler</Button><Button variant="primary" type="submit" form="ann-form" loading={saving}>Publier</Button></>}
      >
        <form id="ann-form" onSubmit={publish} className="space-y-3" noValidate>
          <Input label="Titre" required value={form.title} error={errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Message" required value={form.body} error={errors.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Select label="Public" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} options={[
            { value: 'ALL', label: 'Tout l’établissement' }, { value: 'STUDENT', label: 'Étudiants' }, { value: 'PROFESSOR', label: 'Professeurs' },
          ]} />
        </form>
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Supprimer l’annonce ?"
        message={`« ${toDelete?.title} » ne sera plus visible.`}
        confirmLabel="Supprimer"
      />
    </>
  );
}
