"use client";

import { useState } from "react";
import type { Company } from "@/lib/api";
import { SOURCE_LABELS, WEBSITE_STATUS_LABELS, isActionable } from "@/lib/labels";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
}

export function LeadRow({ company, industryLabel }: { company: Company; industryLabel: string }) {
  const [open, setOpen] = useState(false);
  const actionable = isActionable(company.website_status, company.score);
  const contact = company.contacts[0];
  const reasons = company.score_explanation?.split("; ").filter(Boolean) ?? [];

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 py-4 pl-4 pr-2 text-left hover:bg-paper-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
        style={{ borderLeft: `2px solid ${actionable ? "var(--signal)" : "transparent"}` }}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate font-serif text-lg font-medium">{company.name}</span>
            <span className="flex shrink-0 items-baseline gap-3">
              <span className={`text-sm ${actionable ? "text-signal" : "text-ink-muted"}`}>
                {WEBSITE_STATUS_LABELS[company.website_status]}
              </span>
              <span className="font-mono text-sm tabular-nums text-ink-muted w-10 text-right">
                {company.score != null ? Math.round(company.score) : "—"}
              </span>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-ink-muted">
            <span>
              {industryLabel}
              {company.city ? `, ${company.city}` : ""}
            </span>
            <span>
              {contact?.email
                ? `${contact.email}${contact.verified ? "" : " (niepotwierdzony)"}`
                : company.phone
                  ? company.phone
                  : "brak danych kontaktowych"}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="pb-5 pl-6 pr-4">
          {reasons.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm text-ink-muted">
              {reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {company.address && (
              <>
                <dt className="text-ink-muted">Adres</dt>
                <dd>{company.address}</dd>
              </>
            )}
            {company.website_url && (
              <>
                <dt className="text-ink-muted">Strona</dt>
                <dd>
                  <a href={company.website_url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                    {company.website_url}
                  </a>
                </dd>
              </>
            )}
            {company.registered_at && (
              <>
                <dt className="text-ink-muted">Zarejestrowana</dt>
                <dd>{formatDate(company.registered_at)}</dd>
              </>
            )}
            <dt className="text-ink-muted">Źródło</dt>
            <dd>{SOURCE_LABELS[company.source]}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
