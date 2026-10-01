"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { IconChevron, IconExternal, IconPhone } from "@/components/icons";
import { api, type Campaign, type Company, type CompanySend } from "@/lib/api";
import { notifyLeadsChanged } from "@/lib/events";
import { useIndustries } from "@/lib/hooks";
import {
  MAX_SCORE,
  SOURCE_LABELS,
  STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatPoints,
  initial,
  parseReasons,
  toneOf,
} from "@/lib/labels";

const CIRC = 2 * Math.PI * 38;

const SEND_LABELS: Record<string, string> = {
  queued: "W kolejce",
  sent: "Wysłano",
  bounced: "Odbite",
  opened: "Otwarte",
  replied: "Odpowiedź",
  unsubscribed: "Wypisał się",
  failed: "Błąd wysyłki",
  skipped: "Pominięte",
};

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const industries = useIndustries();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sends, setSends] = useState<CompanySend[]>([]);

  useEffect(() => {
    api.company(id).then(setCompany).catch((e: Error) => setError(e.message));
    api.companySends(id).then(setSends).catch(() => {});
  }, [id]);

  const crumb = (
    <nav className="crumb" aria-label="Okruszki">
      <Link href="/leady">Leady</Link>
      <IconChevron size={12} />
      <span style={{ color: "var(--ink)" }}>{company?.name ?? "…"}</span>
    </nav>
  );

  if (error) {
    return (
      <>
        <Topbar left={crumb} />
        <div className="content">
          <div className="notice notice-error" role="alert">{error}</div>
        </div>
      </>
    );
  }
  if (!company) {
    return (
      <>
        <Topbar left={crumb} />
        <div className="content"><p className="muted">Wczytuję…</p></div>
      </>
    );
  }

  const tone = toneOf(company);
  const reasons = parseReasons(company.score_explanation);
  const scored = reasons.filter((r) => r.points !== null);
  const observations = reasons.filter((r) => r.points === null);
  const maxAbs = Math.max(1, ...scored.map((r) => Math.abs(r.points ?? 0)));
  const pct = company.score == null ? 0 : Math.max(0, Math.min(1, company.score / MAX_SCORE));
  const industryLabel = industries[company.industry ?? ""] ?? company.industry;

  return (
    <>
      <Topbar left={crumb} />
      <div className="content">
        {company.excluded_at && (
          <div className="notice" role="status" style={{ marginBottom: 16 }}>
            Ta firma jest wykluczona od {formatDate(company.excluded_at)}. Nie pojawia się w rejestrze i nie dostanie żadnej wiadomości.
          </div>
        )}

        <section className="panel rise" style={{ display: "flex", alignItems: "center", gap: 24, padding: "26px 30px", flexWrap: "wrap" }}>
          <span className={`mono mono-${tone}`} style={{ width: 68, height: 68, borderRadius: 18, fontSize: 28, fontWeight: 700 }}>
            {initial(company.name)}
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="title">{company.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <span className={`pill pill-${tone}`}>{STATUS_LABELS[company.website_status]}</span>
              {industryLabel && <span className="pill pill-mute">{industryLabel}</span>}
              <span className="muted" style={{ fontSize: 13.5 }}>{[company.city, company.country].filter(Boolean).join(", ")}</span>
            </div>
          </div>
          <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }} aria-label={company.score == null ? "Brak wyniku" : `Wynik ${Math.round(company.score)} z ${MAX_SCORE}`}>
            <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
              <circle cx="46" cy="46" r="38" fill="none" stroke="var(--mute-soft)" strokeWidth="7" />
              <circle
                className="ring-fg"
                cx="46"
                cy="46"
                r="38"
                fill="none"
                stroke={tone === "pos" ? "var(--positive)" : "var(--accent)"}
                strokeWidth="7"
                strokeLinecap="round"
                style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - pct) }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
              <div>
                <div className="num" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{company.score == null ? "—" : Math.round(company.score)}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>z {MAX_SCORE} pkt</div>
              </div>
            </div>
          </div>
          <Actions company={company} onChange={setCompany} />
        </section>

        <div className="grid-2" style={{ marginTop: 20, gridTemplateColumns: "1.6fr 1fr" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section className="panel rise d1" style={{ overflow: "hidden" }}>
              <div style={{ padding: "20px 22px 6px" }}>
                <h2 className="h2">{company.score == null ? "Jeszcze bez oceny" : `Skąd ${Math.round(company.score)} punktów`}</h2>
              </div>
              {scored.length === 0 ? (
                <p className="muted" style={{ fontSize: 13.5, padding: "6px 22px 20px", margin: 0 }}>
                  Firma nie została jeszcze wzbogacona. Uruchom „Wzbogać nowe” w rejestrze leadów.
                </p>
              ) : (
                <div>
                  {scored.map((r, i) => (
                    <div className="why" key={i}>
                      <div style={{ fontWeight: 500, fontSize: 14.5 }}>{r.text}</div>
                      <span className="cbar">
                        <i
                          className="fill"
                          style={{
                            width: `${(Math.abs(r.points ?? 0) / maxAbs) * 100}%`,
                            background: (r.points ?? 0) > 0 ? "var(--accent)" : "var(--line-strong)",
                          }}
                        />
                      </span>
                      <b className="num" style={{ textAlign: "right", fontWeight: 600, color: (r.points ?? 0) > 0 ? "var(--accent)" : "var(--ink-faint)" }}>
                        {formatPoints(r.points ?? 0)}
                      </b>
                    </div>
                  ))}
                  {!company.registered_at && (
                    <div className="why">
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14.5 }} className="muted">Wiek firmy</div>
                        <div className="faint" style={{ fontSize: 13, marginTop: 3 }}>Nieznany. Pojawi się po podłączeniu rejestru CEIDG.</div>
                      </div>
                      <span className="cbar" />
                      <b className="num faint" style={{ textAlign: "right", fontWeight: 600 }}>—</b>
                    </div>
                  )}
                </div>
              )}
              {observations.length > 0 && (
                <div style={{ padding: "14px 22px 18px", borderTop: "1px solid var(--line)", background: "var(--white)" }}>
                  <div className="muted" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>Co wykazało sprawdzenie</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 13.5 }}>
                    {observations.map((o, i) => <li key={i}>{o.text}</li>)}
                  </ul>
                </div>
              )}
            </section>

            <ContactPanel company={company} onChange={setCompany} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section className="panel rise d2" style={{ padding: "18px 22px" }}>
              <h2 className="h2" style={{ marginBottom: 8 }}>Dane</h2>
              <div className="fact"><span>Źródło</span><span>{SOURCE_LABELS[company.source]}</span></div>
              <div className="fact"><span>Adres</span><span className={company.address ? undefined : "faint"}>{company.address ?? "brak"}</span></div>
              <div className="fact">
                <span>Strona</span>
                {company.website_url ? (
                  <a href={company.website_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "var(--line-strong)" }}>
                    {company.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <IconExternal size={13} />
                  </a>
                ) : (
                  <span className="faint">brak</span>
                )}
              </div>
              <div className="fact"><span>Dodano</span><span className="num">{formatDate(company.created_at)}</span></div>
              <div className="fact"><span>Wzbogacono</span><span className={company.enriched_at ? "num" : "faint"}>{company.enriched_at ? formatDateTime(company.enriched_at) : "jeszcze nie"}</span></div>
            </section>

            <section className="panel rise d3" style={{ padding: "18px 22px 4px" }}>
              <h2 className="h2" style={{ marginBottom: 16 }}>Historia</h2>
              {sends.map((s) => (
                <div className="tl" key={s.id}>
                  <span className="tl-dot" style={s.status === "queued" ? { borderStyle: "dashed" } : { background: "var(--ink)", borderColor: "var(--ink)" }} />
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {SEND_LABELS[s.status] ?? s.status}: <Link href={`/kampanie/${s.campaign_id}`} style={{ textDecoration: "underline", textDecorationColor: "var(--line-strong)" }}>{s.campaign_name}</Link>
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {s.sent_at ? formatDateTime(s.sent_at) : formatDateTime(s.created_at)}
                    {s.error ? `, ${s.error}` : ""}
                  </div>
                </div>
              ))}
              {company.excluded_at && (
                <div className="tl"><span className="tl-dot" style={{ background: "var(--ink)", borderColor: "var(--ink)" }} /><div style={{ fontSize: 14, fontWeight: 500 }}>Wykluczona</div><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{formatDateTime(company.excluded_at)}</div></div>
              )}
              {company.enriched_at && (
                <div className="tl"><span className="tl-dot" style={{ background: "var(--accent)", borderColor: "var(--accent)" }} /><div style={{ fontSize: 14, fontWeight: 500 }}>Wzbogacono{company.score != null ? `, wynik ${Math.round(company.score)}` : ""}</div><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{formatDateTime(company.enriched_at)}</div></div>
              )}
              <div className="tl"><span className="tl-dot" /><div style={{ fontSize: 14, fontWeight: 500 }}>Dodano z: {SOURCE_LABELS[company.source]}</div><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{formatDateTime(company.created_at)}</div></div>
              {sends.length === 0 && (
                <div className="tl"><span className="tl-dot" style={{ borderStyle: "dashed" }} /><div className="faint" style={{ fontSize: 13.5 }}>Jeszcze nie pisaliśmy do tej firmy</div></div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function Actions({ company, onChange }: { company: Company; onChange: (c: Company) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  async function exclude() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    setError(null);
    try {
      onChange(await api.exclude(company.id));
      notifyLeadsChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 12, minWidth: 190 }}>
      {!company.excluded_at && <AddToCampaign company={company} />}
      {!company.excluded_at && (
        <button type="button" className="btn btn-quiet" onClick={exclude} disabled={busy} style={confirming ? { color: "var(--accent)" } : undefined}>
          {busy ? "Wykluczam…" : confirming ? "Na pewno? Kliknij ponownie" : "Wyklucz na stałe"}
        </button>
      )}
      {error && <span role="alert" style={{ fontSize: 12.5, color: "#8a3a12" }}>{error}</span>}
    </div>
  );
}

function AddToCampaign({ company }: { company: Company }) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; campaignId: string } | null>(null);

  useEffect(() => {
    if (!open || campaigns) return;
    api.campaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, [open, campaigns]);

  async function add(c: Campaign) {
    setBusyId(c.id);
    try {
      const res = await api.addToQueue(c.id, [company.id]);
      setResult(
        res.queued > 0
          ? { ok: true, text: `Dodano do kampanii „${c.name}”.`, campaignId: c.id }
          : { ok: false, text: res.skipped[0]?.reason ?? "Nie udało się dodać.", campaignId: c.id }
      );
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message, campaignId: c.id });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="btn btn-primary" style={{ width: "100%" }} aria-expanded={open} onClick={() => { setOpen(!open); setResult(null); }}>
        Dodaj do kampanii
      </button>
      {open && (
        <div className="popover">
          {campaigns === null ? (
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Wczytuję kampanie…</p>
          ) : campaigns.length === 0 ? (
            <>
              <p className="muted" style={{ margin: "0 0 12px", fontSize: 13.5 }}>Nie masz jeszcze żadnej kampanii.</p>
              <Link href="/kampanie/nowa" className="btn btn-ghost btn-sm">Utwórz kampanię</Link>
            </>
          ) : (
            <>
              <div className="muted" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>Wybierz kampanię</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {campaigns.map((c) => (
                  <button key={c.id} type="button" className="btn btn-quiet" style={{ justifyContent: "space-between", width: "100%" }} onClick={() => add(c)} disabled={busyId !== null}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink)" }}>{c.name}</span>
                    <span className="faint" style={{ fontSize: 12 }}>{busyId === c.id ? "dodaję…" : `${c.counts.queued} w kolejce`}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {result && (
            <div className={result.ok ? "warn warn-pos" : "warn warn-accent"} role="status">
              <span>
                {result.text}{" "}
                {result.ok && <Link href={`/kampanie/${result.campaignId}`} style={{ textDecoration: "underline" }}>Zobacz kolejkę</Link>}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContactPanel({ company, onChange }: { company: Company; onChange: (c: Company) => void }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = [
    ...(company.phone ? [{ key: "phone", label: "Telefon", value: company.phone, note: "ze źródła" }] : []),
    ...company.contacts.flatMap((c) => [
      ...(c.email ? [{ key: `${c.id}-e`, label: "E-mail", value: c.email, note: c.verified ? "potwierdzony" : "odgadnięty, niepotwierdzony" }] : []),
      ...(c.phone ? [{ key: `${c.id}-p`, label: "Telefon", value: c.phone, note: "dodany ręcznie" }] : []),
    ]),
  ];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onChange(await api.addContact(company.id, { email: email.trim() || undefined, phone: phone.trim() || undefined }));
      setAdding(false);
      setEmail("");
      setPhone("");
      notifyLeadsChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel rise d2" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="h2">Kontakt</h2>
        {entries.length > 0 && !adding && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAdding(true)}>Dodaj kontakt</button>
        )}
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {entries.map((x) => (
            <div className="fact" key={x.key}>
              <span>{x.label}</span>
              <span><span style={{ fontWeight: 500 }}>{x.value}</span> <span className="faint" style={{ fontSize: 12.5 }}>{x.note}</span></span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !adding && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 16, padding: 16, borderRadius: 12, background: "var(--sheet)", border: "1px dashed var(--line-strong)" }}>
          <span className="mono mono-mute" style={{ width: 36, height: 36, borderRadius: 10 }}><IconPhone /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Nie znaleziono telefonu ani e-maila</div>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 12px", lineHeight: 1.5 }}>
              Bardzo małe firmy często podają kontakt tylko w wizytówce Google lub na Facebooku. Jeśli go znajdziesz, dopisz ręcznie.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>Dodaj kontakt ręcznie</button>
          </div>
        </div>
      )}

      {adding && (
        <form onSubmit={save} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, animation: "reveal .3s var(--ease) both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              E-mail
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginTop: 6 }} placeholder="kontakt@firma.pl" />
            </label>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Telefon
              <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", marginTop: 6 }} placeholder="+48 …" />
            </label>
          </div>
          {error && <span role="alert" style={{ fontSize: 13, color: "#8a3a12" }}>{error}</span>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || (!email.trim() && !phone.trim())}>{busy ? "Zapisuję…" : "Zapisz kontakt"}</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAdding(false)}>Anuluj</button>
          </div>
        </form>
      )}
    </section>
  );
}
