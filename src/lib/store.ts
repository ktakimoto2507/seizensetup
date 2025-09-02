"use client";

import { create } from "zustand";

export type Beneficiary = { id: string; name: string; percent: number };

export type Profile = {
  name: string;
  email: string;
  phone: string;
  dob?: string; // ISO yyyy-mm-dd
  password: string;
};

export type Address = {
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  line1: string; // 番地・建物
};

type AppState = {
  profile: Profile;
  address: Address;
  beneficiaries: Beneficiary[];
  step: 0 | 1 | 2 | 3; // 0: onboarding, 1: kyc, 2: assets, 3: review

  setProfile: (p: Partial<Profile>) => void;
  setAddress: (a: Partial<Address>) => void;
  setBeneficiaries: (b: Beneficiary[]) => void;
  setStep: (s: AppState["step"]) => void;
  resetAll: () => void;
};

// --- シンプルなpersist（自前実装） ---
const KEY = "seizensetup_store_v1";

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

const defaultState: AppState = {
  profile: { name: "", email: "", phone: "", dob: "", password: "" },
  address: { postalCode: "", prefecture: "", city: "", town: "", line1: "" },
  beneficiaries: [
    { id: "b1", name: "受益者A", percent: 50 },
    { id: "b2", name: "受益者B", percent: 30 },
    { id: "b3", name: "受益者C", percent: 20 },
  ],
  step: 0,
  setProfile: () => {},
  setAddress: () => {},
  setBeneficiaries: () => {},
  setStep: () => {},
  resetAll: () => {},
};

export const useAppStore = create<AppState>((set, get) => {
  // 初期化：localStorageから復元
  let initial = defaultState;
  if (typeof window !== "undefined") {
    const loaded = load();
    if (loaded) initial = { ...defaultState, ...loaded };
  }

  // ミューテーション実体
  const api = {
    ...initial,
    setProfile: (p: Partial<Profile>) =>
      set((s) => {
        const next = { ...s, profile: { ...s.profile, ...p } };
        save(next as AppState);
        return next;
      }),
    setAddress: (a: Partial<Address>) =>
      set((s) => {
        const next = { ...s, address: { ...s.address, ...a } };
        save(next as AppState);
        return next;
      }),
    setBeneficiaries: (b: Beneficiary[]) =>
      set((s) => {
        const next = { ...s, beneficiaries: b };
        save(next as AppState);
        return next;
      }),
    setStep: (step: AppState["step"]) =>
      set((s) => {
        const next = { ...s, step };
        save(next as AppState);
        return next;
      }),
    resetAll: () => {
      save(defaultState);
      set(defaultState);
    },
  };

  return api;
});

// ===== ここから追記（エクスポート/インポート補助） =====
export type Persisted = Pick<AppState, "profile" | "address" | "beneficiaries" | "step">;

export function getPersisted(): Persisted {
  const s = useAppStore.getState();
  return {
    profile: s.profile,
    address: s.address,
    beneficiaries: s.beneficiaries,
    step: s.step,
  };
}

export function importPersisted(data: Persisted) {
  // 既存状態にマージして保存
  const cur = useAppStore.getState();
  const next = { ...cur, ...data };
  useAppStore.setState(next);
  // 永続化
  try {
    localStorage.setItem("seizensetup_store_v1", JSON.stringify(next));
  } catch {}
}
// ===== 追記ここまで =====

