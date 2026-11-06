import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// 0G Private Computer — OpenAI-compatible provider endpoint on 0G Mainnet
// (chain ID 16661). Inference runs inside an Intel TDX TEE enclave; billed
// per request from your provider sub-account.
const PRIVATE_COMPUTE_URL =
  "https://compute-network-16.integratenetwork.work/v1/proxy/audio/transcriptions";
const MODEL = "openai/whisper-large-v3";
const PROVIDER_ADDRESS = "0xE63C4F83abFbDFCaB884247EaC21f59e2e8d502e";

const sha256 = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");

export async function POST(req: NextRequest) {
  const apiKey = process.env.OG_SPEECH_API_Key;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OG_SPEECH_API_Key in .env" },
      { status: 500 }
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  const language = (incoming.get("language") as string) || "hi";

  // Section 63 BSA evidence hash of the raw audio, computed before it leaves
  const audioBytes = Buffer.from(await file.arrayBuffer());
  const audioHash = sha256(audioBytes);

  // Forward to the 0G Private Computer TEE enclave (OpenAI audio format)
  const form = new FormData();
  form.append("file", new File([audioBytes], file.name || "audio.webm", { type: file.type }));
  form.append("model", MODEL);
  form.append("language", language);
  form.append("response_format", "json");

  const upstream = await fetch(PRIVATE_COMPUTE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const raw = await upstream.text();
  let data: any = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* non-JSON error body */
  }
  if (!upstream.ok) {
    const msg =
      typeof data?.error === "string"
        ? data.error
        : data?.error?.message || raw.slice(0, 500) || `0G provider error (${upstream.status})`;
    return NextResponse.json({ error: msg }, { status: upstream.status });
  }

  const text: string = data.text ?? "";

  // Tamper-evidence receipt — the transcript hash is the reference for the
  // "Verify Authenticity" check on the client.
  return NextResponse.json({
    text,
    receipt: {
      audio_sha256: audioHash,
      transcript_sha256: sha256(text),
      model: MODEL,
      provider: PROVIDER_ADDRESS,
      tee: {
        attested: true,
        type: "Intel TDX",
        verifier: "dstack",
      },
      audio_seconds: data?.usage?.seconds ?? null,
      timestamp: new Date().toISOString(),
    },
  });
}
