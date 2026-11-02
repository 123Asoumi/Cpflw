import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2, GraduationCap, UserSquare2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../lib/api.js';
import { Button } from '../components/ui/index.js';
import { LogoFull } from '../components/layout/Logo.jsx';

const DEMO = [
  { role: 'Étudiant', icon: GraduationCap, email: 'etudiant@campusflow.bj', password: 'Etudiant123!' },
  { role: 'Professeur', icon: UserSquare2, email: 'prof@campusflow.bj', password: 'Prof123!' },
  { role: 'Administrateur', icon: ShieldCheck, email: 'admin@campusflow.bj', password: 'Admin123!' },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const validate = (f) => {
    const e = {};
    if (!f.email.trim()) e.email = 'L’adresse e-mail est obligatoire.';
    else if (!EMAIL.test(f.email.trim())) e.email = 'Adresse e-mail invalide.';
    if (!f.password) e.password = 'Le mot de passe est obligatoire.';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setError(null);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      setSuccess(`Bienvenue, ${user.firstName} !`);
      toast.success(`Connexion réussie. Bienvenue, ${user.firstName} !`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Connexion impossible.'));
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => {
    const f = { ...form, [k]: e.target.value };
    setForm(f);
    if (errors[k]) setErrors(validate(f));
  };

  return (
    <div className="min-h-screen bg-brand-canvas flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoFull height={40} />
            <p className="mt-3 text-sm text-ink-soft">Academic life, made simple.</p>
          </div>

          <div className="rounded-xl border border-line bg-white p-6 shadow-soft">
            <h1 className="text-lg font-semibold">Connexion</h1>
            <p className="mt-0.5 mb-5 text-sm text-ink-soft">Accédez à votre espace académique.</p>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success" role="status">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {success}
              </div>
            )}

            <form onSubmit={submit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="label">Adresse e-mail</label>
                <input
                  id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')}
                  className={`input h-10 ${errors.email ? 'input-error' : ''}`} placeholder="vous@etablissement.bj"
                  aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} disabled={loading}
                />
                {errors.email && <p id="email-err" className="mt-1 text-xs text-danger">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="password" className="label">Mot de passe</label>
                <div className="relative">
                  <input
                    id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={set('password')}
                    className={`input h-10 pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••"
                    aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined} disabled={loading}
                  />
                  <button
                    type="button" onClick={() => setShow((s) => !s)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-muted hover:text-ink hover:bg-hover"
                    aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p id="pw-err" className="mt-1 text-xs text-danger">{errors.password}</p>}
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading} disabled={!!success}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
          </div>

          <div className="mt-6">
            <p className="section-title mb-2 text-center">Comptes de démonstration</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => { setForm({ email: d.email, password: d.password }); setErrors({}); setError(null); }}
                  className="flex flex-col items-center gap-1 rounded-lg border border-line bg-white px-2 py-2.5 text-xs text-ink-soft hover:bg-hover hover:text-ink"
                  title={`${d.email} / ${d.password}`}
                >
                  <d.icon size={16} strokeWidth={1.8} />
                  {d.role}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-ink-muted">Cliquez pour pré-remplir, puis « Se connecter ».</p>
          </div>
        </div>
      </div>
      <footer className="py-4 text-center text-xs text-ink-muted">© {new Date().getFullYear()} CampusFlow · Cotonou, Bénin</footer>
    </div>
  );
}
