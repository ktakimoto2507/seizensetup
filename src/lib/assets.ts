import { z } from "zod";

// ---- Domain model ----
export const AssetTypeEnum = z.enum([
  "bank",         // 銀行預金
  "security",     // 証券（株/投信/債券）
  "real_estate",  // 不動産
  "insurance",    // 保険
  "pension",      // 年金
  "digital",      // デジタル資産（サブスク/アカウント/暗号資産 等）
  "other",        // その他
]);

export const AssetSchema = z.object({
  id: z.string().uuid(),
  type: AssetTypeEnum,
  name: z.string().min(1, "名称は必須です"),
  amount: z.number().finite().nonnegative().default(0),
  currency: z.enum(["JPY", "USD"]).default("JPY"),
  note: z.string().max(1000).optional().nullable(),
  updatedAt: z.string(), // ISO8601
});

export type Asset = z.infer<typeof AssetSchema>;

const STORAGE_KEY = "sl_assets_v1";

// ---- Helpers ----
function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ---- CRUD on localStorage ----
export function getAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  const arr = safeParse<unknown[]>(raw, []);
  // 型安全に整形（壊れたデータは弾く）
  const parsed: Asset[] = [];
  for (const item of arr) {
    const res = AssetSchema.safeParse(item);
    if (res.success) parsed.push(res.data);
  }
  return parsed;
}

function setAssets(assets: Asset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

export function addAsset(input: Omit<Asset, "id" | "updatedAt">): Asset {
  const asset: Asset = {
    ...input,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
  const list = getAssets();
  list.unshift(asset); // 新しい順
  setAssets(list);
  return asset;
}

export function updateAsset(id: string, patch: Partial<Omit<Asset, "id">>): Asset | null {
  const list = getAssets();
  const idx = list.findIndex(a => a.id === id);
  if (idx === -1) return null;
  const merged = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  const parsed = AssetSchema.safeParse(merged);
  if (!parsed.success) return null;
  list[idx] = parsed.data;
  setAssets(list);
  return parsed.data;
}

export function deleteAsset(id: string): boolean {
  const list = getAssets();
  const next = list.filter(a => a.id !== id);
  setAssets(next);
  return next.length !== list.length;
}
