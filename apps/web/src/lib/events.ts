// Wysyłane po discovery / enrichment / wykluczeniu, żeby sidebar i pulpit odświeżyły liczniki.
export const LEADS_CHANGED = "leads:changed";

export function notifyLeadsChanged(): void {
  window.dispatchEvent(new Event(LEADS_CHANGED));
}
