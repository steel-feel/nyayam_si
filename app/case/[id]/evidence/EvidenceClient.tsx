"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../../../lib/api";

type Evidence = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  sha256: string;
  label: string | null;
  status: string; // analysing | analysed | failed
  analysis: string | null;
  model: string | null;
  provider: string | null;
  created_at: string;
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function EvidenceClient({
  slug,
  caseNumber,
  title,
}: {
  slug: string;
  caseNumber: string;
  title: string;
}) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cases/${slug}/evidence`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      setItems(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load evidence");
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose an exhibit image first.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (label.trim()) form.append("label", label.trim());
      const res = await fetch(`${API_URL}/api/cases/${slug}/evidence`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      // 502 = stored but analysis failed — still show the record.
      if (!res.ok && res.status !== 502) throw new Error(data.error || "Upload failed");
      setItems((prev) => [data, ...prev]);
      setFile(null);
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="jd-page">
      <div className="jd-card jd-crumbs">
        <div>
          <nav className="jd-crumb-nav">
            <Link href="/dashboard">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </Link>
            <span className="material-symbols-outlined">chevron_right</span>
            <Link href={`/case/${slug}`}>{caseNumber}</Link>
            <span className="material-symbols-outlined">chevron_right</span>
            <span className="current">Evidence Locker</span>
          </nav>
          <div className="jd-detail-title">
            <h1>Evidence Locker — {title}</h1>
            <span className="jd-chip jd-chip-amber">
              <span className="jd-dot" />
              TEE-Analysed Exhibits
            </span>
          </div>
        </div>
      </div>

      <div className="jd-detail-grid">
        <section className="jd-detail-main">
          {/* Submit exhibit */}
          <div className="jd-card jd-side-card">
            <div className="jd-side-head">
              <div className="jd-side-head-left">
                <span className="material-symbols-outlined">upload_file</span>
                <h2>Submit Exhibit Image</h2>
              </div>
            </div>
            <form onSubmit={submit} className="jd-ev-form">
              <label htmlFor="ev-label">Exhibit label (optional)</label>
              <input
                id="ev-label"
                type="text"
                placeholder="e.g. Exhibit P-12 — Termination letter dated 04.03.2024"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <label htmlFor="ev-file">Exhibit image</label>
              <input
                id="ev-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {error && <div className="jd-stream-error">{error}</div>}
              <button className="jd-btn jd-btn-primary" type="submit" disabled={busy}>
                <span className="material-symbols-outlined">document_scanner</span>
                {busy ? "Uploading & analysing in TEE…" : "Submit & Analyse"}
              </button>
              <p className="jd-ev-note">
                The image is stored on the server, SHA-256 sealed, and analysed by the
                vision-capable 0GM-1.0-35B-A3B model inside a 0G Private Computer TEE enclave
                (z-image-turbo is a text-to-image generator and cannot analyse images, so the
                vision model is used instead).
              </p>
            </form>
          </div>

          {/* Locker */}
          {loadError && (
            <div className="jd-card jd-side-card">
              <p className="jd-timeline-note">
                Could not reach the backend ({loadError}) — start it with{" "}
                <code>cd ../nyayam_backend &amp;&amp; pnpm dev</code>.
              </p>
            </div>
          )}
          {items.map((ev) => (
            <div className="jd-card jd-side-card jd-ev-card" key={ev.id}>
              <div className="jd-ev-head">
                <div>
                  <div className="jd-ev-title">{ev.label || "Unlabelled exhibit"}</div>
                  <div className="jd-ev-meta">
                    {fmtDate(ev.created_at)} IST · {fmtSize(ev.size)} · SHA-256{" "}
                    <code>{ev.sha256.slice(0, 16)}…</code>
                  </div>
                </div>
                {ev.status === "analysed" && (
                  <span className="jd-chip jd-chip-green">
                    <span className="jd-dot" />
                    Analysed
                  </span>
                )}
                {ev.status === "analysing" && (
                  <span className="jd-chip jd-chip-amber">
                    <span className="jd-dot" />
                    Analysing
                  </span>
                )}
                {ev.status === "failed" && (
                  <span className="jd-chip jd-chip-red">
                    <span className="jd-dot" />
                    Analysis failed
                  </span>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="jd-ev-img"
                src={`${API_URL}/uploads/${ev.filename}`}
                alt={ev.label || "Evidence exhibit"}
              />
              {ev.analysis && <div className="jd-ev-analysis">{ev.analysis}</div>}
              {ev.model && (
                <div className="jd-ev-meta" style={{ marginTop: 8 }}>
                  Model: <code>{ev.model}</code>
                  {ev.provider ? (
                    <>
                      {" "}
                      · Provider: <code>{ev.provider}</code>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          {!loadError && items.length === 0 && (
            <div className="jd-card jd-side-card">
              <p className="jd-timeline-note">No exhibits submitted yet.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
