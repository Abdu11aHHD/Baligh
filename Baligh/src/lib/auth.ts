import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseServer } from "./supabase/server";

export interface AdminSession {
  user: Pick<User, "id" | "email">;
  role: "admin" | "staff";
  supabase: SupabaseClient;
}

/**
 * Verifies the session with Supabase Auth (getUser validates the JWT against
 * the auth server — never trust getSession() alone on the server) and checks
 * the admin_users table. No client-side flag is ever trusted.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: row } = await supabase.from("admin_users").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!row) return null;
  return { user: { id: data.user.id, email: data.user.email }, role: row.role, supabase };
}

export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
