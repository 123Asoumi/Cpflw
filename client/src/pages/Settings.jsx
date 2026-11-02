import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, User, Lock, Building2, Eye, EyeOff, LogOut, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { useForm } from '../lib/useForm.js';
import { ROLE_LABEL } from '../lib/format.js';
import { PageHeader, Tabs, Input, Button, Section, Properties, Avatar } from '../components/ui/index.js';

function ProfileTab() {
  const { user, setUser } = useAuth();
  const f = useForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone || '' }, {
    validate: (v) => ({
      firstName: v.firstName.trim().length < 2 && 'Au moins 2 caractères.',
      lastName: v.lastName.trim().length < 2 && 'Au moins 2 caractères.',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) && 'Adresse e-mail invalide.',
    }),
  });
  const save = async (e) => {
    e.preventDefault();
    const r = await f.submit((v) => api.put('/auth/profile', v), { success: 'Profil mis à jour.' });
    if (r) setUser(r.data.user);
  };
  const dirty = ['firstName', 'lastName', 'email', 'phone'].some((k) => (f.values[k] || '') !== (user[k] || ''));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form onSubmit={save} noValidate className="max-w-lg space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Prénom" required value={f.values.firstName} onChange={f.bind('firstName')} error={f.errors.firstName} />
          <Input label="Nom" required value={f.values.lastName} onChange={f.bind('lastName')} error={f.errors.lastName} />
        </div>
        <Input label="Adresse e-mail" required type="email" value={f.values.email} onChange={f.bind('email')} error={f.errors.email} />
        <Input label="Téléphone" type="tel" placeholder="+229 …" value={f.values.phone} onChange={f.bind('phone')} error={f.errors.phone} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="primary" loading={f.saving} disabled={!dirty}>Enregistrer</Button>
          <Button type="button" variant="ghost" disabled={!dirty || f.saving} onClick={() => f.reset({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone || '' })}>Réinitialiser</Button>
        </div>
      </form>
      <aside className="mt-8 lg:mt-0">
        <div className="mb-3 flex items-center gap-3"><Avatar name={user.fullName} size={40} /><div><div className="font-medium">{user.fullName}</div><div className="text-xs text-ink-soft">{ROLE_LABEL[user.role]}</div></div></div>
        <Properties items={[
          user.student && { label: 'Matricule', value: user.student.matricule },
          user.student && { label: 'Classe', value: user.student.className },
          user.professor && { label: 'Département', value: user.professor.department },
          user.professor && { label: 'Bureau', value: user.professor.office || '—' },
          { label: 'Dernière connexion', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : '—' },
        ]} />
      </aside>
    </div>
  );
}

function SecurityTab() {
  const { logout } = useAuth();
  const [show, setShow] = useState(false);
  const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };
  const f = useForm(EMPTY, {
    validate: (v) => ({
      currentPassword: !v.currentPassword && 'Obligatoire.',
      newPassword: v.newPassword.length < 8 && 'Au moins 8 caractères.',
      confirm: v.confirm !== v.newPassword && 'Les mots de passe ne correspondent pas.',
    }),
  });
  const save = async (e) => {
    e.preventDefault();
    const ok = await f.submit((v) => api.put('/auth/password', { currentPassword: v.currentPassword, newPassword: v.newPassword }), { success: 'Mot de passe modifié.' });
    if (ok) f.reset(EMPTY);
  };
  const type = show ? 'text' : 'password';
  return (
    <>
      <Section title="Changer le mot de passe">
        <form onSubmit={save} noValidate className="max-w-sm space-y-3">
          <Input label="Mot de passe actuel" required type={type} autoComplete="current-password" value={f.values.currentPassword} onChange={f.bind('currentPassword')} error={f.errors.currentPassword} />
          <Input label="Nouveau mot de passe" required type={type} autoComplete="new-password" hint="8 caractères minimum." value={f.values.newPassword} onChange={f.bind('newPassword')} error={f.errors.newPassword} />
          <Input label="Confirmer" required type={type} autoComplete="new-password" value={f.values.confirm} onChange={f.bind('confirm')} error={f.errors.confirm} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" variant="primary" loading={f.saving}>Mettre à jour</Button>
            <Button type="button" variant="ghost" icon={show ? EyeOff : Eye} onClick={() => setShow((s) => !s)}>{show ? 'Masquer' : 'Afficher'}</Button>
          </div>
        </form>
      </Section>
      <Section title="Session">
        <p className="mb-2 text-sm text-ink-soft">La déconnexion invalide votre jeton d’accès sur le serveur.</p>
        <Button variant="danger-ghost" icon={LogOut} onClick={logout}>Se déconnecter</Button>
      </Section>
    </>
  );
}

function InstitutionTab() {
  const { settings, setSettings } = useAuth();
  const initial = {
    institutionName: settings?.institutionName || '', institutionShortName: settings?.institutionShortName || '',
    academicYear: settings?.academicYear || '', currentSemester: settings?.currentSemester || '', city: settings?.city || '',
  };
  const f = useForm(initial);
  useEffect(() => { f.reset(initial); }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (e) => {
    e.preventDefault();
    const r = await f.submit((v) => api.put('/settings', v), { success: 'Paramètres de l’établissement enregistrés.' });
    if (r) setSettings(r.data.data);
  };
  return (
    <>
      <form onSubmit={save} noValidate className="max-w-lg space-y-3">
        <Input label="Nom de l’établissement" required value={f.values.institutionName} onChange={f.bind('institutionName')} error={f.errors.institutionName} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nom court" value={f.values.institutionShortName} onChange={f.bind('institutionShortName')} error={f.errors.institutionShortName} />
          <Input label="Ville" value={f.values.city} onChange={f.bind('city')} error={f.errors.city} />
          <Input label="Année académique" placeholder="2026-2027" value={f.values.academicYear} onChange={f.bind('academicYear')} error={f.errors.academicYear} />
          <Input label="Semestre en cours" value={f.values.currentSemester} onChange={f.bind('currentSemester')} error={f.errors.currentSemester} />
        </div>
        <Button type="submit" variant="primary" loading={f.saving}>Enregistrer</Button>
      </form>
      <div className="mt-8 flex max-w-lg items-start gap-2 rounded-lg bg-side px-3 py-2.5 text-xs text-ink-soft">
        <Database size={14} className="mt-0.5 shrink-0" />
        <span>Stockage actuel : mémoire du serveur + fichier JSON local (<code>server/data/store.json</code>). Aucune base de données n’est connectée pour le moment.</span>
      </div>
    </>
  );
}

export default function Settings() {
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';
  const tabs = [
    { value: 'profile', label: 'Profil', icon: User },
    { value: 'security', label: 'Sécurité', icon: Lock },
    role === 'ADMIN' && { value: 'institution', label: 'Établissement', icon: Building2 },
  ].filter(Boolean);
  return (
    <>
      <PageHeader icon={SettingsIcon} title="Paramètres" description="Gérez votre profil, votre sécurité et vos préférences." />
      <Tabs className="mb-6" tabs={tabs} value={tab} onChange={(t) => setParams({ tab: t })} />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'institution' && role === 'ADMIN' && <InstitutionTab />}
    </>
  );
}
