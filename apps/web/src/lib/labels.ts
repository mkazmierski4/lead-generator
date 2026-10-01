import type { Company, LeadSource, WebsiteStatus } from "./api";

export const MAX_SCORE = 65;

export const STATUS_LABELS: Record<WebsiteStatus, string> = {
  unknown: "niesprawdzona",
  none: "brak strony",
  dead: "nie działa",
  outdated: "przestarzała",
  ok: "strona działa",
};

export const STATUS_TABS: { key: WebsiteStatus | "all"; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "none", label: "Brak strony" },
  { key: "dead", label: "Nie działa" },
  { key: "outdated", label: "Przestarzała" },
  { key: "ok", label: "Działa" },
  { key: "unknown", label: "Niesprawdzone" },
];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  google_places: "Google Places",
  osm: "OpenStreetMap",
  ceidg: "CEIDG",
  krs: "KRS",
  companies_house: "Companies House",
  manual: "wpis ręczny",
};

export type Tone = "accent" | "pos" | "mute";

export function toneOf(c: Pick<Company, "website_status" | "score">): Tone {
  if (c.website_status === "ok") return "pos";
  if (c.website_status === "unknown" || c.score == null) return "mute";
  return "accent";
}

export function initial(name: string): string {
  const letter = name.trim().match(/\p{L}|\d/u)?.[0];
  return (letter ?? "?").toUpperCase();
}

export function primaryContact(c: Company): string {
  const withEmail = c.contacts.find((x) => x.email);
  if (withEmail?.email) return withEmail.verified ? withEmail.email : `${withEmail.email} (odgadnięty)`;
  const phone = c.phone ?? c.contacts.find((x) => x.phone)?.phone;
  return phone ?? "brak danych kontaktowych";
}

export interface Reason {
  text: string;
  points: number | null;
}

// score_explanation to "powód (+N); obserwacja; ..." -- rozbijamy na punkty i same obserwacje.
export function parseReasons(explanation: string | null): Reason[] {
  if (!explanation) return [];
  return explanation
    .split("; ")
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.*?)\s*\(([+-]\d+(?:\.\d+)?)\)$/);
      return m ? { text: m[1], points: Number(m[2]) } : { text: part, points: null };
    });
}

export function formatPoints(p: number): string {
  if (p > 0) return `+${p}`;
  if (p < 0) return `−${Math.abs(p)}`;
  return "0";
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
