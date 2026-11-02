import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useForm } from '../../lib/useForm.js';
import { useClassOptions } from '../../lib/useOptions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal, Button, Input, Select } from '../ui/index.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shown once after creation when the server generated the initial password. */
function InitialPassword({ info, onClose }) {
  const toast = useToast();
  return (
    <Modal open={!!info} onClose={onClose} size="sm" title="Compte créé" footer={<Button variant="primary" onClick={onClose}>Terminé</Button>}>
      <p className="text-sm text-ink-soft">Transmettez ces identifiants à la personne. Elle pourra changer son mot de passe dans Paramètres → Sécurité.</p>
      <div className="mt-3 rounded-md bg-side p-3 text-sm font-mono">
        <div>{info?.email}</div>
        <div>{info?.password}</div>
      </div>
      <Button size="sm" className="mt-2" icon={Copy} onClick={() => { navigator.clipboard?.writeText(`${info.email} / ${info.password}`); toast.success('Copié.'); }}>Copier</Button>
    </Modal>
  );
}

export function StudentForm({ open, onClose, student, onSaved }) {
  const classes = useClassOptions(open);
  const [created, setCreated] = useState(null);
  const EMPTY = { firstName: '', lastName: '', email: '', phone: '', classId: '', matricule: '', dateOfBirth: '', password: '' };
  const f = useForm(EMPTY, {
    validate: (v) => ({
      firstName: v.firstName.trim().length < 2 && 'Au moins 2 caractères.',
      lastName: v.lastName.trim().length < 2 && 'Au moins 2 caractères.',
      email: !EMAIL.test(v.email.trim()) && 'Adresse e-mail invalide.',
      classId: !v.classId && 'Choisissez une classe.',
      password: v.password && v.password.length < 8 && 'Au moins 8 caractères.',
    }),
  });
  useEffect(() => {
    if (!open) return;
    f.reset(student ? {
      firstName: student.user.firstName, lastName: student.user.lastName, email: student.email, phone: student.user.phone || '',
      classId: student.classId, matricule: student.matricule, dateOfBirth: student.dateOfBirth || '', password: '',
    } : EMPTY);
  }, [open, student]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const r = await f.submit(async (v) => {
      const body = { ...v };
      if (!body.password) delete body.password;
      if (!body.matricule) delete body.matricule;
      if (!body.dateOfBirth) delete body.dateOfBirth;
      return student ? api.put(`/students/${student.id}`, body) : api.post('/students', body);
    }, { success: student ? 'Fiche étudiant mise à jour.' : 'Étudiant créé et inscrit aux cours de sa classe.' });
    if (r) {
      onSaved?.(r.data.data);
      onClose();
      if (r.data.initialPassword) setCreated({ email: f.values.email, password: r.data.initialPassword });
    }
  };

  return (
    <>
      <Modal
        open={open} onClose={onClose} busy={f.saving} size="lg"
        title={student ? 'Modifier l’étudiant' : 'Nouvel étudiant'}
        description={student ? 'Changer de classe met à jour les inscriptions aux cours.' : 'L’étudiant est inscrit automatiquement aux cours de sa classe.'}
        footer={<><Button onClick={onClose} disabled={f.saving}>Annuler</Button><Button variant="primary" type="submit" form="student-form" loading={f.saving}>{student ? 'Enregistrer' : 'Créer l’étudiant'}</Button></>}
      >
        <form id="student-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
          <Input label="Prénom" required value={f.values.firstName} onChange={f.bind('firstName')} error={f.errors.firstName} />
          <Input label="Nom" required value={f.values.lastName} onChange={f.bind('lastName')} error={f.errors.lastName} />
          <Input label="E-mail" required type="email" value={f.values.email} onChange={f.bind('email')} error={f.errors.email} />
          <Input label="Téléphone" type="tel" value={f.values.phone} onChange={f.bind('phone')} error={f.errors.phone} />
          <Select label="Classe" required placeholder="Choisir…" options={classes} value={f.values.classId} onChange={f.bind('classId')} error={f.errors.classId} />
          <Input label="Matricule" placeholder={student ? '' : 'Généré automatiquement'} value={f.values.matricule} onChange={f.bind('matricule')} error={f.errors.matricule} />
          <Input label="Date de naissance" type="date" value={f.values.dateOfBirth} onChange={f.bind('dateOfBirth')} error={f.errors.dateOfBirth} />
          <Input label={student ? 'Nouveau mot de passe' : 'Mot de passe'} type="password" autoComplete="new-password" hint={student ? 'Laisser vide pour ne pas changer.' : 'Laisser vide : Etudiant123!'} value={f.values.password} onChange={f.bind('password')} error={f.errors.password} />
        </form>
      </Modal>
      <InitialPassword info={created} onClose={() => setCreated(null)} />
    </>
  );
}

