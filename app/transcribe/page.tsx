"use client";

import { useRef, useState } from "react";
import { API_URL } from "../lib/api";

type Receipt = {
  audio_sha256: string;
  transcript_sha256: string;
  model: string;
  provider: string;
  tee: { attested: boolean; type: string; verifier: string };
  audio_seconds: number | null;
  timestamp: string;
};

type VerifyState = "idle" | "authentic" | "tampered";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("hi");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyState>("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = recorder.mimeType?.includes("mp4") ? "mp4" : "webm";
        setAudioURL(URL.createObjectURL(blob));
        transcribe(new File([blob], `recording.${ext}`, { type: blob.type }));
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioURL(URL.createObjectURL(file));
    transcribe(file);
  }

  async function transcribe(file: File) {
    setLoading(true);
    setError("");
    setReceipt(null);
    setVerify("idle");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("language", language);

      const res = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setTranscript(data.text);
      setReceipt(data.receipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAuthenticity() {
    if (!receipt) return;
    const current = await sha256Hex(transcript);
    setVerify(current === receipt.transcript_sha256 ? "authentic" : "tampered");
  }

  return (
    <main className="stt">
      <h1>NyayaTEE</h1>
      <p className="subtitle">
        Confidential courtroom transcription &amp; verifiable evidence ledger
      </p>
      <span className="badge">0G Mainnet · Chain ID 16661 · TEE Enclave</span>

      <div className="card">
        <label htmlFor="language">Deposition language</label>
        <div className="controls" style={{ marginBottom: "1rem" }}>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="hi">Hindi / Hinglish</option>
            <option value="en">English</option>
            <option value="ta">Tamil</option>
            <option value="bn">Bengali</option>
            <option value="mr">Marathi</option>
            <option value="te">Telugu</option>
          </select>
        </div>

        <div className="controls">
          {!recording ? (
            <button onClick={startRecording} disabled={loading}>
              🎙 Record deposition
            </button>
          ) : (
            <button className="secondary" onClick={stopRecording}>
              ⏹ Stop &amp; Transcribe
            </button>
          )}
          {recording && <span className="recording">● Recording…</span>}
          {loading && <span>Processing inside TEE enclave…</span>}
        </div>

        <hr className="divider" />

        <label htmlFor="file">…or upload deposition audio</label>
        <input
          id="file"
          type="file"
          accept="audio/*"
          onChange={onFileChange}
          disabled={loading || recording}
        />
      </div>

      {audioURL && (
        <div className="card">
          <label>Evidence audio</label>
          <audio controls src={audioURL} style={{ width: "100%" }} />
        </div>
      )}

      {(transcript || loading) && (
        <div className="card">
          <label>Transcript (editable — try the tamper test)</label>
          <textarea
            className="transcript"
            rows={6}
            value={transcript}
            disabled={loading}
            onChange={(e) => {
              setTranscript(e.target.value);
              setVerify("idle");
            }}
          />
          {error && <p className="error">{error}</p>}

          {receipt && (
            <div className="controls" style={{ marginTop: "0.75rem" }}>
              <button onClick={verifyAuthenticity}>🔍 Verify Authenticity</button>
              {verify === "authentic" && (
                <span className="ok">✓ Authentic — matches 0G enclave record</span>
              )}
              {verify === "tampered" && (
                <span className="tampered">✗ TAMPERING DETECTED — hash mismatch</span>
              )}
            </div>
          )}
        </div>
      )}

      {receipt && (
        <div className={`card certificate ${verify === "tampered" ? "cert-tampered" : ""}`}>
          <label>Electronic Evidence Certificate · Section 63, Bharatiya Sakshya Adhiniyam 2023</label>
          <dl>
            <dt>Audio SHA-256</dt>
            <dd>{receipt.audio_sha256}</dd>
            <dt>Transcript SHA-256</dt>
            <dd>{receipt.transcript_sha256}</dd>
            <dt>TEE Attestation</dt>
            <dd>
              {receipt.tee.attested ? "✓ Verified" : "✗"} · {receipt.tee.type} ·{" "}
              {receipt.tee.verifier}
            </dd>
            <dt>Model</dt>
            <dd>{receipt.model}</dd>
            <dt>Provider</dt>
            <dd>{receipt.provider}</dd>
            {receipt.audio_seconds != null && (
              <>
                <dt>Audio duration</dt>
                <dd>{receipt.audio_seconds}s</dd>
              </>
            )}
            <dt>Timestamp (UTC)</dt>
            <dd>{receipt.timestamp}</dd>
          </dl>
        </div>
      )}

      <p className="footer">
        Raw testimony is processed inside a hardware-sealed TEE enclave on{" "}
        <a href="https://pc.0g.ai/sdk/models/openai/whisper-large-v3">
          0G Private Computer
        </a>{" "}
        — the node operator cannot inspect the audio or transcript. Explorer:{" "}
        <a href="https://chainscan.0g.ai">chainscan.0g.ai</a>
      </p>
    </main>
  );
}
