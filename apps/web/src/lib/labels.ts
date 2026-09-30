import type { LeadSource, WebsiteStatus } from "./api";

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  unknown: "niesprawdzona",
  none: "brak strony",
  dead: "strona nie działa",
  outdated: "strona przestarzała",
  ok: "strona działa",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  google_places: "Google Places",
  osm: "OpenStreetMap",
  ceidg: "CEIDG",
  krs: "KRS",
  companies_house: "Companies House",
  manual: "wpis ręczny",
};

// Leady, na które warto od razu zerknąć -- akcent koloru jest zarezerwowany tylko dla nich.
export function isActionable(status: WebsiteStatus, score: number | null): boolean {
  return status !== "ok" && status !== "unknown" && (score ?? 0) > 0;
}
