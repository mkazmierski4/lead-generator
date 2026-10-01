"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type SettingsStatus } from "@/lib/api";
import { LEADS_CHANGED } from "@/lib/events";
import { IconBan, IconGrid, IconList, IconMail, IconMessage, IconPulse, IconSearch, IconSliders } from "./icons";

const SOON = [
  { label: "Odpowiedzi", Icon: IconMessage },
  { label: "Lista wykluczeń", Icon: IconBan },
  { label: "Dostarczalność", Icon: IconPulse },
];

export function Sidebar() {
  const pathname = usePathname();
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    const load = () => {
      api.stats().then((s) => setTotal(s.total)).catch(() => setTotal(null));
      api.settingsStatus().then(setStatus).catch(() => setStatus(null));
    };
    load();
    window.addEventListener(LEADS_CHANGED, load);
    return () => window.removeEventListener(LEADS_CHANGED, load);
  }, []);

  const isOn = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const cls = (href: string) => (isOn(href) ? "ni on" : "ni");
  const aria = (href: string) => (isOn(href) ? ("page" as const) : undefined);

  return (
    <aside className="side">
      <Link href="/" className="brand" aria-label="Rejestr, pulpit">
        <span className="brand-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#FFFDF9" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M3 4h8M3 7h8M3 10h4.5" />
          </svg>
        </span>
        Rejestr
      </Link>

      <nav className="nav" aria-label="Główna nawigacja">
        <Link href="/" className={cls("/")} aria-current={aria("/")}><IconGrid />Pulpit</Link>
        <Link href="/leady" className={cls("/leady")} aria-current={aria("/leady")}>
          <IconList />Leady{total !== null && <span className="cnt">{total}</span>}
        </Link>
        <Link href="/znajdz" className={cls("/znajdz")} aria-current={aria("/znajdz")}><IconSearch />Znajdź leady</Link>

        <div className="nav-label">Wysyłka</div>
        <Link href="/kampanie" className={cls("/kampanie")} aria-current={aria("/kampanie")}>
          <IconMail />Kampanie
        </Link>

        <div className="nav-label">Monitoring</div>
        {SOON.map(({ label, Icon }) => (
          <div key={label} className="ni off"><Icon />{label}<span className="tag">faza 5</span></div>
        ))}
      </nav>

      <div className="side-foot">
        <Link href="/ustawienia" className={cls("/ustawienia")} aria-current={aria("/ustawienia")}><IconSliders />Ustawienia</Link>
        <div className="src-box">
          <div className="src"><span className="dot-ok" />OpenStreetMap połączone</div>
          <div className="src">
            <span className={status?.google_places ? "dot-ok" : "dot-off"} />
            {status?.google_places ? "Google Places połączone" : "Google Places bez klucza"}
          </div>
        </div>
      </div>
    </aside>
  );
}
