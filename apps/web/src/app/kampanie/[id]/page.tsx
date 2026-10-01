"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { IconCheck, IconChevron } from "@/components/icons";
import { api, type Campaign, type MailerStatus, type QueueItem, type SendPlan } from "@/lib/api";
import { notifyLeadsChanged } from "@/lib/events";
import { useIndustries } from "@/lib/hooks";
import { CAMPAIGN_STATUS, delivered, formatDateTime, plural } from "@/lib/labels";

type Tab = "queue" | "sent" | "skipped";
const DELIVERED = new Set(["sent", "bounced", "opened", "replied", "unsubscribed"]);
const POLL_MS = 3000;

export default function KampaniaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const industries = useIndustries();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [meta, setMeta] = useState<MailerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("queue");
  const [open, setOpen] = useState<string | null>(null);
  const [plan, setPlan] = useState<SendPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [batch, setBatch] = useState<{ startSent: number; planned: number } | null>(null);
  const [finished, setFinished] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wasSending = useRef(false);

  const load = useCallback(async () => {
    try {
      const [c, q, m] = await Promise.all([api.campaign(id), api.queue(id), api.mailerStatus()]);
      setCampaign(c);
      setItems(q);
      setMeta(m);
      setError(null);
      if (wasSending.current && !c.sending) {
        const left = c.counts.queued;
        setFinished(
          left === 0
            ? "Kolejka wysłana w całości."
            : m.remaining_today === 0
              ? `Dzisiejszy limit wyczerpany. ${left} ${plural(left, "firma czeka", "firmy czekają", "firm czeka")} w kolejce do jutra.`
              : "Wysyłka zatrzymana. Jeśli to nie Ty ją zatrzymałeś, sprawdź zakładkę z błędami."
        );
        setBatch(null);
        notifyLeadsChanged();
      }
      wasSending.current = c.sending;
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pobranie danych przy wejściu na stronę
    load();
  }, [load]);

  useEffect(() => {
    if (!campaign?.sending) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [campaign?.sending, load]);

  if (error && !campaign) {
    return (
      <>
        <Topbar />
        <div className="content"><div className="notice notice-error" role="alert">{error}</div></div>
      </>
    );
  }
  if (!campaign || !meta) {
    return (
      <>
        <Topbar />
        <div className="content"><p className="muted">Wczytuję…</p></div>
      </>
    );
  }

  const sentCount = delivered(campaign);
  const queue = items.filter((i) => i.status === "queued");
  const sent = items.filter((i) => DELIVERED.has(i.status));
  const skipped = items.filter((i) => i.status === "skipped" || i.status === "failed");
  const status = campaign.sending ? CAMPAIGN_STATUS.active : CAMPAIGN_STATUS[campaign.status === "active" ? "paused" : campaign.status];
  const avgDelay = (meta.send_delay_min_s + meta.send_delay_max_s) / 2;
  const batchDone = batch ? Math.max(0, sentCount - batch.startSent) : 0;

  const blockers: string[] = [];
  if (!meta.sender_configured) blockers.push(`Uzupełnij w .env: ${meta.sender_missing.join(", ")}.`);
  if (!meta.smtp_configured) blockers.push("Brak skonfigurowanej skrzynki (SMTP_HOST w .env).");
  if (meta.smtp_is_test)
    blockers.push("Podłączona jest skrzynka testowa Mailpit. Partii nie wysyłamy, bo firmy zostałyby oznaczone jako już kontaktowane. Sprawdź treść przez „Wyślij test do siebie”.");
  if (queue.length === 0) blockers.push("Kolejka jest pusta. Dodaj firmy z rejestru.");
  if (meta.remaining_today === 0) blockers.push("Dzisiejszy limit wysyłki jest wyczerpany. Wróć jutro.");

  async function openSendDialog() {
    setPlanError(null);
    setFinished(null);
    try {
      setPlan(await api.sendPlan(id));
    } catch (e) {
      setPlanError((e as Error).message);
    }
  }

  async function startSending() {
    if (!plan) return;
    setStarting(true);
    try {
      const res = await api.sendForReal(id);
      setBatch({ startSent: sentCount, planned: res.would_send });
      setPlan(null);
      wasSending.current = true;
      await load();
    } catch (e) {
      setPlanError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    await api.stopSending(id).catch(() => {});
    await load();
  }

  async function remove(logId: string) {
    try {
      await api.removeFromQueue(id, logId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteCampaign() {
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await api.deleteCampaign(id);
      router.push("/kampanie");
    } catch (e) {
      setError((e as Error).message);
      setConfirmDelete(false);
    }
  }

  const crumb = (
    <nav className="crumb" aria-label="Okruszki">
      <Link href="/kampanie">Kampanie</Link>
      <IconChevron size={12} />
      <span style={{ color: "var(--ink)" }}>{campaign.name}</span>
    </nav>
  );

  return (
    <>
      <Topbar left={crumb} />
      <div className="content">
        <div className="rise" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 className="title">{campaign.name}</h1>
              <span className={`pill pill-${status.tone}`}>{status.label}</span>
            </div>
            <p className="muted" style={{ fontSize: 14, margin: "8px 0 0" }}>Temat: {campaign.subject_template}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!campaign.sending && sentCount === 0 && (
              <button type="button" className="btn btn-quiet" onClick={deleteCampaign} style={confirmDelete ? { color: "var(--accent)" } : undefined}>
                {confirmDelete ? "Na pewno usunąć?" : "Usuń"}
              </button>
            )}
            {!campaign.sending && <Link href={`/kampanie/${id}/edytuj`} className="btn btn-quiet">Edytuj szablon</Link>}
            <TestSend campaignId={id} meta={meta} />
            {campaign.sending ? (
              <button type="button" className="btn btn-ghost" onClick={stop}>Zatrzymaj</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={openSendDialog}>Wyślij partię</button>
            )}
          </div>
        </div>

        {error && <div className="notice notice-error" role="alert" style={{ marginTop: 16 }}>{error}</div>}

        <section className="panel rise d1" style={{ marginTop: 24, overflow: "hidden" }}>
          <div className="stats5">
            <div><b>{campaign.counts.queued}</b><span>w kolejce</span></div>
            <div><b>{sentCount}</b><span>wysłane</span></div>
            <div><b className="faint">—</b><span>odpowiedzi (faza 5)</span></div>
            <div><b>{campaign.counts.skipped + campaign.counts.failed}</b><span>pominięte i błędy</span></div>
            <div><b>{meta.sent_today}/{meta.cap_today}</b><span>dziś z limitu</span></div>
          </div>
        </section>

        {campaign.sending && (
          <div className="banner panel" role="status">
            <span className="live-dot" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12 }}>
                <span style={{ fontWeight: 500 }}>Wysyłam…</span>
                {batch && <span className="muted num">{batchDone} z {batch.planned}</span>}
              </div>
              <div className="progress" style={{ marginTop: 10 }}>
                <i style={{ width: `${batch && batch.planned ? Math.min(100, (batchDone / batch.planned) * 100) : (meta.sent_today / Math.max(1, meta.cap_today)) * 100}%` }} />
              </div>
              <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                Między mailami program czeka {Math.round(meta.send_delay_min_s)}–{Math.round(meta.send_delay_max_s)} s, żeby wysyłka wyglądała jak zwykła korespondencja. Możesz zamknąć tę stronę.
              </div>
            </div>
          </div>
        )}
        {finished && !campaign.sending && (
          <div className="banner" role="status" style={{ background: "var(--positive-soft)" }}>
            <span className="ok-badge" style={{ width: 30, height: 30 }}><IconCheck size={14} /></span>
            <div style={{ fontSize: 14, color: "var(--positive)" }}>{finished}</div>
          </div>
        )}

        <div className="rise d2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 14px", gap: 12, flexWrap: "wrap" }}>
          <div className="seg" role="tablist" aria-label="Wiadomości kampanii">
            {(
              [
                ["queue", "Kolejka", queue.length],
                ["sent", "Wysłane", sent.length],
                ["skipped", "Pominięte i błędy", skipped.length],
              ] as const
            ).map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "seg-b on" : "seg-b"} onClick={() => setTab(key)}>
                {label}<span className="seg-c">{n}</span>
              </button>
            ))}
          </div>
          <Link href={`/leady?kampania=${id}`} className="btn btn-ghost btn-sm">Dodaj firmy z rejestru</Link>
        </div>

        <section className="panel" style={{ overflow: "hidden" }}>
          {tab === "queue" &&
            (queue.length === 0 ? (
              <EmptyTab text="Kolejka jest pusta. Dodaj firmy z rejestru — trafią tu tylko te z potwierdzonym adresem e-mail." />
            ) : (
              queue.map((q) => (
                <div className="qrow" key={q.id}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/leady/${q.company_id}`} style={{ fontWeight: 600, fontSize: 14.5 }}>{q.company_name}</Link>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{[industries[q.industry ?? ""] ?? q.industry, q.city].filter(Boolean).join(", ")}</div>
                  </div>
                  <div className="muted" style={{ fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis" }}>{q.email}</div>
                  <div><span className="pill pill-mute">czeka</span></div>
                  <button type="button" className="icon-btn flat" aria-label={`Usuń ${q.company_name} z kolejki`} disabled={campaign.sending} onClick={() => remove(q.id)}>
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 5l8 8M13 5l-8 8" /></svg>
                  </button>
                </div>
              ))
            ))}

          {tab === "sent" &&
            (sent.length === 0 ? (
              <EmptyTab text="Jeszcze nic nie wysłano z tej kampanii." />
            ) : (
              sent.map((s) => (
                <div className="hrow" key={s.id}>
                  <button type="button" className="hrow-head" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.company_name}</div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{s.subject}</div>
                    </div>
                    <div className="muted" style={{ fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis" }}>{s.email}</div>
                    <div className="muted num" style={{ fontSize: 13 }}>{s.sent_at ? formatDateTime(s.sent_at) : "—"}</div>
                    <IconChevron size={14} className={open === s.id ? "chev open" : "chev"} />
                  </button>
                  {open === s.id && (
                    <div className="sent-mail">
                      <b style={{ fontWeight: 600 }}>{s.subject}</b>
                      {"\n\n"}
                      {s.body}
                    </div>
                  )}
                </div>
              ))
            ))}

          {tab === "skipped" &&
            (skipped.length === 0 ? (
              <EmptyTab text="Nic nie zostało pominięte." />
            ) : (
              skipped.map((s) => (
                <div className="qrow" key={s.id} style={{ gridTemplateColumns: "minmax(0,1fr) 1.3fr" }}>
                  <div>
                    <Link href={`/leady/${s.company_id}`} style={{ fontWeight: 600, fontSize: 14.5 }}>{s.company_name}</Link>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{s.email}</div>
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--accent)" }}>
                    {s.status === "failed" ? `Błąd skrzynki: ${s.error ?? "nieznany"}` : s.error}
                  </div>
                </div>
              ))
            ))}
        </section>
      </div>

      {(plan || planError) && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && (setPlan(null), setPlanError(null))}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="send-title">
            {blockers.length > 0 || !plan ? (
              <>
                <h2 id="send-title" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>Nie można jeszcze wysłać</h2>
                <ul style={{ margin: "14px 0 20px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                  {(planError ? [planError] : blockers).map((b) => <li key={b}>{b}</li>)}
                </ul>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setPlan(null); setPlanError(null); }}>Zamknij</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="send-title" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>
                  Wysłać {plan.would_send} {plural(plan.would_send, "mail", "maile", "maili")} teraz?
                </h2>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, margin: "8px 0 0" }}>
                  To prawdziwa wysyłka. Przed każdym mailem program jeszcze raz sprawdzi listę wykluczeń i historię kontaktu.
                </p>
                <div className="dl">
                  <div><span>Nadawca</span><span>{meta.sender_name} &lt;{meta.sender_email}&gt;</span></div>
                  <div><span>Dziś z limitu</span><span className="num">wysłano {meta.sent_today} z {meta.cap_today}</span></div>
                  <div><span>Wyjdzie teraz</span><span className="num">{plan.would_send} {plural(plan.would_send, "mail", "maile", "maili")}, ok. {Math.max(1, Math.round((plan.would_send * avgDelay) / 60))} min</span></div>
                  <div><span>Zostanie w kolejce</span><span className="num">{plan.queued - plan.would_send > 0 ? `${plan.queued - plan.would_send}, do jutra` : "nic"}</span></div>
                </div>
                {planError && <div className="notice notice-error" role="alert" style={{ marginBottom: 12 }}>{planError}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" className="btn btn-quiet" onClick={() => setPlan(null)}>Anuluj</button>
                  <button type="button" className="btn btn-accent" onClick={startSending} disabled={starting}>
                    {starting ? "Uruchamiam…" : `Wyślij ${plan.would_send} ${plural(plan.would_send, "mail", "maile", "maili")}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EmptyTab({ text }: { text: string }) {
  return <p className="muted" style={{ fontSize: 14, padding: "28px 22px", margin: 0, textAlign: "center" }}>{text}</p>;
}

function TestSend({ campaignId, meta }: { campaignId: string; meta: MailerStatus }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.sendTest(campaignId, to.trim());
      setMsg({ ok: true, text: meta.smtp_is_test ? "Wysłano. Zobacz w Mailpit: localhost:8025." : `Wysłano na ${to.trim()}.` });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="btn btn-ghost" aria-expanded={open} onClick={() => setOpen(!open)}>Wyślij test do siebie</button>
      {open && (
        <form className="popover" onSubmit={send}>
          <label className="lbl" htmlFor="test-to">Adres testowy</label>
          <input id="test-to" type="email" required className="inp" value={to} onChange={(e) => setTo(e.target.value)} placeholder="ty@example.com" />
          <p className="faint" style={{ fontSize: 12, margin: "8px 0 12px", lineHeight: 1.5 }}>
            Jeden mail z tematem [TEST], na przykładzie pierwszej firmy z kolejki. Nie liczy się do limitu ani historii.
          </p>
          {msg && <div className={msg.ok ? "warn warn-pos" : "warn warn-accent"} style={{ marginTop: 0, marginBottom: 12 }}>{msg.text}</div>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !to.trim()}>{busy ? "Wysyłam…" : "Wyślij test"}</button>
        </form>
      )}
    </div>
  );
}
