"use client";

import { useCallback, useEffect, useState } from "react";
import { DiscoveryPanel } from "@/components/DiscoveryPanel";
import { EnrichmentButton } from "@/components/EnrichmentButton";
import { FilterBar, type Filters } from "@/components/FilterBar";
import { LeadRow } from "@/components/LeadRow";
import { type Company, type CompanyFilters, exportCompaniesCsvUrl, fetchCompanies, fetchIndustries } from "@/lib/api";
import { isActionable } from "@/lib/labels";

const PAGE_SIZE = 50;

export default function Home() {
  const [industries, setIndustries] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Filters>({ country: "PL", industry: "", website_status: "", min_score: "" });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchIndustries()
      .then(setIndustries)
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const apiFilters: CompanyFilters = {
          country: filters.country || undefined,
          industry: filters.industry || undefined,
          website_status: filters.website_status || undefined,
          min_score: filters.min_score ? Number(filters.min_score) : undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        };
        const results = await fetchCompanies(apiFilters);
        setCompanies((prev) => (append ? [...prev, ...results] : results));
        setHasMore(results.length === PAGE_SIZE);
        setOffset(nextOffset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się pobrać leadów");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    // load() sets a loading flag before its first await -- standard "fetch on mount/filter change"
    // effect, just one the newer set-state-in-effect rule can't tell apart from an unsafe pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(0, false);
  }, [load]);

  const actionableCount = companies.filter((c) => isActionable(c.website_status, c.score)).length;
  const csvUrl = exportCompaniesCsvUrl({
    country: filters.country || undefined,
    industry: filters.industry || undefined,
    website_status: filters.website_status || undefined,
    min_score: filters.min_score ? Number(filters.min_score) : undefined,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-2xl font-medium">Rejestr leadów</h1>
        <div className="flex items-center gap-3">
          <DiscoveryPanel industries={industries} onDone={() => load(0, false)} />
          <EnrichmentButton onDone={() => load(0, false)} />
          <a href={csvUrl} className="text-sm text-ink-muted underline decoration-line underline-offset-2 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
            Eksportuj CSV
          </a>
        </div>
      </div>

      <div className="mb-6">
        <FilterBar filters={filters} onChange={setFilters} industries={industries} />
      </div>

      <p className="mb-4 text-sm text-ink-muted">
        {loading && companies.length === 0
          ? "Wczytuję…"
          : `Załadowano ${companies.length} firm, ${actionableCount} gotowych do kontaktu.`}
      </p>

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <div className="border-t border-line">
        {companies.map((c) => (
          <LeadRow key={c.id} company={c} industryLabel={industries[c.industry ?? ""] ?? c.industry ?? "—"} />
        ))}
        {!loading && companies.length === 0 && !error && (
          <p className="py-10 text-center text-sm text-ink-muted">
            Brak firm spełniających te filtry. Spróbuj poluzować kryteria albo znajdź nowe leady.
          </p>
        )}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => load(offset + PAGE_SIZE, true)}
            disabled={loading}
            className="border border-line px-4 py-1.5 text-sm text-ink-muted hover:border-ink hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {loading ? "Wczytuję…" : "Pokaż więcej"}
          </button>
        </div>
      )}
    </main>
  );
}
