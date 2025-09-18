import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLocal, saveLocal, type LocalStore } from "./storage";

export async function migrateLocalToDB(supabase: SupabaseClient, userId: string) {
  const local = loadLocal();
  if (local.migrated) return;

  if (local.beneficiaries?.length) {
    await supabase.from("beneficiaries").insert(
      local.beneficiaries.map((b: any) => ({ ...b, user_id: userId }))
    );
  }
  if (local.results?.length) {
    await supabase.from("results").insert(
      local.results.map((r: any) => ({ ...r, user_id: userId }))
    );
  }
  local.migrated = true;
  saveLocal(local);
}

export async function pullFromDB(supabase: SupabaseClient, userId: string) {
  const [ben, res] = await Promise.all([
    supabase.from("beneficiaries").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("results").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const store: LocalStore = {
    migrated: true,
    beneficiaries: ben.data || [],
    results: res.data || [],
  };
  saveLocal(store);
}

export async function saveResult(supabase: SupabaseClient, kind: "ex00"|"deus00"|"machina00", payload: any) {
  const local = loadLocal();
  local.results = [{ kind, payload, created_at: new Date().toISOString() }, ...(local.results || [])];
  saveLocal(local);

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (navigator.onLine && userId) {
    await supabase.from("results").insert({ user_id: userId, kind, payload });
  }
}
