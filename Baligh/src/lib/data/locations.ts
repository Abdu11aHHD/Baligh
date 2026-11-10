import "server-only";
import { getSupabaseAdmin } from "../supabase/admin";

export interface PublicLocation {
  id: string;
  code: string;
  name_ar: string;
  building: string | null;
  floor: string | null;
  area: string | null;
}

const PUBLIC_FIELDS = "id, code, name_ar, building, floor, area";

export type LocationLookup =
  | { status: "ok"; location: PublicLocation }
  | { status: "inactive" }
  | { status: "unknown" };

export async function resolveLocationByCode(code: string): Promise<LocationLookup> {
  const { data, error } = await getSupabaseAdmin()
    .from("locations")
    .select(`${PUBLIC_FIELDS}, is_active`)
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: "unknown" };
  if (!data.is_active) return { status: "inactive" };
  const { is_active: _active, ...location } = data;
  void _active;
  return { status: "ok", location };
}

export async function getActiveLocationById(id: string): Promise<PublicLocation | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("locations")
    .select(PUBLIC_FIELDS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listActiveLocations(): Promise<PublicLocation[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("locations")
    .select(PUBLIC_FIELDS)
    .eq("is_active", true)
    .order("name_ar");
  if (error) throw error;
  return data ?? [];
}
