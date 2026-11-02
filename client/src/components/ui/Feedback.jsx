import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { initials } from '../../lib/format.js';

export function Spinner({ label = 'Chargement…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-ink-soft ${className}`} role="status">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-hover ${className}`} />;
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="space-y-2 py-2" role="status" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {Icon && <div className="mb-3 rounded-lg bg-side p-2.5 text-ink-muted"><Icon size={20} strokeWidth={1.6} /></div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {message && <p className="mt-1 text-sm text-ink-soft max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <AlertCircle size={20} className="text-danger mb-2" />
      <p className="text-sm text-ink">{message || 'Impossible de charger les données.'}</p>
      {onRetry && <Button className="mt-3" size="sm" icon={RefreshCw} onClick={() => onRetry()}>Réessayer</Button>}
    </div>
  );
}

const BADGE = {
  gray: 'bg-hover text-ink-soft',
  blue: 'bg-brand-sky text-brand',
  green: 'bg-success-soft text-success',
  orange: 'bg-warning-soft text-[#B26F14]',
  red: 'bg-danger-soft text-danger',
  ink: 'bg-brand-ink text-white',
};
export function Badge({ tone = 'gray', children, className = '' }) {
  return <span className={`chip ${BADGE[tone]} ${className}`}>{children}</span>;
}

const AVATAR_TONES = ['bg-[#E3ECFF] text-[#2449D8]', 'bg-[#E3F3EC] text-[#16845B]', 'bg-[#FBF0E1] text-[#A2600E]', 'bg-[#F3E8FD] text-[#7A3EB8]', 'bg-[#FBE9E9] text-[#B53A3A]', 'bg-[#E8EEF3] text-[#3A5A73]'];
export function Avatar({ name = '', size = 28, className = '' }) {
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-semibold ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** Small horizontal bar (used in reports and capacity). */
export function Meter({ value, max = 100, tone = 'brand', className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = { brand: 'bg-brand', green: 'bg-success', orange: 'bg-warning', red: 'bg-danger' };
  return (
    <div className={`h-1.5 w-full rounded-full bg-hover overflow-hidden ${className}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
