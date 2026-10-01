import type { MailerStatus } from "@/lib/api";

const WARMUP = [10, 15, 25, 35];

export function warmupWeek(meta: MailerStatus): number | null {
  if (!meta.warmup_start) return 0;
  const days = Math.floor((Date.now() - new Date(meta.warmup_start).getTime()) / 86_400_000);
  const week = Math.floor(days / 7);
  return week < WARMUP.length ? Math.max(0, week) : null;
}

export function MailboxPanel({ meta }: { meta: MailerStatus }) {
  const week = warmupWeek(meta);
  const mode = !meta.smtp_configured ? "none" : meta.smtp_is_test ? "test" : "real";

  return (
    <section className="panel rise d1" style={{ marginTop: 28, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
        <h2 className="h2">Skrzynka nadawcza</h2>
        {mode === "test" && <span className="pill pill-accent">tryb testowy</span>}
        {mode === "real" && meta.sender_configured && <span className="pill pill-pos">gotowa do wysyłki</span>}
        {mode === "none" && <span className="pill pill-accent">nieskonfigurowana</span>}
      </div>
      <div className="ready">
        <div>
          <div className="muted" style={{ fontSize: 13 }}>Nadawca</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{meta.sender_name || "Nie uzupełniono"}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
            {meta.sender_configured ? (
              meta.sender_email
            ) : (
              <>Brakuje w .env: {meta.sender_missing.join(", ")}. Bez tego prawdziwa wysyłka jest zablokowana.</>
            )}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 13 }}>Skrzynka</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>
            {mode === "test" ? "Mailpit (lokalna)" : mode === "real" ? "Prawdziwa skrzynka" : "Brak"}
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
            {mode === "test" ? (
              <>Maile trafiają tylko do podglądu na <a href="http://localhost:8025" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>localhost:8025</a>. Nic nie wychodzi do internetu.</>
            ) : mode === "real" ? (
              "Maile wychodzą naprawdę. Każda partia wymaga Twojego potwierdzenia."
            ) : (
              <>Uzupełnij <code className="code">SMTP_HOST</code> w .env.</>
            )}
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div className="muted" style={{ fontSize: 13 }}>Dziś</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{week === null ? "skrzynka rozgrzana" : `rozgrzewanie: tydzień ${week + 1} z 4`}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <b className="num" style={{ fontSize: 22, fontWeight: 700 }}>{meta.sent_today}</b>
            <span className="muted">/ {meta.cap_today} maili</span>
          </div>
          <div className="weeks" aria-hidden="true">
            {WARMUP.map((_, i) => <span key={i} className={week === null || i <= week ? "on" : undefined} />)}
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            Limit rośnie {WARMUP.join(" → ")}, potem {meta.daily_send_limit}/dzień.
            {!meta.warmup_start && " Skrzynka liczona jako nowa."}
          </div>
        </div>
      </div>
    </section>
  );
}
