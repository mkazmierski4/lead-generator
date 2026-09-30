"use client";

import { useState } from "react";
import { runEnrichment } from "@/lib/api";

export function EnrichmentButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await runEnrichment(100);
      setMessage(res.processed > 0 ? `Wzbogacono ${res.processed} firm.` : "Brak nowych firm do wzbogacenia.");
      onDone();
    } catch {
      setMessage("Wzbogacanie nie powiodło się.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-paper transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {busy ? "Wzbogacam…" : "Wzbogać nowe"}
      </button>
      {message && <span className="text-sm text-ink-muted">{message}</span>}
    </div>
  );
}
