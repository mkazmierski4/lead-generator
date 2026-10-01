"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MailboxPanel } from "@/components/MailboxPanel";
import { Topbar } from "@/components/Topbar";
import { IconChevron, IconMail, IconPlus } from "@/components/icons";
import { api, type Campaign, type MailerStatus } from "@/lib/api";
import { CAMPAIGN_STATUS, delivered } from "@/lib/labels";

export default function KampaniePage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [meta, setMeta] = useState<MailerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.campaigns(), api.mailerStatus()])
      .then(([c, m]) => {
        setCampaigns(c);
        setMeta(m);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <Topbar />
      <div className="content">
        <div className="rise" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <h1 className="title">Kampanie</h1>
            <p className="sub">Każda kampania to jeden szablon wiadomości i kolejka firm. Maile wychodzą partiami, w granicach dziennego limitu.</p>
          </div>
          <Link href="/kampanie/nowa" className="btn btn-primary"><IconPlus size={16} />Nowa kampania</Link>
        </div>

        {error && <div className="notice notice-error" role="alert" style={{ marginTop: 20 }}>{error}</div>}
        {meta && <MailboxPanel meta={meta} />}

        <section className="panel rise d2" style={{ marginTop: 20, overflow: "hidden" }}>
          {campaigns === null ? (
            <p className="muted" style={{ padding: 22, margin: 0 }}>Wczytuję…</p>
          ) : campaigns.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><IconMail size={22} /></div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Nie masz jeszcze kampanii</div>
              <p className="muted" style={{ fontSize: 14, maxWidth: 400, margin: "6px auto 18px", lineHeight: 1.5 }}>
                Zacznij od gotowego szablonu i sprawdź, jak wiadomość wygląda dla prawdziwych firm z rejestru.
              </p>
              <Link href="/kampanie/nowa" className="btn btn-ghost">Utwórz pierwszą kampanię</Link>
            </div>
          ) : (
            campaigns.map((c) => {
              const sent = delivered(c);
              const queued = c.counts.queued;
              const skipped = c.counts.skipped + c.counts.failed;
              const total = sent + queued + skipped;
              const status = c.sending ? CAMPAIGN_STATUS.active : CAMPAIGN_STATUS[c.status === "active" ? "paused" : c.status];
              return (
                <Link key={c.id} href={`/kampanie/${c.id}`} className="crow">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15.5 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Temat: {c.subject_template}</div>
                  </div>
                  <div><span className={`pill pill-${status.tone}`}>{status.label}</span></div>
                  <div>
                    <div className="prog">
                      {total > 0 && sent > 0 && <span className="fill" style={{ width: `${(sent / total) * 100}%`, background: "var(--ink)" }} />}
                      {total > 0 && skipped > 0 && <span className="fill" style={{ width: `${(skipped / total) * 100}%`, background: "var(--line-strong)", animationDelay: ".55s" }} />}
                    </div>
                    <div className="mini">
                      {total === 0 ? (
                        <><span>Kolejka pusta.</span><span style={{ color: "var(--accent)" }}>Dodaj firmy z rejestru</span></>
                      ) : (
                        <>
                          <span><b className="num">{sent}</b> wysłane</span>
                          <span><b className="num">{queued}</b> w kolejce</span>
                          {skipped > 0 && <span><b className="num">{skipped}</b> pominięte</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <IconChevron size={16} style={{ color: "var(--ink-faint)" }} />
                </Link>
              );
            })
          )}
        </section>

        <details className="rise d3" style={{ marginTop: 20 }}>
          <summary className="muted" style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 500, padding: "6px 0" }}>Jak przejść z Mailpit na prawdziwą skrzynkę</summary>
          <ol className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, margin: "8px 0 0", paddingLeft: 20, maxWidth: 760 }}>
            <li>Kup domenę, najlepiej taką, na której postawisz też swoje portfolio. Odbiorcy będą ją sprawdzać.</li>
            <li>Załóż skrzynkę na tej domenie z dostępem SMTP (np. Google Workspace albo poczta u dostawcy hostingu).</li>
            <li>Ustaw w DNS rekordy SPF, DKIM i DMARC. Bez nich maile trafią do spamu.</li>
            <li>Wpisz dane skrzynki do <code className="code">SMTP_*</code> i <code className="code">SENDER_EMAIL</code> w .env, a dzień pierwszej wysyłki do <code className="code">MAILBOX_WARMUP_START</code>.</li>
          </ol>
        </details>
      </div>
    </>
  );
}
