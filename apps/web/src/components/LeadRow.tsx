"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Company } from "@/lib/api";
import { MAX_SCORE, STATUS_LABELS, formatPoints, initial, parseReasons, primaryContact, toneOf } from "@/lib/labels";
import { IconChevron } from "./icons";

export function LeadRow({
  company,
  industryLabel,
  open,
  onToggle,
  onExclude,
  selected,
  onSelect,
}: {
  company: Company;
  industryLabel: string;
  open: boolean;
  onToggle: () => void;
  onExclude: (id: string) => Promise<void>;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = toneOf(company);
  const reasons = parseReasons(company.score_explanation);
  const scorePct = company.score == null ? 0 : Math.max(0, Math.min(100, (company.score / MAX_SCORE) * 100));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  async function exclude() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      await onExclude(company.id);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const detailId = `lead-${company.id}`;

  return (
    <div className={["lrow", open && "open", selected && "sel"].filter(Boolean).join(" ")}>
      <div style={{ display: "flex", alignItems: "center" }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`Zaznacz ${company.name}`}
        className={selected ? "cb on" : "cb"}
        style={{ marginLeft: 22 }}
        onClick={onSelect}
      >
        <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5l3.2 3.2L14 5.5" /></svg>
      </button>
      <button type="button" className="lrow-head" style={{ paddingLeft: 14, flex: 1, minWidth: 0, width: "auto" }} onClick={onToggle} aria-expanded={open} aria-controls={detailId}>
        <span className={`mono mono-${tone}`}>{initial(company.name)}</span>
        <span style={{ minWidth: 0 }}>
          <span className="lrow-name">{company.name}</span>
          <span className="lrow-meta">
            <span>{industryLabel}{company.city ? `, ${company.city}` : ""}</span>
            <span>{primaryContact(company)}</span>
          </span>
        </span>
        <span className="status-cell"><span className={`pill pill-${tone}`}>{STATUS_LABELS[company.website_status]}</span></span>
        <span className="scorebox">
          <span className="score">{company.score == null ? "—" : Math.round(company.score)}</span>
          <span className="sbar"><i className={`fill fill-${tone}`} style={{ width: `${scorePct}%` }} /></span>
        </span>
        <IconChevron size={16} className={open ? "chev open" : "chev"} />
      </button>
      </div>

      {open && (
        <div className="lrow-detail" id={detailId}>
          <div className="reasons">
            {reasons.length === 0 ? (
              <div className="reason"><span className="muted">Jeszcze nie wzbogacona. Uruchom „Wzbogać nowe”, żeby ocenić stronę i znaleźć kontakt.</span></div>
            ) : (
              reasons.map((r, i) => (
                <div className="reason" key={i}>
                  <span className={r.points === null ? "muted" : undefined}>{r.text}</span>
                  {r.points !== null && <span className={r.points > 0 ? "rv pos" : "rv neg"}>{formatPoints(r.points)}</span>}
                </div>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-quiet" onClick={exclude} disabled={busy} style={confirming ? { color: "var(--accent)" } : undefined}>
              {busy ? "Wykluczam…" : confirming ? "Na pewno? Kliknij ponownie" : "Wyklucz"}
            </button>
            <Link href={`/leady/${company.id}`} className="btn btn-ghost">Otwórz kartę firmy</Link>
          </div>
        </div>
      )}
    </div>
  );
}
