"use client";
/** UIはこのレポだけimport。裏でSupa/localを自動切替 */
import { supabase } from "@/lib/supabase/db";
import * as supaRepo from "@/lib/assets.supa";
import * as localRepo from "@/lib/assets";

export type { Asset } from "@/lib/assets.supa";
export { AssetTypeEnum } from "@/lib/assets.supa";

const FORCE_LOCAL =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FORCE_LOCAL_DRIVER === "1";

function wantLocalByClientHints(): boolean {
  if (FORCE_LOCAL) return true;
  if (typeof window === "undefined") return false;
  const qs = new URLSearchParams(window.location.search);
  if (qs.get("guest") === "1") return true;                    // 例: ?guest=1
  if (localStorage.getItem("sl_driver_local") === "1") return true; // 任意フラグ
  return false;
}

async function pickDriver(): Promise<"supa" | "local"> {
  if (wantLocalByClientHints()) return "local";
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return "supa";
  } catch {}
  return "local";
}

export async function whichDriver() {
  return pickDriver();
}

export async function getAssets(): Promise<supaRepo.Asset[]> {
  const d = await pickDriver();
  if (d === "supa") return supaRepo.getAssets();
  const rows = localRepo.getAssets();
  return Promise.resolve(rows as unknown as supaRepo.Asset[]);
}

export async function addAsset(
  input: Omit<supaRepo.Asset, "id" | "updatedAt">
): Promise<supaRepo.Asset> {
  const d = await pickDriver();
  if (d === "supa") return supaRepo.addAsset(input);
  const created = localRepo.addAsset(input as any);
  return Promise.resolve(created as unknown as supaRepo.Asset);
}

export async function updateAsset(
  id: string,
  patch: Partial<Omit<supaRepo.Asset, "id" | "updatedAt">>
): Promise<supaRepo.Asset | null> {
  const d = await pickDriver();
  if (d === "supa") return supaRepo.updateAsset(id, patch);
  const updated = localRepo.updateAsset(id, patch as any);
  return Promise.resolve(updated as unknown as supaRepo.Asset | null);
}

export async function deleteAsset(id: string): Promise<boolean> {
  const d = await pickDriver();
  if (d === "supa") return supaRepo.deleteAsset(id);
  const ok = localRepo.deleteAsset(id);
  return Promise.resolve(ok);
}
