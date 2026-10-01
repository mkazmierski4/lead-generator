"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { api, type MailerStatus, type SettingsStatus } from "@/lib/api";
import { useIndustries } from "@/lib/hooks";

const GUARDS = [
  { title: "Każda partia wymaga Twojego potwierdzenia", body: "Program pokazuje, ile maili wyjdzie i ile zostanie na jutro, zanim cokolwiek wyśle." },
  { title: "Nigdy dwa razy do tej samej firmy", body: "Wykluczenia, lista wypisanych i historia wysyłek sprawdzane tuż przed każdym mailem." },
  { title: "Podpis i informacja o wypisaniu w każdym mailu", body: "Dokleja je program. Szablon nie może ich usunąć." },
  { title: "Dzienny limit z rozgrzewaniem skrzynki", body: "10, 15, 25, 35 maili dziennie w pierwszych tygodniach, potem limit z ustawień." },
];

export default function UstawieniaPage() {
  const industries = useIndustries();
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [mailer, setMailer] = useState<MailerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.settingsStatus().then(setStatus).catch((e: Error) => setError(e.message));
    api.mailerStatus().then(setMailer).catch(() => {});
  }, []);

  return (
    <>
      <Topbar />
      <div className="content" style={{ maxWidth: 1000 }}>
        <h1 className="title rise">Ustawienia</h1>
        {error && <div className="notice notice-error" role="alert" style={{ marginTop: 20 }}>{error}</div>}

        <section className="panel rise d1" style={{ marginTop: 28, overflow: "hidden" }}>
          <div className="phead">
            <div>
              <h2 className="h2">Źródła danych</h2>
              <div className="psub">Klucze trzymasz w pliku <code className="code">.env</code> w katalogu projektu, nigdy w przeglądarce. Po zmianie uruchom ponownie API.</div>
            </div>
          </div>
          <div className="srow">
            <div>
              <div style={{ fontWeight: 500, fontSize: 14.5, display: "flex", alignItems: "center", gap: 10 }}>OpenStreetMap <span className="pill pill-pos">działa</span></div>
              <div className="psub">Darmowe, nie wymaga klucza.</div>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>zawsze włączone</span>
          </div>
          <KeyRow
            name="Google Places"
            description="Drugie źródło leadów. Darmowy kredyt Google Cloud wystarcza na start."
            envVar="GOOGLE_PLACES_API_KEY"
            configured={status?.google_places}
          />
          <div className="srow">
            <div>
              <div style={{ fontWeight: 500, fontSize: 14.5, display: "flex", alignItems: "center", gap: 10 }}>CEIDG <span className="pill pill-mute">jeszcze niedostępne</span></div>
              <div className="psub">Data rejestracji firmy, czyli sygnał „młoda firma”. Wymaga darmowego tokenu z dane.biznes.gov.pl i jednego testu na żywym API, zanim powstanie konektor.</div>
            </div>
            <code className="code">CEIDG_API_KEY</code>
          </div>
        </section>

        <section className="panel rise d2" style={{ marginTop: 20, overflow: "hidden" }}>
          <div className="phead">
            <div>
              <h2 className="h2">Zabezpieczenia wysyłki</h2>
              <div className="psub">Działają zawsze. Nie da się ich wyłączyć z poziomu aplikacji.</div>
            </div>
          </div>
          {GUARDS.map((g) => (
            <div className="srow" key={g.title}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14.5 }}>{g.title}</div>
                <div className="psub">{g.body}</div>
              </div>
              <span className="switch on" role="img" aria-label="Zawsze włączone" style={{ cursor: "default", opacity: 0.85 }} />
            </div>
          ))}
        </section>

        <section className="panel rise d3" style={{ marginTop: 20, overflow: "hidden" }}>
          <div className="phead">
            <div>
              <h2 className="h2">Nadawca i skrzynka</h2>
              <div className="psub">Też w pliku <code className="code">.env</code>. Podpis z tych danych trafia pod każdy mail.</div>
            </div>
            {mailer?.smtp_is_test && <span className="pill pill-accent">tryb testowy</span>}
          </div>
          <SettingRow label="Imię i nazwisko" env="SENDER_NAME" value={mailer?.sender_name} />
          <SettingRow label="Adres nadawcy" env="SENDER_EMAIL" value={mailer?.sender_email} hint="Adres na Twojej domenie. Bez niego prawdziwa wysyłka jest zablokowana." />
          <SettingRow label="Opis w podpisie" env="SENDER_IDENTITY" value={mailer && !mailer.sender_missing.includes("opis w podpisie") ? "uzupełniony" : ""} />
          <SettingRow
            label="Skrzynka (SMTP)"
            env="SMTP_HOST"
            value={mailer?.smtp_is_test ? "Mailpit, tylko testy (localhost:8025)" : mailer?.smtp_configured ? "podłączona" : ""}
          />
          <SettingRow
            label="Limit dzienny"
            env="DAILY_SEND_LIMIT"
            value={mailer ? `dziś ${mailer.cap_today}, docelowo ${mailer.daily_send_limit}` : undefined}
            hint={mailer && !mailer.warmup_start ? "Ustaw MAILBOX_WARMUP_START na dzień pierwszej wysyłki z nowej skrzynki." : undefined}
          />
        </section>

        <section className="panel rise d3" style={{ marginTop: 20, paddingBottom: 20 }}>
          <div className="phead">
            <div>
              <h2 className="h2">Branże</h2>
              <div className="psub">Kategorie dostępne w wyszukiwaniu.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 22px" }}>
            {Object.values(industries).map((label) => <span className="chip" key={label}>{label}</span>)}
          </div>
        </section>
      </div>
    </>
  );
}

function SettingRow({ label, env, value, hint }: { label: string; env: string; value?: string; hint?: string }) {
  return (
    <div className="srow">
      <div>
        <div style={{ fontWeight: 500, fontSize: 14.5 }}>{label}</div>
        <div className="psub">
          <code className="code">{env}</code>
          {hint && <span style={{ marginLeft: 8 }}>{hint}</span>}
        </div>
      </div>
      {value === undefined ? (
        <span className="faint">…</span>
      ) : value ? (
        <span style={{ fontSize: 13.5, textAlign: "right" }}>{value}</span>
      ) : (
        <span className="pill pill-accent">brak</span>
      )}
    </div>
  );
}

function KeyRow({ name, description, envVar, configured }: { name: string; description: string; envVar: string; configured?: boolean }) {
  return (
    <div className="srow">
      <div>
        <div style={{ fontWeight: 500, fontSize: 14.5, display: "flex", alignItems: "center", gap: 10 }}>
          {name}
          {configured === undefined ? null : configured ? <span className="pill pill-pos">połączone</span> : <span className="pill pill-accent">brak klucza</span>}
        </div>
        <div className="psub">{description}</div>
      </div>
      <code className="code">{envVar}</code>
    </div>
  );
}
