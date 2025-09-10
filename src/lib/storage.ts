"use client";

export const storage = {
  saveJSON<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  loadJSON<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  },
  remove(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};
