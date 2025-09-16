"use client";

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(plain: string): Promise<string> {
  const hex = await sha256Hex(plain);
  return `sha256:${hex}`;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  if (!hashed.startsWith("sha256:")) return false;
  const hex = await sha256Hex(plain);
  return hashed === `sha256:${hex}`;
}
