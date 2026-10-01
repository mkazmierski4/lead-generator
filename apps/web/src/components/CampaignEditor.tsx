"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Campaign, type Company, type MailerStatus, type RenderedMail, type StarterTemplate } from "@/lib/api";
import { VAR_RE } from "@/lib/labels";
import { IconChevron } from "./icons";

type Field = "subject" | "body";
type Segment = { text: string; kind: "txt" | "var" | "empty" | "bad" };

function segments(template: string, ctx: Record<string, string>, known: Set<string>): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(VAR_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: template.slice(last, idx), kind: "txt" });
    const name = m[1];
    if (!known.has(name)) out.push({ text: m[0], kind: "bad" });
    else if (ctx[name]) out.push({ text: ctx[name], kind: "var" });
    else out.push({ text: `(brak: ${name})`, kind: "empty" });
    last = idx + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last), kind: "txt" });
  return out;
}

function Segs({ segs }: { segs: Segment[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.kind === "txt" ? <span key={i}>{s.text}</span> : <span key={i} className={s.kind === "var" ? "var" : s.kind === "bad" ? "bad" : "ph"}>{s.text}</span>
      )}
    </>
  );
}

export function CampaignEditor({ campaign }: { campaign?: Campaign }) {
  const router = useRouter();
  const editing = Boolean(campaign);
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject_template ?? "");
  const [body, setBody] = useState(campaign?.body_template ?? "");
  const [allowGuessed, setAllowGuessed] = useState(campaign?.allow_guessed_emails ?? false);
  const [meta, setMeta] = useState<MailerStatus | null>(null);
  const [starters, setStarters] = useState<StarterTemplate[]>([]);
  const [samples, setSamples] = useState<Company[]>([]);
  const [idx, setIdx] = useState(0);
  const [preview, setPreview] = useState<RenderedMail | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ label: string; subject: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<Field>("body");

  useEffect(() => {
    api.mailerStatus().then(setMeta).catch(() => {});
    api.starters().then(setStarters).catch(() => {});
    Promise.all([
      api.companies({ website_status: "none", limit: 3 }),
      api.companies({ website_status: "outdated", limit: 2 }),
      api.companies({ website_status: "dead", limit: 1 }),
    ])
      .then((lists) => setSamples(lists.flat()))
      .catch(() => {});
  }, []);

  const known = useMemo(() => new Set(Object.keys(meta?.variables ?? {})), [meta]);
  const unknown = useMemo(() => {
    if (!meta) return [];
    const names = [...`${subject}\n${body}`.matchAll(VAR_RE)].map((m) => m[1]);
    return [...new Set(names.filter((n) => !known.has(n)))];
  }, [subject, body, known, meta]);

  const sample = samples[idx];
  const canPreview = subject.trim() !== "" && body.trim() !== "" && unknown.length === 0;

  useEffect(() => {
    if (!canPreview) return;
    const t = setTimeout(() => {
      api
        .render(subject, body, sample?.id)
        .then((p) => {
          setPreview(p);
          setPreviewError(null);
        })
        .catch((e: Error) => setPreviewError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [subject, body, sample?.id, canPreview]);

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    const field = lastField.current;
    const el = field === "subject" ? subjectRef.current : bodyRef.current;
    const value = field === "subject" ? subject : body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    if (field === "subject") setSubject(next);
    else setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function applyStarter(s: StarterTemplate) {
    if (subject.trim() || body.trim()) setUndo({ label: s.name, subject, body });
    else setUndo(null);
    setSubject(s.subject);
    setBody(s.body);
    if (!name.trim()) setName(s.name);
  }

  async function save(andAddCompanies: boolean) {
    setSaving(true);
    setError(null);
    try {
      const input = { name, subject_template: subject, body_template: body, allow_guessed_emails: allowGuessed };
      const saved = campaign ? await api.updateCampaign(campaign.id, input) : await api.createCampaign(input);
      router.push(andAddCompanies ? `/leady?kampania=${saved.id}` : `/kampanie/${saved.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const ctx = preview?.context ?? {};
  const renderedTemplate = body.replace(VAR_RE, (m, n: string) => ctx[n] ?? m).trimEnd();
  const footer = preview && preview.body.startsWith(renderedTemplate) ? preview.body.slice(renderedTemplate.length).replace(/^\n+/, "") : "";

  const sampleEmail = sample?.contacts.find((c) => c.email && c.verified) ?? null;
  const sampleGuess = sample?.contacts.find((c) => c.email && !c.verified) ?? null;
  const eligibility = !sample
    ? null
    : sampleEmail
      ? { ok: true, text: `Ta firma trafi do kolejki (${sampleEmail.email}).` }
      : sampleGuess
        ? allowGuessed
          ? { ok: false, text: `Trafi do kolejki z odgadniętym adresem (${sampleGuess.email}). Ryzyko odbicia.` }
          : { ok: false, text: "Ta firma nie trafi do kolejki: adres jest tylko odgadnięty. Włącz „Przyjmuj odgadnięte adresy”, żeby ją uwzględnić." }
        : { ok: false, text: "Ta firma nie trafi do kolejki: brak adresu e-mail. Możesz go dopisać na karcie firmy." };

  const canSave = name.trim() !== "" && subject.trim() !== "" && body.trim() !== "" && unknown.length === 0 && !saving;

  return (
    <div className="content">
      <div className="rise" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 className="title">{editing ? "Edycja kampanii" : "Nowa kampania"}</h1>
          <p className="sub">Napisz wiadomość raz. Zmienne podmienią się dla każdej firmy, a podgląd obok pokazuje efekt na prawdziwych leadach.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={campaign ? `/kampanie/${campaign.id}` : "/kampanie"} className="btn btn-quiet">Anuluj</Link>
          <button type="button" className="btn btn-ghost" disabled={!canSave} onClick={() => save(false)}>
            {editing ? "Zapisz zmiany" : "Zapisz szkic"}
          </button>
          {!editing && (
            <button type="button" className="btn btn-primary" disabled={!canSave} onClick={() => save(true)}>
              {saving ? "Zapisuję…" : "Zapisz i dodaj firmy"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="notice notice-error" role="alert" style={{ marginTop: 18 }}>{error}</div>}

      {!editing && starters.length > 0 && (
        <section className="rise d1" style={{ marginTop: 24 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Zacznij od gotowego szablonu albo napisz własny</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${starters.length}, minmax(0, 1fr))`, gap: 10 }}>
            {starters.map((s) => (
              <button key={s.key} type="button" className="starter" onClick={() => applyStarter(s)}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s.description}</span>
              </button>
            ))}
          </div>
          {undo && (
            <div className="notice" role="status" style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Wstawiono szablon „{undo.label}” w miejsce Twojej treści.</span>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  setSubject(undo.subject);
                  setBody(undo.body);
                  setUndo(null);
                }}
              >
                Cofnij
              </button>
            </div>
          )}
        </section>
      )}

      <div className="grid-2" style={{ marginTop: 20, gridTemplateColumns: "1fr 1fr" }}>
        <section className="panel rise d1" style={{ padding: 24 }}>
          <label className="lbl" htmlFor="c-name">Nazwa kampanii</label>
          <input id="c-name" className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Kawiarnie, Zakopane" />
          <span className="faint" style={{ display: "block", fontSize: 12, marginTop: 6 }}>Widzisz ją tylko Ty.</span>

          <label className="lbl" htmlFor="c-subject" style={{ marginTop: 20 }}>Temat</label>
          <input
            id="c-subject"
            ref={subjectRef}
            className="inp"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => (lastField.current = "subject")}
            placeholder="np. {{firma}} — strona internetowa"
          />

          <label className="lbl" htmlFor="c-body" style={{ marginTop: 20 }}>Treść</label>
          <textarea
            id="c-body"
            ref={bodyRef}
            className="ta"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastField.current = "body")}
            placeholder="Dzień dobry, …"
          />
          <div className="chips" aria-label="Wstaw zmienną w miejscu kursora">
            <span className="faint" style={{ fontSize: 12.5, marginRight: 2 }}>Wstaw w miejscu kursora:</span>
            {Object.entries(meta?.variables ?? {}).map(([key, desc]) => (
              <button key={key} type="button" className="vchip" title={desc} onMouseDown={(e) => e.preventDefault()} onClick={() => insertVar(key)}>
                {`{{${key}}}`}
              </button>
            ))}
          </div>
          <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "10px 0 0" }}>
            Zmienne wstawiają się bez odmiany, np. „Zakopane”, „Maciejka”. Stawiaj je w nawiasie, po myślniku albo w temacie:
            „trafiłem na Państwa firmę ({"{{firma}}"})”, a nie „w {"{{miasto}}"}”.
          </p>
          {unknown.length > 0 && (
            <div className="warn warn-accent" role="alert">
              Nieznana zmienna: {unknown.join(", ")}. Popraw ją, żeby zapisać kampanię.
            </div>
          )}

          <div className="lockbox">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
              <rect x="3.5" y="8" width="11" height="7.5" rx="2" />
              <path d="M6 8V6a3 3 0 016 0v2" />
            </svg>
            <div>
              <b style={{ color: "var(--ink)", fontWeight: 500 }}>Podpis dokleja program.</b> Twoje imię i nazwisko, opis z ustawień i informacja, jak się wypisać. Kończ treść samym „Pozdrawiam”.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              role="switch"
              aria-checked={allowGuessed}
              aria-label="Przyjmuj odgadnięte adresy"
              className={allowGuessed ? "switch on" : "switch"}
              onClick={() => setAllowGuessed(!allowGuessed)}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Przyjmuj odgadnięte adresy</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>
                Adresy typu kontakt@domena, których nie było na stronie. Częściej się odbijają, a odbicia psują reputację skrzynki. Zalecane: wyłączone.
              </div>
            </div>
          </div>
        </section>

        <section className="panel rise d2" style={{ padding: 22, position: "sticky", top: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 className="h2">Podgląd</h2>
            {samples.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="muted num" style={{ fontSize: 12.5, marginRight: 6 }}>{idx + 1} z {samples.length}</span>
                <button type="button" className="icon-btn" aria-label="Poprzednia firma" onClick={() => setIdx((idx + samples.length - 1) % samples.length)}>
                  <IconChevron size={14} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button type="button" className="icon-btn" aria-label="Następna firma" onClick={() => setIdx((idx + 1) % samples.length)}>
                  <IconChevron size={14} />
                </button>
              </div>
            )}
          </div>

          {!canPreview ? (
            <div className="mail" style={{ padding: 28, textAlign: "center" }}>
              <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                {unknown.length > 0 ? "Popraw nieznaną zmienną, żeby zobaczyć podgląd." : "Wpisz temat i treść albo wybierz gotowy szablon."}
              </p>
            </div>
          ) : previewError && !preview ? (
            <div className="notice notice-error">{previewError}</div>
          ) : preview ? (
            <div className="mail">
              <div className="mhead">
                <div>
                  <span>Od</span>
                  {meta?.sender_name ? <span>{meta.sender_name}{meta.sender_email ? ` <${meta.sender_email}>` : ""}</span> : <span className="ph">uzupełnij nadawcę w .env</span>}
                </div>
                <div><span>Do</span><span>{preview.email ?? <span className="ph">brak adresu</span>}</span></div>
                <div><span>Temat</span><span style={{ fontWeight: 600 }}><Segs segs={segments(subject.trim(), ctx, known)} /></span></div>
              </div>
              <div className="mbody"><Segs segs={segments(body.trimEnd(), ctx, known)} /></div>
              {footer && <div className="mbody" style={{ borderTop: "1px dashed var(--line-strong)", background: "var(--surface)", fontSize: 12.5, color: "var(--ink-soft)" }}>{footer}</div>}
            </div>
          ) : (
            <div className="mail" style={{ padding: 28 }}><p className="muted" style={{ margin: 0 }}>Wczytuję podgląd…</p></div>
          )}

          {canPreview && eligibility && (
            <div className={eligibility.ok ? "warn warn-pos" : "warn warn-accent"}>
              <span>{preview?.company_name ? <b style={{ fontWeight: 600 }}>{preview.company_name}: </b> : null}{eligibility.text}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
