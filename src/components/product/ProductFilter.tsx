"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCow, faPaw } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

export type ProductFilters = {
  type?: "KAMBING" | "DOMBA" | "SAPI";
  purpose?: "QURBAN" | "AQIQAH" | "BOTH";
  minPrice?: number;
  maxPrice?: number;
  minWeight?: number;
  sort: "newest" | "price_asc" | "price_desc" | "weight_desc" | "popular";
};

const TYPES: Array<{ value: ProductFilters["type"]; label: string; icon?: typeof faPaw }> = [
  { value: undefined, label: "Semua" },
  { value: "KAMBING", label: "Kambing", icon: faPaw },
  { value: "DOMBA", label: "Domba", icon: faPaw },
  { value: "SAPI", label: "Sapi", icon: faCow },
];

const SORTS: Array<{ value: ProductFilters["sort"]; label: string }> = [
  { value: "popular", label: "Paling Populer" },
  { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga Termurah" },
  { value: "price_desc", label: "Harga Termahal" },
  { value: "weight_desc", label: "Bobot Terbesar" },
];

export default function ProductFilter({
  filters,
  onChange,
  resultCount,
}: {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  resultCount: number;
}) {
  const update = (patch: Partial<ProductFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter jenis hewan">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => update({ type: t.value })}
              aria-pressed={filters.type === t.value}
              className={cn(
                "btn-press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-4 text-xs font-semibold",
                filters.type === t.value
                  ? "bg-primary text-white"
                  : "bg-surface text-ink-muted shadow-subtle"
              )}
            >
              {t.icon && <FontAwesomeIcon icon={t.icon} className="h-3.5 w-3.5" aria-hidden="true" />}
              {t.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Urutkan"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as ProductFilters["sort"] })}
          className="h-9 shrink-0 rounded-pill bg-surface px-3 text-xs font-semibold text-ink shadow-subtle focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <details className="rounded-card bg-surface p-3 shadow-subtle">
        <summary className="cursor-pointer text-sm font-semibold">Filter Lanjutan</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium">
            Tujuan
            <select
              className="mt-1 h-11 w-full rounded-control border border-black/10 bg-surface px-2 text-sm"
              value={filters.purpose ?? ""}
              onChange={(e) =>
                update({
                  purpose: (e.target.value || undefined) as ProductFilters["purpose"],
                })
              }
            >
              <option value="">Semua</option>
              <option value="QURBAN">Qurban</option>
              <option value="AQIQAH">Aqiqah</option>
              <option value="BOTH">Qurban & Aqiqah</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Bobot min. (kg)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="cth. 25"
              className="mt-1 h-11 w-full rounded-control border border-black/10 bg-surface px-2 text-sm"
              value={filters.minWeight ?? ""}
              onChange={(e) =>
                update({ minWeight: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label className="text-xs font-medium">
            Harga min. (Rp)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="cth. 2000000"
              className="mt-1 h-11 w-full rounded-control border border-black/10 bg-surface px-2 text-sm"
              value={filters.minPrice ?? ""}
              onChange={(e) =>
                update({ minPrice: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label className="text-xs font-medium">
            Harga maks. (Rp)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="cth. 5000000"
              className="mt-1 h-11 w-full rounded-control border border-black/10 bg-surface px-2 text-sm"
              value={filters.maxPrice ?? ""}
              onChange={(e) =>
                update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
        </div>
      </details>

      <p className="text-xs text-ink-muted" role="status">
        {resultCount} hewan ditemukan
      </p>
    </div>
  );
}
