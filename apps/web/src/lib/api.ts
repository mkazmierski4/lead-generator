// Server Components fetchują z wnętrza kontenera `web` — tam "localhost" to sam kontener,
// nie kontener `api`, dlatego serwer używa osobnego, wewnątrz-sieciowego adresu.
const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getApiHealth(): Promise<{ status: string } | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
