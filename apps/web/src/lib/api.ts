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

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type SendStatus = "queued" | "sent" | "bounced" | "opened" | "replied" | "unsubscribed" | "failed" | "skipped";

export interface Campaign {
  id: string;
  name: string;
  language: string;
  subject_template: string;
  body_template: string;
  allow_guessed_emails: boolean;
  status: CampaignStatus;
  created_at: string;
  counts: Record<SendStatus, number>;
  sending: boolean;
}

export interface CampaignInput {
  name: string;
  subject_template: string;
  body_template: string;
  allow_guessed_emails: boolean;
}

export interface QueueItem {
  id: string;
  company_id: string;
  company_name: string;
  city: string | null;
  industry: string | null;
  email: string | null;
  status: SendStatus;
  sent_at: string | null;
  error: string | null;
  subject: string | null;
  body: string | null;
}

export interface RenderedMail {
  company_id: string | null;
  company_name: string;
  email: string | null;
  subject: string;
  body: string;
  context?: Record<string, string>;
}

export interface MailerStatus {
  sender_configured: boolean;
  sender_missing: string[];
  sender_name: string;
  sender_email: string;
  smtp_configured: boolean;
  smtp_is_test: boolean;
  cap_today: number;
  sent_today: number;
  remaining_today: number;
  daily_send_limit: number;
  warmup_start: string | null;
  send_delay_min_s: number;
  send_delay_max_s: number;
  variables: Record<string, string>;
}

export interface StarterTemplate {
  key: string;
  name: string;
  for: string;
  description: string;
  subject: string;
  body: string;
}

export interface SendPlan {
  dry_run: boolean;
  would_send: number;
  queued: number;
  remaining_today: number;
  started: boolean;
}

export interface CompanySend {
  id: string;
  campaign_id: string;
  campaign_name: string;
  status: SendStatus;
  email: string | null;
  sent_at: string | null;
  created_at: string;
  error: string | null;
}

export interface QueueResult {
  queued: number;
  skipped: { company_id: string; name: string; reason: string }[];
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

  companySends: (id: string) => request<CompanySend[]>(`/companies/${id}/sends`),
  mailerStatus: () => request<MailerStatus>("/campaigns/meta"),
  starters: () => request<StarterTemplate[]>("/campaigns/starters"),
  campaigns: () => request<Campaign[]>("/campaigns"),
  campaign: (id: string) => request<Campaign>(`/campaigns/${id}`, undefined, "Nie udało się pobrać kampanii"),
  createCampaign: (input: CampaignInput) => request<Campaign>("/campaigns", json(input), "Nie udało się zapisać kampanii"),
  updateCampaign: (id: string, input: Partial<CampaignInput>) =>
    request<Campaign>(`/campaigns/${id}`, { ...json(input), method: "PATCH" }, "Nie udało się zapisać kampanii"),
  deleteCampaign: async (id: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/campaigns/${id}`, { method: "DELETE" });
    } catch {
      throw new Error("API nie odpowiada.");
    }
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Nie udało się usunąć kampanii");
  },
  render: (subject_template: string, body_template: string, company_id?: string) =>
    request<RenderedMail>("/campaigns/render", json({ subject_template, body_template, company_id }), "Nie udało się wygenerować podglądu"),
  queue: (id: string) => request<QueueItem[]>(`/campaigns/${id}/queue${buildQuery({ limit: 500 })}`),
  addToQueue: (id: string, company_ids: string[]) =>
    request<QueueResult>(`/campaigns/${id}/queue`, json({ company_ids }), "Nie udało się dodać firm do kampanii"),
  removeFromQueue: async (id: string, logId: string) => {
    const res = await fetch(`${API_URL}/campaigns/${id}/queue/${logId}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) throw new Error((await res?.json().catch(() => null))?.detail ?? "Nie udało się usunąć z kolejki");
  },
  sendPlan: (id: string) => request<SendPlan>(`/campaigns/${id}/send`, json({ dry_run: true })),
  sendForReal: (id: string) => request<SendPlan>(`/campaigns/${id}/send`, json({ dry_run: false }), "Nie udało się rozpocząć wysyłki"),
  stopSending: (id: string) => request<{ stopping: boolean }>(`/campaigns/${id}/stop`, { method: "POST" }),
  sendTest: async (id: string, to: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/campaigns/${id}/test`, json({ to }));
    } catch {
      throw new Error("API nie odpowiada.");
    }
    if (!res.ok) {
      const detail = (await res.json().catch(() => null))?.detail;
      throw new Error(typeof detail === "string" ? detail : Array.isArray(detail) ? "Podaj poprawny adres e-mail" : "Nie udało się wysłać testu");
    }
  },
};
