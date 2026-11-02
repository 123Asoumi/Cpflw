export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 border-b border-line overflow-x-auto scrollbar-thin ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`relative -mb-px flex items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-sm transition-colors ${active ? 'text-ink font-medium' : 'text-ink-soft hover:text-ink'}`}
          >
            {t.icon && <t.icon size={15} strokeWidth={1.8} />}
            {t.label}
            {t.count !== undefined && <span className="text-xs text-ink-muted">{t.count}</span>}
            {active && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-ink" />}
          </button>
        );
      })}
    </div>
  );
}
