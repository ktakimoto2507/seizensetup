"use client";
import type { TestResult } from "@/lib/types";

const KEY = "ss_results";

export function appendResult(r: TestResult): void {
  if (typeof window === "undefined") return;
  try {
    const cur = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    cur.push(r);
    window.localStorage.setItem(KEY, JSON.stringify(cur));
  } catch {}
}

export function getResults(): TestResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as TestResult[];
  } catch {
    return [];
  }
}
