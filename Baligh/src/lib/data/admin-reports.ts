import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CATEGORIES, PRIORITIES, STATUSES, type Category, type Department, type Priority, type Status, type Subcategory } from "../constants";

export const reportFiltersSchema = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  status: z.enum(STATUSES).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  priority: z.enum(PRIORITIES).optional().catch(undefined),
  location: z.uuid().optional().catch(undefined),
  sort: z.enum(["newest", "oldest"]).default("newest").catch("newest"),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const PAGE_SIZE = 20;

export interface ReportListItem {
  id: string;
  ticket_number: string;
  title: string;
  category: Category;
  priority: Priority;
  status: Status;
  assigned_department: Department;
  created_at: string;
  location_text: string | null;
  safety_flags: string[];
  locations: { name_ar: string; code: string } | null;
}

export interface ReportDetail extends ReportListItem {
  raw_description: string;
  clarifications: Array<{ question: string; answer: string }>;
  summary: string;
  subcategory: Subcategory;
  ai_title: string;
  ai_category: Category;
  ai_priority: Priority;
  ai_department: Department;
  ai_priority_reason: string | null;
  ai_model: string;
  safety_min_priority: Priority | null;
  updated_at: string;
  resolved_at: string | null;
}

export interface ReportEvent {
  id: string;
  event_type: "created" | "status_changed" | "priority_changed" | "department_changed" | "note";
  previous_status: Status | null;
  new_status: Status | null;
  previous_value: string | null;
  new_value: string | null;
  admin_note: string | null;
  is_internal: boolean;
  created_at: string;
}

const LIST_FIELDS =
  "id, ticket_number, title, category, priority, status, assigned_department, created_at, location_text, safety_flags, locations(name_ar, code)";

/** Escapes characters that carry meaning inside PostgREST `or()` / ilike filters. */
function sanitizeSearch(q: string): string {
  return q.replace(/[%_,().*\\:"']/g, " ").replace(/\s+/g, " ").trim();
}

export async function listReports(supabase: SupabaseClient, filters: ReportFilters) {
  let query = supabase.from("reports").select(LIST_FIELDS, { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.location) query = query.eq("location_id", filters.location);
  if (filters.q) {
    const q = sanitizeSearch(filters.q);
    if (/^blg-?\d+$/i.test(q)) {
      const digits = q.replace(/\D/g, "").padStart(6, "0");
      query = query.eq("ticket_number", `BLG-${digits}`);
    } else if (q) {
      query = query.or(`ticket_number.ilike.%${q}%,title.ilike.%${q}%`);
    }
  }
  const from = (filters.page - 1) * PAGE_SIZE;
  query = query.order("created_at", { ascending: filters.sort === "oldest" }).range(from, from + PAGE_SIZE - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as unknown as ReportListItem[], total: count ?? 0 };
}

export async function getReportDetail(supabase: SupabaseClient, id: string) {
  const [{ data: report, error }, { data: events, error: evError }] = await Promise.all([
    supabase
      .from("reports")
      .select(`${LIST_FIELDS}, raw_description, clarifications, summary, subcategory, ai_title, ai_category, ai_priority, ai_department, ai_priority_reason, ai_model, safety_min_priority, updated_at, resolved_at`)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("report_events").select("*").eq("report_id", id).order("created_at", { ascending: true }),
  ]);
  if (error) throw error;
  if (evError) throw evError;
  if (!report) return null;
  return { report: report as unknown as ReportDetail, events: (events ?? []) as ReportEvent[] };
}

export interface ReportStats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  urgent_open: number;
  by_category: Partial<Record<Category, number>>;
}

export async function getReportStats(supabase: SupabaseClient): Promise<ReportStats> {
  const { data, error } = await supabase.rpc("admin_report_stats");
  if (error) throw error;
  return data as ReportStats;
}
