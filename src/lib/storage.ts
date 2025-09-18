export const LOCAL_KEY = "seizensetup_store_v1";

export type LocalStore = {
  migrated?: boolean;
  beneficiaries: any[];
  results: Array<{ kind: "ex00"|"deus00"|"machina00"; payload: any; created_at?: string }>;
};

export const loadLocal = (): LocalStore => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || `{"beneficiaries":[],"results":[]}`);
  } catch {
    return { beneficiaries: [], results: [] };
  }
};

export const saveLocal = (store: LocalStore) =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
