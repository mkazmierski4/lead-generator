import { Topbar } from "@/components/Topbar";

const STEPS = [
  { title: "Osobna domena pod cold mailing", body: "Chroni główną domenę, jeśli coś pójdzie nie tak z reputacją." },
  { title: "Skrzynka pocztowa", body: "Google Workspace albo Zoho Mail na tej domenie." },
  { title: "SPF, DKIM i DMARC", body: "Bez tych rekordów DNS maile lądują w spamie niezależnie od treści." },
  { title: "Rozgrzanie skrzynki", body: "3 do 4 tygodni, od 5–10 maili dziennie do docelowych 20–50." },
];

export default function KampaniePage() {
  return (
    <>
      <Topbar />
      <div className="content">
        <div className="rise">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="title">Kampanie</h1>
            <span className="pill pill-accent">faza 4</span>
          </div>
          <p className="sub">
            Kampania łączy zatwierdzone leady, szablon maila i harmonogram wysyłki ze wspólnym dziennym limitem. Najpierw trzeba
            przygotować skrzynkę, żeby maile nie trafiały do spamu.
          </p>
        </div>

        <div className="grid-2" style={{ marginTop: 28, gridTemplateColumns: "1.25fr 1fr" }}>
          <section className="panel rise d1" style={{ overflow: "hidden" }}>
            <div style={{ padding: "20px 22px 4px" }}><h2 className="h2">Zanim ruszy pierwsza kampania</h2></div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {STEPS.map((s, i) => (
                <li className="step" key={s.title}>
                  <span className="stepn" aria-hidden="true">{i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14.5 }}>{s.title}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{s.body}</div>
                  </div>
                  <span className="pill pill-mute">do zrobienia</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel rise d2" style={{ padding: "20px 22px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 className="h2">Tak będzie wyglądać kampania</h2>
              <span className="faint" style={{ fontSize: 12 }}>podgląd</span>
            </div>
            <div style={{ borderRadius: 14, background: "var(--white)", border: "1px solid var(--line)", padding: 20 }} aria-hidden="true">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5 }}>Kawiarnie, Zakopane</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>Szablon: pierwsza wiadomość, PL</div>
                </div>
                <span className="pill pill-mute">szkic</span>
              </div>
              <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 20 }}>
                <span>Dziś wysłano</span><span className="num">0 / 20</span>
              </div>
              <div style={{ height: 6, borderRadius: 6, background: "var(--mute-soft)", marginTop: 7 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 20 }}>
                {["wysłane", "odpowiedzi", "wypisani"].map((l) => (
                  <div key={l}><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>—</div><div className="muted" style={{ fontSize: 12 }}>{l}</div></div>
                ))}
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: "14px 0 0" }}>
              Każda wysyłka zaczyna się w trybie próbnym. Prawdziwe maile wychodzą dopiero po Twoim potwierdzeniu.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
