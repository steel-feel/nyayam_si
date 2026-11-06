import { NextResponse } from "next/server";

// Mints a short-lived AssemblyAI streaming token so the browser can open a
// Universal-Streaming WebSocket without the API key ever leaving the server.
// https://assemblyai.com/docs/temporary-tokens
const TOKEN_URL = "https://token.assemblyai.com/v1/token";

export async function POST() {
  const apiKey = process.env.ASSEMBLY_AI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ASSEMBLY_AI_KEY in .env" },
      { status: 500 }
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product: "streaming", expires_in_seconds: 60 }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    return NextResponse.json(
      { error: data?.error || `Token request failed (${res.status})` },
      { status: res.ok ? 502 : res.status }
    );
  }

  return NextResponse.json({ token: data.token });
}
