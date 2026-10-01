"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { RunLine } from "@/components/RunLine";
import { api, type Company, type CompanyStats, type Run } from "@/lib/api";
import { LEADS_CHANGED, notifyLeadsChanged } from "@/lib/events";
import { useCountUp, useIndustries } from "@/lib/hooks";
import { STATUS_LABELS, initial, plural, toneOf } from "@/lib/labels";

const ENRICH_BATCH = 50;

function today(): string {
  const s = new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Pulpit() {
  const industries = useIndustries();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [top, setTop] = useState<Company[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.stats(), api.companies({ limit: 4, min_score: 1 }), api.runs(undefined, 5)])
      .then(([s, t, r]) => {
        setStats(s);
        setTop(t);
        setRuns(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(LEADS_CHANGED, load);
    return () => window.removeEventListener(LEADS_CHANGED, load);
  }, [load]);

  const ready = useCountUp(stats?.ready);
  const total = useCountUp(stats?.total);
  const enriched = useCountUp(stats?.enriched);
  const awaiting = useCountUp(stats?.awaiting_enrichment);

  const none = stats?.by_status.none ?? 0;
  const outdated = stats?.by_status.outdated ?? 0;
  const dead = stats?.by_status.dead ?? 0;
  const segSum = none + outdated + dead || 1;

  async function enrich() {
    setEnriching(true);
    setEnrichMsg(null);
    try {
      const res = await api.runEnrichment(ENRICH_BATCH);
      setEnrichMsg(`Wzbogacono ${res.processed} ${plural(res.processed, "firmę", "firmy", "firm")}.`);
      notifyLeadsChanged();
    } catch (e) {
      setEnrichMsg((e as Error).message);
    } finally {
      setEnriching(false);
    }
  }

  const waiting = stats?.awaiting_enrichment ?? 0;

  return (
    <>
      <Topbar />
      <div className="content">
        <div className="rise">
          <h1 className="title">Pulpit</h1>
          <p className="sub">
            {today()}.{" "}
            {stats
              ? stats.ready > 0
                ? `${stats.ready} ${plural(stats.ready, "firma czeka", "firmy czekają", "firm czeka")} na pierwszy kontakt.`
                : "Na razie nikt nie czeka na kontakt."
              : ""}
          </p>
        </div>

        {error && <div className="notice notice-error" style={{ marginTop: 20 }} role="alert">{error}</div>}

        <section className="panel rise d1 hero" style={{ marginTop: 28 }}>
          <div style={{ padding: "28px 30px" }}>
            <div className="muted" style={{ fontSize: 13.5, fontWeight: 500 }}>Gotowe do kontaktu</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
              <span className="num" style={{ fontSize: 68, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{ready}</span>
              <span className="muted" style={{ fontSize: 14 }}>z <span className="num">{total}</span> firm w rejestrze</span>
            </div>
            <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--mute-soft)", marginTop: 24, gap: 3 }}>
              {none > 0 && <span className="fill" style={{ width: `${(none / segSum) * 100}%`, background: "var(--accent)" }} />}
              {outdated > 0 && <span className="fill" style={{ width: `${(outdated / segSum) * 100}%`, background: "var(--accent-2)", animationDelay: ".55s" }} />}
              {dead > 0 && <span className="fill" style={{ width: `${(dead / segSum) * 100}%`, background: "#8C3F12", animationDelay: ".65s" }} />}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 14, fontSize: 13 }} className="muted">
              <Legend color="var(--accent)" label="Brak strony" value={none} />
              <Legend color="var(--accent-2)" label="Przestarzała strona" value={outdated} />
              <Legend color="#8C3F12" label="Nie działa" value={dead} />
            </div>
          </div>
          <div className="hero-side">
            <div>
              <Metric label="Wzbogacone" value={<b className="num" style={{ fontWeight: 600 }}>{enriched}</b>} />
              <Metric label="Czeka na ocenę" value={<b className="num" style={{ fontWeight: 600 }}>{awaiting}</b>} />
              <Metric label="Wysłane dziś" value={<span className="faint">po fazie 4</span>} />
              <Metric label="Odpowiedzi" value={<span className="faint">po fazie 4</span>} last />
            </div>
            <div>
              {stats && stats.total === 0 ? (
                <Link href="/znajdz" className="btn btn-primary" style={{ width: "100%" }}>Znajdź pierwsze leady</Link>
              ) : (
                <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={enrich} disabled={enriching || waiting === 0}>
                  {enriching
                    ? "Sprawdzam strony…"
                    : waiting === 0
                      ? "Wszystko wzbogacone"
                      : `Wzbogać ${Math.min(ENRICH_BATCH, waiting)} z ${waiting} czekających`}
                </button>
              )}
              {enrichMsg && <p className="muted" role="status" style={{ fontSize: 12.5, margin: "8px 0 0", textAlign: "center" }}>{enrichMsg}</p>}
            </div>
          </div>
        </section>

        <div className="grid-2" style={{ marginTop: 20 }}>
          <section className="panel rise d2" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 12px" }}>
              <h2 className="h2">Do kontaktu w pierwszej kolejności</h2>
              <Link href="/leady" className="btn btn-quiet btn-sm">Cały rejestr</Link>
            </div>
            {top.length === 0 ? (
              <p className="muted" style={{ fontSize: 13.5, padding: "4px 20px 22px", margin: 0 }}>
                Gdy wzbogacisz firmy, najlepiej ocenione pojawią się tutaj.
              </p>
            ) : (
              <div>
                {top.map((c) => {
                  const tone = toneOf(c);
                  return (
                    <Link key={c.id} href={`/leady/${c.id}`} className="lead">
                      <span className={`mono mono-${tone}`}>{initial(c.name)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                        <span className="muted" style={{ display: "block", fontSize: 13, marginTop: 2 }}>
                          {industries[c.industry ?? ""] ?? c.industry ?? "Firma"}{c.city ? `, ${c.city}` : ""}
                        </span>
                      </span>
                      <span className={`pill pill-${tone}`}>{STATUS_LABELS[c.website_status]}</span>
                      <b className="num" style={{ width: 28, textAlign: "right", fontWeight: 600 }}>{Math.round(c.score ?? 0)}</b>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel rise d3" style={{ padding: "18px 22px 6px" }}>
            <h2 className="h2" style={{ marginBottom: 18 }}>Aktywność</h2>
            {runs.length === 0 ? (
              <p className="muted" style={{ fontSize: 13.5, margin: "0 0 16px" }}>Tu pojawi się historia wyszukiwań i wzbogaceń.</p>
            ) : (
              runs.map((r, i) => (
                <div className="tl" key={r.id}>
                  <span className={i === 0 ? "live" : "tl-dot"} />
                  <RunLine run={r} industries={industries} />
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />
      {label} <b className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{value}</b>
    </span>
  );
}

function Metric({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: last ? 0 : "1px solid var(--line)", fontSize: 14 }}>
      <span className="muted">{label}</span>
      {value}
    </div>
  );
}
