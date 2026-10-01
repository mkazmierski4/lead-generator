// Wywoływane z przeglądarki -- używa publicznego portu API na hoście, nie adresu wewnątrz sieci Dockera.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type WebsiteStatus = "unknown" | "none" | "dead" | "outdated" | "ok";
export type LeadSource = "google_places" | "osm" | "ceidg" | "krs" | "companies_house" | "manual";

export interface Contact {
  id: string;
  email: string | null;
  phone: string | null;
  verified: boolean;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  country: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  website_status: WebsiteStatus;
  registered_at: string | null;
  source: LeadSource;
  score: number | null;
  score_explanation: string | null;
  enriched_at: string | null;
  excluded_at: string | null;
  created_at: string;
  contacts: Contact[];
}

export interface CompanyFilters {
  country?: string;
  industry?: string;
  website_status?: WebsiteStatus;
  min_score?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CompanyStats {
  total: number;
  ready: number;
  enriched: number;
  awaiting_enrichment: number;
  by_status: Record<WebsiteStatus, number>;
}

export interface DiscoveryRunPayload {
  country: string;
  city: string;
  industry: string;
  sources: string[];
}

export interface DiscoveryRunResult {
  found: number;
  created: number;
  skipped_duplicate: number;
  skipped_sources: string[];
}

export interface Run {
  id: string;
  kind: "discovery" | "enrichment";
  params: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

export interface SettingsStatus {
  google_places: boolean;
  ceidg: boolean;
  smtp: boolean;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, string | number | undefined>)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request<T>(path: string, init?: RequestInit, fallbackError = "Nie udało się połączyć z API"): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error("API nie odpowiada. Sprawdź, czy działa `docker compose up`.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    if (typeof detail === "string") throw new Error(detail);
    if (Array.isArray(detail) && detail[0]?.msg) throw new Error(String(detail[0].msg).replace(/^Value error, /, ""));
    throw new Error(fallbackError);
  }
  return res.json();
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  industries: () => request<Record<string, string>>("/discovery/industries"),
  companies: (filters: CompanyFilters) => request<Company[]>(`/companies${buildQuery(filters)}`),
  company: (id: string) => request<Company>(`/companies/${id}`, undefined, "Nie udało się pobrać firmy"),
  stats: (filters: Pick<CompanyFilters, "country" | "industry" | "q"> = {}) =>
    request<CompanyStats>(`/companies/stats${buildQuery(filters)}`),
  runs: (kind?: Run["kind"], limit = 8) => request<Run[]>(`/runs${buildQuery({ kind, limit })}`),
  settingsStatus: () => request<SettingsStatus>("/settings/status"),
  runDiscovery: (payload: DiscoveryRunPayload) =>
    request<DiscoveryRunResult>("/discovery/run", json(payload), "Wyszukiwanie nie powiodło się"),
  runEnrichment: (limit: number) =>
    request<{ processed: number }>(`/enrichment/run${buildQuery({ limit })}`, { method: "POST" }, "Wzbogacanie nie powiodło się"),
  exclude: (id: string) => request<Company>(`/companies/${id}/exclude`, { method: "POST" }, "Nie udało się wykluczyć firmy"),
  addContact: (id: string, contact: { email?: string; phone?: string }) =>
    request<Company>(`/companies/${id}/contacts`, json(contact), "Nie udało się zapisać kontaktu"),
  exportCsvUrl: (filters: Pick<CompanyFilters, "country" | "industry" | "website_status" | "min_score" | "q">) =>
    `${API_URL}/companies/export.csv${buildQuery(filters)}`,
};
