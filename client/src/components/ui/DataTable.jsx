import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * Notion-style table with sorting and pagination.
 * columns: [{ key, header, render?(row), sortValue?(row), className?, hideBelow?: 'sm'|'md'|'lg', align? }]
 */
export function DataTable({ columns, rows, pageSize = 12, onRowClick, rowKey = (r) => r.id, initialSort, empty, dense = false }) {
  const [sort, setSort] = useState(initialSort || null); // { key, dir }
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [rows]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue || ((r) => r[col.key]);
    return [...rows].sort((a, b) => {
      const va = get(a); const vb = get(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggle = (col) => {
    if (col.sortable === false) return;
    setSort((s) => (s?.key !== col.key ? { key: col.key, dir: 'asc' } : s.dir === 'asc' ? { key: col.key, dir: 'desc' } : null));
  };

  const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

  if (!rows.length) return empty || null;

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin border-y border-line">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`table-th ${hide[c.hideBelow] || ''} ${c.align === 'right' ? 'text-right' : ''} ${c.headerClassName || ''}`} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable === false || !c.header ? c.header : (
                    <button type="button" onClick={() => toggle(c)} className={`inline-flex items-center gap-1 hover:text-ink ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      {c.header}
                      {sort?.key === c.key ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="opacity-40" />}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`group border-b border-line last:border-0 hover:bg-[#FAFAF9] ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`table-td ${dense ? 'py-1.5' : ''} ${hide[c.hideBelow] || ''} ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                    {c.render ? c.render(r) : r[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-ink-soft">
          <span>{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, sorted.length)} sur {sorted.length}</span>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" icon={ChevronLeft} disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Page précédente" />
            <span className="px-1">{current} / {pages}</span>
            <Button size="icon-sm" variant="ghost" icon={ChevronRight} disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Page suivante" />
          </div>
        </div>
      )}
    </div>
  );
}