export function ProfessorForm({ open, onClose, professor, onSaved }) {
  const [created, setCreated] = useState(null);
  const EMPTY = { title: 'Dr.', firstName: '', lastName: '', email: '', phone: '', department: '', office: '', password: '' };
  const f = useForm(EMPTY, {
    validate: (v) => ({
      firstName: v.firstName.trim().length < 2 && 'Au moins 2 caractères.',
      lastName: v.lastName.trim().length < 2 && 'Au moins 2 caractères.',
      email: !EMAIL.test(v.email.trim()) && 'Adresse e-mail invalide.',
      department: !v.department.trim() && 'Le département est obligatoire.',
      password: v.password && v.password.length < 8 && 'Au moins 8 caractères.',
    }),
  });
  useEffect(() => {
    if (!open) return;
    f.reset(professor ? {
      title: professor.title || 'M.', firstName: professor.user.firstName, lastName: professor.user.lastName, email: professor.email,
      phone: professor.user.phone || '', department: professor.department, office: professor.office || '', password: '',
    } : EMPTY);
  }, [open, professor]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const r = await f.submit(async (v) => {
      const body = { ...v };
      if (!body.password) delete body.password;
      return professor ? api.put(`/professors/${professor.id}`, body) : api.post('/professors', body);
    }, { success: professor ? 'Fiche professeur mise à jour.' : 'Professeur créé.' });
    if (r) {
      onSaved?.(r.data.data);
      onClose();
      if (r.data.initialPassword) setCreated({ email: f.values.email, password: r.data.initialPassword });
    }
  };

  return (
    <>
      <Modal
        open={open} onClose={onClose} busy={f.saving} size="lg"
        title={professor ? 'Modifier le professeur' : 'Nouveau professeur'}
        footer={<><Button onClick={onClose} disabled={f.saving}>Annuler</Button><Button variant="primary" type="submit" form="prof-form" loading={f.saving}>{professor ? 'Enregistrer' : 'Créer le professeur'}</Button></>}
      >
        <form id="prof-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
          <Select label="Titre" options={['M.', 'Mme', 'Dr.', 'Pr.'].map((t) => ({ value: t, label: t }))} value={f.values.title} onChange={f.bind('title')} />
          <Input label="Département" required placeholder="Informatique" value={f.values.department} onChange={f.bind('department')} error={f.errors.department} />
          <Input label="Prénom" required value={f.values.firstName} onChange={f.bind('firstName')} error={f.errors.firstName} />
          <Input label="Nom" required value={f.values.lastName} onChange={f.bind('lastName')} error={f.errors.lastName} />
          <Input label="E-mail" required type="email" value={f.values.email} onChange={f.bind('email')} error={f.errors.email} />
          <Input label="Téléphone" type="tel" value={f.values.phone} onChange={f.bind('phone')} error={f.errors.phone} />
          <Input label="Bureau" placeholder="Bâtiment A — Bureau 12" value={f.values.office} onChange={f.bind('office')} error={f.errors.office} />
          <Input label={professor ? 'Nouveau mot de passe' : 'Mot de passe'} type="password" autoComplete="new-password" hint={professor ? 'Laisser vide pour ne pas changer.' : 'Laisser vide : Prof123!'} value={f.values.password} onChange={f.bind('password')} error={f.errors.password} />
        </form>
      </Modal>
      <InitialPassword info={created} onClose={() => setCreated(null)} />
    </>
  );
}

export function ClassForm({ open, onClose, cls, onSaved }) {
  const EMPTY = { name: '', code: '', level: 'Licence 1', program: '', academicYear: '2026-2027' };
  const f = useForm(EMPTY, {
    validate: (v) => ({
      name: v.name.trim().length < 3 && 'Au moins 3 caractères.',
      code: v.code.trim().length < 2 && 'Au moins 2 caractères.',
      program: !v.program.trim() && 'La filière est obligatoire.',
    }),
  });
  useEffect(() => {
    if (open) f.reset(cls ? { name: cls.name, code: cls.code, level: cls.level, program: cls.program, academicYear: cls.academicYear } : EMPTY);
  }, [open, cls]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (e) => {
    e.preventDefault();
    const r = await f.submit((v) => (cls ? api.put(`/classes/${cls.id}`, v) : api.post('/classes', v)), { success: cls ? 'Classe mise à jour.' : 'Classe créée.' });
    if (r) { onSaved?.(r.data.data); onClose(); }
  };
  return (
    <Modal
      open={open} onClose={onClose} busy={f.saving}
      title={cls ? 'Modifier la classe' : 'Nouvelle classe'}
      footer={<><Button onClick={onClose} disabled={f.saving}>Annuler</Button><Button variant="primary" type="submit" form="class-form" loading={f.saving}>Enregistrer</Button></>}
    >
      <form id="class-form" onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Nom" required placeholder="Licence 3 Informatique" value={f.values.name} onChange={f.bind('name')} error={f.errors.name} />
        <Input label="Code" required placeholder="L3-INFO" value={f.values.code} onChange={f.bind('code')} error={f.errors.code} />
        <Select label="Niveau" options={['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'].map((x) => ({ value: x, label: x }))} value={f.values.level} onChange={f.bind('level')} />
        <Input label="Filière" required placeholder="Informatique" value={f.values.program} onChange={f.bind('program')} error={f.errors.program} />
        <Input label="Année académique" required value={f.values.academicYear} onChange={f.bind('academicYear')} error={f.errors.academicYear} />
      </form>
    </Modal>
  );
}
