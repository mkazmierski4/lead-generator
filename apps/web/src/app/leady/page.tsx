"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { LeadRow } from "@/components/LeadRow";
import { Topbar } from "@/components/Topbar";
import { IconDownload, IconEmpty, IconPlus, IconRefresh } from "@/components/icons";
import { api, type Company, type CompanyStats, type WebsiteStatus } from "@/lib/api";
import { notifyLeadsChanged } from "@/lib/events";
import { useIndustries } from "@/lib/hooks";
import { STATUS_TABS, plural } from "@/lib/labels";

const PAGE_SIZE = 30;
type Tab = WebsiteStatus | "all";

export default function LeadyPage() {
  return (
    <Suspense fallback={<Topbar />}>
      <Leady />
    </Suspense>
  );
}

function Leady() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const industries = useIndustries();

  const [tab, setTab] = useState<Tab>("all");
  const [industry, setIndustry] = useState("");
  const [rows, setRows] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filters = useCallback(
    (offset: number) => ({
      q: q || undefined,
      industry: industry || undefined,
      website_status: tab === "all" ? undefined : tab,
      limit: PAGE_SIZE,
      offset,
    }),
    [q, industry, tab]
  );

  const load = useCallback(
    async (append = false, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const [list, s] = await Promise.all([
          api.companies(filters(offset)),
          append ? Promise.resolve(null) : api.stats({ q: q || undefined, industry: industry || undefined }),
        ]);
        setRows((prev) => (append ? [...prev, ...list] : list));
        if (s) setStats(s);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [filters, q, industry]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standardowy fetch przy zmianie filtrów
    load();
  }, [load]);

  const tabCount = (key: Tab) => (stats ? (key === "all" ? stats.total : stats.by_status[key]) : null);
  const currentTotal = tabCount(tab) ?? 0;

  async function enrich() {
    setEnriching(true);
    setNotice(null);
    try {
      const res = await api.runEnrichment(50);
      setNotice(res.processed > 0 ? `Wzbogacono ${res.processed} ${plural(res.processed, "firmę", "firmy", "firm")}.` : "Wszystkie firmy są już wzbogacone.");
      notifyLeadsChanged();
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setEnriching(false);
    }
  }

  async function exclude(id: string) {
    try {
      await api.exclude(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setOpen(null);
      notifyLeadsChanged();
      const s = await api.stats({ q: q || undefined, industry: industry || undefined });
      setStats(s);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  return (
    <>
      <Topbar />
      <div className="content">
        <div className="rise" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <h1 className="title">Leady</h1>
            <p className="sub">Kliknij firmę, żeby zobaczyć, skąd wziął się jej wynik.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              className="btn btn-quiet"
              href={api.exportCsvUrl({ q: q || undefined, industry: industry || undefined, website_status: tab === "all" ? undefined : tab })}
            >
              <IconDownload size={16} />Eksportuj CSV
            </a>
            <button type="button" className="btn btn-ghost" onClick={enrich} disabled={enriching}>
              <IconRefresh size={16} />{enriching ? "Sprawdzam strony…" : "Wzbogać nowe"}
            </button>
            <Link href="/znajdz" className="btn btn-primary"><IconPlus size={16} />Znajdź leady</Link>
          </div>
        </div>

        <div className="rise d1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", margin: "26px 0 16px" }}>
          <div className="seg" role="tablist" aria-label="Status strony">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? "seg-b on" : "seg-b"}
                onClick={() => {
                  setTab(t.key);
                  setOpen(null);
                }}
              >
                {t.label}
                {tabCount(t.key) !== null && <span className="seg-c">{tabCount(t.key)}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {q && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push("/leady")} aria-label={`Wyczyść wyszukiwanie: ${q}`}>
                „{q}” <span aria-hidden="true">×</span>
              </button>
            )}
            <select className="input select" value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Branża">
              <option value="">Wszystkie branże</option>
              {Object.entries(industries).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {notice && <div className="notice" role="status" style={{ marginBottom: 14 }}>{notice}</div>}
        {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 14 }}>{error}</div>}

        <section className="panel rise d2" style={{ overflow: "hidden" }}>
          {rows.length > 0 ? (
            <div className="list">
              {rows.map((c) => (
                <LeadRow
                  key={c.id}
                  company={c}
                  industryLabel={industries[c.industry ?? ""] ?? c.industry ?? "Firma"}
                  open={open === c.id}
                  onToggle={() => setOpen(open === c.id ? null : c.id)}
                  onExclude={exclude}
                />
              ))}
            </div>
          ) : (
            !loading && (
              <div className="empty">
                <div className="empty-icon"><IconEmpty size={22} /></div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{q ? `Nic nie pasuje do „${q}”` : "Na razie nic tu nie ma"}</div>
                <p className="muted" style={{ fontSize: 14, maxWidth: 400, margin: "6px auto 18px", lineHeight: 1.5 }}>
                  {q
                    ? "Spróbuj innej nazwy albo miasta."
                    : tab === "all"
                      ? "Rejestr jest pusty. Zacznij od wyszukania firm w wybranym mieście."
                      : "W tym widoku nie ma jeszcze firm. Pojawią się po kolejnych wyszukiwaniach i wzbogaceniu."}
                </p>
                <Link href="/znajdz" className="btn btn-ghost">Znajdź leady</Link>
              </div>
            )
          )}
          {loading && rows.length === 0 && <p className="muted" style={{ padding: 24, margin: 0, fontSize: 14 }}>Wczytuję…</p>}
          {rows.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px", borderTop: "1px solid var(--line)", background: "var(--sheet)" }}>
              <span className="muted num" style={{ fontSize: 13 }}>Pokazano {rows.length} z {currentTotal}</span>
              {rows.length < currentTotal && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => load(true, rows.length)} disabled={loading}>
                  {loading ? "Wczytuję…" : "Pokaż więcej"}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
