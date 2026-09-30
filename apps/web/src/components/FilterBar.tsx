"use client";

import type { WebsiteStatus } from "@/lib/api";
import { WEBSITE_STATUS_LABELS } from "@/lib/labels";

export interface Filters {
  country: string;
  industry: string;
  website_status: WebsiteStatus | "";
  min_score: string;
}

const inputClass =
  "bg-paper-raised border border-line rounded-sm px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink";

export function FilterBar({
  filters,
  onChange,
  industries,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  industries: Record<string, string>;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Branża
        <select
          className={inputClass}
          value={filters.industry}
          onChange={(e) => set("industry", e.target.value)}
        >
          <option value="">wszystkie</option>
          {Object.entries(industries).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Status strony
        <select
          className={inputClass}
          value={filters.website_status}
          onChange={(e) => set("website_status", e.target.value as Filters["website_status"])}
        >
          <option value="">wszystkie</option>
          {Object.entries(WEBSITE_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Kraj
        <input
          className={`${inputClass} w-16`}
          value={filters.country}
          onChange={(e) => set("country", e.target.value.toUpperCase())}
          maxLength={2}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Min. wynik
        <input
          type="number"
          className={`${inputClass} w-20`}
          value={filters.min_score}
          onChange={(e) => set("min_score", e.target.value)}
          placeholder="—"
        />
      </label>
    </div>
  );
}
