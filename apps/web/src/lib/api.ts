// Wywoływane z przeglądarki (komponenty klienckie) -- używa publicznego portu API na hoście,
// nie wewnątrz-sieciowego adresu Dockera (ten jest tylko dla fetchy server-side, patrz Faza 0).
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
  created_at: string;
  contacts: Contact[];
}

export interface CompanyFilters {
  country?: string;
  industry?: string;
  website_status?: WebsiteStatus;
  min_score?: number;
  limit?: number;
  offset?: number;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, string | number | undefined>)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchIndustries(): Promise<Record<string, string>> {
  const res = await fetch(`${API_URL}/discovery/industries`);
  if (!res.ok) throw new Error("Nie udało się pobrać listy branż");
  return res.json();
}

export async function fetchCompanies(filters: CompanyFilters): Promise<Company[]> {
  const res = await fetch(`${API_URL}/companies${buildQuery(filters)}`);
  if (!res.ok) throw new Error("Nie udało się pobrać listy firm");
  return res.json();
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

export async function runDiscovery(payload: DiscoveryRunPayload): Promise<DiscoveryRunResult> {
  const res = await fetch(`${API_URL}/discovery/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Wyszukiwanie leadów nie powiodło się");
  }
  return res.json();
}

export interface EnrichmentRunResult {
  processed: number;
}

export async function runEnrichment(limit: number): Promise<EnrichmentRunResult> {
  const res = await fetch(`${API_URL}/enrichment/run${buildQuery({ limit })}`, { method: "POST" });
  if (!res.ok) throw new Error("Wzbogacanie leadów nie powiodło się");
  return res.json();
}

export function exportCompaniesCsvUrl(filters: Pick<CompanyFilters, "country" | "industry" | "website_status" | "min_score">): string {
  return `${API_URL}/companies/export.csv${buildQuery(filters)}`;
}
