import { API_URL } from "./api";
import type { CaseBundle, JudicialCase } from "../data/cases";

// Server-side data access — case data lives in the Elysia backend (SQLite).
export async function fetchCases(): Promise<JudicialCase[]> {
  const res = await fetch(`${API_URL}/api/cases`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Backend returned ${res.status} for /api/cases`);
  return res.json();
}

export async function fetchCase(slug: string): Promise<CaseBundle | null> {
  const res = await fetch(`${API_URL}/api/cases/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend returned ${res.status} for /api/cases/${slug}`);
  return res.json();
}
