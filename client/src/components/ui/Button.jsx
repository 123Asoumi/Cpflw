import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-hover disabled:bg-brand/50',
  secondary: 'bg-white text-ink border border-line hover:bg-hover disabled:text-ink-muted',
  ghost: 'text-ink-soft hover:bg-hover hover:text-ink disabled:text-ink-muted',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
  'danger-ghost': 'text-danger hover:bg-danger-soft disabled:opacity-50',
};
const SIZES = {
  sm: 'h-7 px-2 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-10 px-4 text-sm gap-2',
  icon: 'h-8 w-8 justify-center',
  'icon-sm': 'h-7 w-7 justify-center',
};

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading = false, className = '', children, type = 'button', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center rounded-md font-medium transition-colors whitespace-nowrap select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" /> : Icon && <Icon size={size === 'sm' || size === 'icon-sm' ? 14 : 16} strokeWidth={1.8} />}
      {children}
    </button>
  );
});
