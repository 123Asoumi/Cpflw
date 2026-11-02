/** Page layout primitives (Notion-like document page). */
export function PageHeader({ icon: Icon, title, description, actions, children }) {
  return (
    <header className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {Icon && <Icon size={28} strokeWidth={1.5} className="mb-2 text-ink-soft" aria-hidden="true" />}
          <h1 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Section({ title, action, children, className = '', description }) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="text-xs text-ink-soft">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Notion "properties" list: label column + value column. */
export function Properties({ items }) {
  return (
    <dl className="grid grid-cols-[minmax(110px,160px)_1fr] gap-y-1.5 text-sm">
      {items.filter(Boolean).map(({ icon: Icon, label, value }) => (
        <div key={label} className="contents">
          <dt className="flex items-center gap-1.5 text-ink-soft py-0.5">{Icon && <Icon size={14} strokeWidth={1.8} />}{label}</dt>
          <dd className="py-0.5 min-w-0 break-words">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Card({ children, className = '', as: As = 'div', ...props }) {
  return <As className={`rounded-lg border border-line bg-white ${className}`} {...props}>{children}</As>;
}

/** Compact inline stat used instead of big KPI cards. */
export function StatLine({ items }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-line py-3 mb-8">
      {items.filter(Boolean).map((it) => (
        <div key={it.label} className="min-w-[90px]">
          <div className="text-xs text-ink-soft">{it.label}</div>
          <div className={`text-lg font-semibold ${it.tone || ''}`}>{it.value}</div>
          {it.hint && <div className="text-xs text-ink-muted">{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">{children}</div>;
}
