import type { Run } from "@/lib/api";
import { formatDateTime, plural } from "@/lib/labels";

export function describeRun(run: Run, industries: Record<string, string>): { title: string; warning: string | null } {
  if (run.kind === "enrichment") {
    const n = Number(run.result.processed ?? 0);
    return { title: `Wzbogacono ${n} ${plural(n, "firmę", "firmy", "firm")}`, warning: null };
  }
  const industry = industries[String(run.params.industry)] ?? String(run.params.industry ?? "");
  const city = String(run.params.city ?? "");
  const created = Number(run.result.created ?? 0);
  const skipped = (run.result.skipped_sources as string[] | undefined) ?? [];
  return {
    title: `${industry}, ${city}: ${created} ${plural(created, "nowa", "nowe", "nowych")}`,
    warning: skipped.length ? `Pominięte: ${skipped.map((s) => (s === "osm" ? "OpenStreetMap" : "Google Places")).join(", ")}` : null,
  };
}

export function RunLine({ run, industries }: { run: Run; industries: Record<string, string> }) {
  const { title, warning } = describeRun(run, industries);
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
        {formatDateTime(run.created_at)}
        {warning && <span style={{ color: "var(--accent)", marginLeft: 10 }}>{warning}</span>}
      </div>
    </>
  );
}
