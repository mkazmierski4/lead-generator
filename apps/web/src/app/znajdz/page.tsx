"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { describeRun } from "@/components/RunLine";
import { Topbar } from "@/components/Topbar";
import { IconAlert, IconCheck, IconPin, IconSearch, IndustryIcons } from "@/components/icons";
import { api, type DiscoveryRunResult, type Run, type SettingsStatus } from "@/lib/api";
import { notifyLeadsChanged } from "@/lib/events";
import { useIndustries } from "@/lib/hooks";
import { formatDateTime, plural } from "@/lib/labels";

type Phase = "idle" | "running" | "done" | "error";

export default function ZnajdzPage() {
  const industries = useIndustries();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("PL");
  const [industry, setIndustry] = useState("hairdresser");
  const [osm, setOsm] = useState(true);
  const [google, setGoogle] = useState(false);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<DiscoveryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const loadHistory = useCallback(() => {
    api.runs("discovery", 8).then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory();
    api.settingsStatus().then(setStatus).catch(() => {});
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [loadHistory]);

  const industryLabel = industries[industry] ?? "";
  const queryLabel = `${industryLabel.toLowerCase()}, ${city.trim() || "…"}`;
  const sources = [osm && "osm", google && status?.google_places && "google_places"].filter(Boolean) as string[];
  const canRun = city.trim().length > 0 && country.trim().length === 2 && sources.length > 0 && phase !== "running";

  const steps = [
    `Szukam lokalizacji: ${city.trim()}`,
    `Pobieram firmy z ${sources.includes("google_places") ? "OpenStreetMap i Google Places" : "OpenStreetMap"}`,
    "Usuwam duplikaty i zapisuję",
  ];

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!canRun) return;
    timers.current.forEach(clearTimeout);
    setPhase("running");
    setStep(0);
    setResult(null);
    setError(null);
    setLastQuery(queryLabel);
    // Kroki są orientacyjne -- API odpowiada jednym wynikiem, ale wyszukiwanie trwa kilka sekund.
    timers.current = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 3500)];
    try {
      const res = await api.runDiscovery({ country: country.trim().toUpperCase(), city: city.trim(), industry, sources });
      setResult(res);
      setPhase("done");
      notifyLeadsChanged();
      loadHistory();
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    } finally {
      timers.current.forEach(clearTimeout);
    }
  }

  const allSkipped = result && result.found === 0 && result.skipped_sources.length > 0;

  return (
    <>
      <Topbar />
      <div className="content">
        <div className="rise">
          <h1 className="title">Znajdź leady</h1>
          <p className="sub">Wybierz miejsce i branżę. Nowe firmy trafią do rejestru bez duplikatów.</p>
        </div>

        <div className="grid-2" style={{ marginTop: 28, gridTemplateColumns: "1.4fr 1fr" }}>
          <form className="panel rise d1" style={{ padding: 26 }} onSubmit={run}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 12 }}>
              <div>
                <label className="lbl" htmlFor="city">Miasto</label>
                <div className="field">
                  <IconPin />
                  <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="np. Kraków" autoComplete="off" />
                </div>
              </div>
              <div>
                <label className="lbl" htmlFor="country">Kraj</label>
                <div className="field">
                  <input id="country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} aria-describedby="country-hint" />
                </div>
              </div>
            </div>
            <span id="country-hint" className="faint" style={{ fontSize: 12, display: "block", marginTop: 6 }}>Kod kraju, np. PL, DE, GB.</span>

            <fieldset style={{ border: 0, margin: "22px 0 0", padding: 0 }}>
              <legend className="lbl">Branża</legend>
              <div className="tiles">
                {Object.entries(industries).map(([key, label]) => {
                  const Icon = IndustryIcons[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={industry === key ? "tile on" : "tile"}
                      aria-pressed={industry === key}
                      onClick={() => setIndustry(key)}
                    >
                      {Icon ? <Icon size={20} /> : <IconSearch size={20} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset style={{ border: 0, margin: "24px 0 0", padding: 0 }}>
              <legend className="lbl">Źródła</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="srow-box">
                  <button type="button" role="switch" aria-checked={osm} aria-label="OpenStreetMap" className={osm ? "switch on" : "switch"} onClick={() => setOsm(!osm)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>OpenStreetMap</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Darmowe, bez klucza. Dobre pokrycie małych miejscowości.</div>
                  </div>
                </div>
                <div className="srow-box">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={google && !!status?.google_places}
                    aria-label="Google Places"
                    className={google && status?.google_places ? "switch on" : "switch"}
                    disabled={!status?.google_places}
                    onClick={() => setGoogle(!google)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }} className={status?.google_places ? undefined : "muted"}>Google Places</div>
                    <div className={status?.google_places ? "muted" : "faint"} style={{ fontSize: 12.5, marginTop: 2 }}>
                      {status?.google_places ? "Więcej firm, płatne powyżej darmowego limitu." : "Wymaga klucza API."}
                    </div>
                  </div>
                  {!status?.google_places && <Link href="/ustawienia" className="btn btn-ghost btn-sm">Dodaj klucz</Link>}
                </div>
              </div>
            </fieldset>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 26, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" style={{ height: 46, padding: "0 22px", fontSize: 14.5 }} disabled={!canRun}>
                <IconSearch size={16} />
                {city.trim() ? `Szukaj: ${queryLabel}` : "Szukaj"}
              </button>
              <span className="muted" style={{ fontSize: 13 }}>
                {sources.length === 0 ? "Włącz przynajmniej jedno źródło." : "Zwykle trwa kilka sekund, duże miasta dłużej."}
              </span>
            </div>

            {phase === "running" && (
              <div className="run" role="status">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ fontWeight: 500 }}>{steps[step]}</span>
                  <span className="num muted">{step + 1} / 3</span>
                </div>
                <div className="indet" />
              </div>
            )}

            {phase === "error" && (
              <div className="run notice-error" role="alert" style={{ fontSize: 14 }}>
                Wyszukiwanie nie powiodło się: {error}
              </div>
            )}

            {phase === "done" && result && (
              <div className="run" role="status">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {allSkipped ? (
                    <span className="ok-badge" style={{ background: "var(--accent)" }}><IconAlert size={16} /></span>
                  ) : (
                    <span className="ok-badge"><IconCheck size={16} /></span>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{allSkipped ? `Nie udało się: ${lastQuery}` : `Gotowe: ${lastQuery}`}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {allSkipped
                        ? "Źródło nie odpowiedziało (publiczne API OpenStreetMap bywa przeciążone). Spróbuj za chwilę."
                        : result.created > 0
                          ? "Nowe firmy są już w rejestrze, jeszcze niesprawdzone."
                          : result.found === 0
                            ? "W tym miejscu nie znaleziono firm tej branży."
                            : "Wszystkie znalezione firmy były już w rejestrze."}
                    </div>
                  </div>
                </div>
                {!allSkipped && (
                  <>
                    <div style={{ display: "flex", gap: 36, margin: "18px 0 18px 48px" }}>
                      <div className="stat"><b>{result.found}</b><span>{plural(result.found, "znaleziona", "znalezione", "znalezionych")}</span></div>
                      <div className="stat"><b>{result.created}</b><span>{plural(result.created, "nowa", "nowe", "nowych")}</span></div>
                      <div className="stat"><b>{result.skipped_duplicate}</b><span>{plural(result.skipped_duplicate, "duplikat", "duplikaty", "duplikatów")}</span></div>
                    </div>
                    {result.created > 0 && (
                      <div style={{ display: "flex", gap: 8, marginLeft: 48 }}>
                        <Link href="/leady" className="btn btn-primary">Przejdź do rejestru</Link>
                      </div>
                    )}
                  </>
                )}
                {result.skipped_sources.length > 0 && !allSkipped && (
                  <p style={{ fontSize: 12.5, color: "var(--accent)", margin: "14px 0 0 48px" }}>
                    Pominięte źródła: {result.skipped_sources.map((s) => (s === "osm" ? "OpenStreetMap" : "Google Places")).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form>

          <section className="panel rise d2" style={{ overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 12px" }}><h2 className="h2">Ostatnie wyszukiwania</h2></div>
            {history.length === 0 ? (
              <p className="muted" style={{ fontSize: 13.5, padding: "0 20px 20px", margin: 0 }}>Jeszcze nic nie wyszukiwano.</p>
            ) : (
              history.map((r) => {
                const { warning } = describeRun(r, industries);
                const created = Number(r.result.created ?? 0);
                const label = `${industries[String(r.params.industry)] ?? r.params.industry}, ${r.params.city}`;
                return (
                  <div className="hist" key={r.id}>
                    <span className="hi" style={warning ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--positive-soft)", color: "var(--positive)" }}>
                      {warning ? <IconAlert size={14} /> : <IconCheck size={14} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {formatDateTime(r.created_at)}
                        {warning && <span style={{ color: "var(--accent)", marginLeft: 10 }}>{warning}</span>}
                      </div>
                    </div>
                    <b className="num" style={{ fontWeight: 600, fontSize: 14, color: created ? undefined : "var(--ink-faint)" }}>{created ? `+${created}` : "0"}</b>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </div>
    </>
  );
}
