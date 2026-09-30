"use client";

import { useState } from "react";
import { runDiscovery, type DiscoveryRunResult } from "@/lib/api";

const inputClass =
  "bg-paper-raised border border-line rounded-sm px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink";

export function DiscoveryPanel({
  industries,
  onDone,
}: {
  industries: Record<string, string>;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("PL");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [useOsm, setUseOsm] = useState(true);
  const [useGoogle, setUseGoogle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DiscoveryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstIndustry = Object.keys(industries)[0] ?? "";
  const selectedIndustry = industry || firstIndustry;

  async function submit() {
    if (!city || !selectedIndustry) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const sources = [useOsm && "osm", useGoogle && "google_places"].filter(Boolean) as string[];
      const res = await runDiscovery({ country, city, industry: selectedIndustry, sources });
      setResult(res);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-paper transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        Znajdź leady
      </button>

      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border border-line bg-paper-raised p-4">
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Kraj
            <input className={`${inputClass} w-16`} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Miasto
            <input className={`${inputClass} w-40`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="np. Kraków" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Branża
            <select className={inputClass} value={selectedIndustry} onChange={(e) => setIndustry(e.target.value)}>
              {Object.entries(industries).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 pb-1.5 text-sm">
            <input type="checkbox" checked={useOsm} onChange={(e) => setUseOsm(e.target.checked)} />
            OpenStreetMap
          </label>
          <label className="flex items-center gap-1.5 pb-1.5 text-sm">
            <input type="checkbox" checked={useGoogle} onChange={(e) => setUseGoogle(e.target.checked)} />
            Google Places
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !city}
            className="bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {busy ? "Szukam…" : "Szukaj"}
          </button>

          {result && (
            <p className="w-full text-sm text-ink-muted">
              Znaleziono {result.found}, dodano {result.created} nowych, pominięto {result.skipped_duplicate} duplikatów.
              {result.skipped_sources.length > 0 && ` Pominięte źródła: ${result.skipped_sources.join(", ")}.`}
            </p>
          )}
          {error && <p className="w-full text-sm text-signal">{error}</p>}
        </div>
      )}
    </div>
  );
}
