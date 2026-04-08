'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { OPERATIONS, PROPERTY_TYPES, BEDROOM_OPTIONS, SORT_OPTIONS } from '@vesta/shared/constants/properties';
import type { SearchFilters as Filters } from '@vesta/shared/types/search';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

export function SearchFilters({ current }: { current: Filters }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('pagina');
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="bg-white border-b border-border-light px-6 py-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Operation toggle — pill style */}
        <div className="flex rounded-full bg-surface-alt p-1">
          {OPERATIONS.map((op) => (
            <button
              key={op.value}
              onClick={() => update('op', op.value)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                current.operation === op.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-primary'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Property type */}
        <div className="relative">
          <select
            value={current.property_type ?? ''}
            onChange={(e) => update('tipo', e.target.value || null)}
            className="appearance-none rounded-full border border-border bg-white pl-4 pr-9 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Tipo</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>

        {/* Bedrooms */}
        <div className="relative">
          <select
            value={current.bedrooms_min ?? ''}
            onChange={(e) => update('dormitorios', e.target.value || null)}
            className="appearance-none rounded-full border border-border bg-white pl-4 pr-9 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Dormitorios</option>
            {BEDROOM_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>{b.label} dorm.</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>

        {/* Price range */}
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-white px-1 py-1">
          <input
            type="number"
            placeholder="UF min"
            defaultValue={current.price_min ?? ''}
            onBlur={(e) => update('precio_min', e.target.value || null)}
            className="w-20 rounded-full bg-transparent px-3 py-1 text-sm font-medium text-text-secondary placeholder:text-text-muted focus:outline-none"
          />
          <span className="text-text-muted text-xs">—</span>
          <input
            type="number"
            placeholder="UF max"
            defaultValue={current.price_max ?? ''}
            onBlur={(e) => update('precio_max', e.target.value || null)}
            className="w-20 rounded-full bg-transparent px-3 py-1 text-sm font-medium text-text-secondary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {/* Sort — pushed right */}
        <div className="relative ml-auto">
          <select
            value={current.sort_by ?? 'newest'}
            onChange={(e) => update('orden', e.target.value)}
            className="appearance-none rounded-full border border-border bg-white pl-4 pr-9 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>
      </div>
    </div>
  );
}
