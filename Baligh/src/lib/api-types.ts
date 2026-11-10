import type { Category, Department, Priority, Status, Subcategory } from "./constants";

export interface LocationOption {
  id: string;
  code: string;
  name_ar: string;
  building?: string | null;
  floor?: string | null;
}

export interface TicketDraftDTO {
  title: string;
  summary: string;
  category: Category;
  subcategory: Subcategory;
  priority: Priority;
  priorityReason: string;
  department: Department;
}

export interface AnalyzeResponse {
  status: "ready" | "needs_clarification";
  reply: string;
  question: string | null;
  draft: TicketDraftDTO | null;
  aiPriority: Priority;
  safety: { flags: string[]; immediateDanger: boolean; raisedPriority: boolean; minPriority: Priority | null };
  location: LocationOption | null;
  locationText: string | null;
  missingFields: string[];
  model: string;
  analysisToken: string | null;
}

export interface CreateReportResponse {
  ticketNumber: string;
  trackingSecret: string;
  createdAt: string;
  priority: Priority;
  immediateDanger: boolean;
}

export interface TrackResponse {
  ticketNumber: string;
  title: string;
  summary: string;
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  location: string | null;
  history: Array<{ event_type: string; previous_status: Status | null; new_status: Status | null; created_at: string }>;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class ApiRequestError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Client-side JSON fetch with a timeout and Arabic fallback messages. */
export async function apiFetch<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 70_000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (data as ApiErrorPayload | null)?.error;
      throw new ApiRequestError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? "تعذّر إكمال الطلب. حاول مرة أخرى.");
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiRequestError) throw e;
    if ((e as Error).name === "AbortError") throw new ApiRequestError(0, "CLIENT_TIMEOUT", "انتهت مهلة الطلب. تحقق من اتصالك وأعد المحاولة.");
    throw new ApiRequestError(0, "NETWORK", "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
  } finally {
    clearTimeout(timer);
  }
}

export const TICKETS_STORAGE_KEY = "balligh:tickets:v1";

export interface SavedTicket {
  ticketNumber: string;
  secret: string;
  title: string;
  createdAt: string;
}

export function loadSavedTickets(): SavedTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((t) => t && typeof t.ticketNumber === "string" && typeof t.secret === "string").slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

export function saveTicket(t: SavedTicket) {
  try {
    const list = [t, ...loadSavedTickets().filter((x) => x.ticketNumber !== t.ticketNumber)].slice(0, 20);
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage may be unavailable (private mode); tracking still works with the shown code.
  }
}

export function removeSavedTicket(ticketNumber: string) {
  try {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(loadSavedTickets().filter((x) => x.ticketNumber !== ticketNumber)));
  } catch {
    /* ignore */
  }
}

export function trackingLink(ticketNumber: string, secret: string): string {
  // The fragment never reaches servers or logs.
  return `/track#${ticketNumber}.${secret}`;
}
