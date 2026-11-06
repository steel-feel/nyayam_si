"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BenchTopBar from "../components/BenchTopBar";
import type { JudicialCase, StageGroup } from "../data/cases";
import { API_URL } from "../lib/api";

type Filter = "all" | StageGroup;

const ACCENT_CHIP: Record<string, string> = {
  red: "jd-chip jd-chip-pill jd-chip-red",
  blue: "jd-chip jd-chip-pill jd-chip-blue",
  green: "jd-chip jd-chip-pill jd-chip-green",
};

export default function DashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const [cases, setCases] = useState<JudicialCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/cases`)
      .then((r) => {
        if (!r.ok) throw new Error(`Backend returned ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!cancelled) setCases(rows);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load cases");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveCases = cases.filter((c) => c.live);
  const counts = useMemo(
    () => ({
      all: cases.length,
      arguments: cases.filter((c) => c.stageGroup === "arguments").length,
      evidence: cases.filter((c) => c.stageGroup === "evidence").length,
    }),
    [cases]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (filter !== "all" && c.stageGroup !== filter) return false;
      if (!q) return true;
      return [c.caseNumber, c.title, c.subtitle, c.stage, c.petitionerAOR, c.respondentAOR]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [cases, query, filter]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3200);
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "arguments", label: `Arguments (${counts.arguments})` },
    { key: "evidence", label: `Evidence (${counts.evidence})` },
  ];

  return (
    <>
      <BenchTopBar />
      <main className="jd-page">
        {/* Judicial bench header banner */}
        <section className="jd-card jd-banner">
          <div className="jd-banner-top">
            <div>
              <div className="jd-clearance">
                <span className="jd-dot" />
                Judicial Bench Supervisory Console • Institutional Clearance L4
              </div>
              <h1>Bench of Hon&apos;ble Mr. Justice R. K. Shrivastava</h1>
              <div className="jd-banner-sub">
                <span style={{ color: "var(--jd-secondary)", fontWeight: 600 }}>
                  Special Commercial Division &amp; Constitutional Bench
                </span>
                <span className="jd-div">•</span>
                <span>Courtroom No. 04</span>
                <span className="jd-div">•</span>
                <span className="jd-label-sm">Air-Gap Encrypted Judicial Feed</span>
              </div>
            </div>
          </div>

          {/* Live transcribing streams */}
          <div className="jd-banner-body">
            <div className="jd-section-head">
              <div className="jd-section-title">
                <span className="jd-section-bar" />
                <h2>Live Transcribing Streams</h2>
                <span className="jd-chip jd-chip-red">
                  <span className="jd-dot" />
                  {liveCases.length} Active Audio Feeds
                </span>
              </div>
              <div className="jd-engine">
                <span className="material-symbols-outlined jd-pulse">graphic_eq</span>
                <b>AssemblyAI Streaming Diarization Engine Active</b>
              </div>
            </div>
            <div className="jd-live-grid">
              {liveCases.map((c) => (
                <a key={c.slug} href={`/case/${c.slug}`} className="jd-card jd-live-card">
                  <div className="jd-live-card-top">
                    <span className="jd-casenum">{c.caseNumber}</span>
                    <span className={ACCENT_CHIP[c.live!.accent]}>
                      <span className="jd-dot" />
                      Live Transcribing
                    </span>
                  </div>
                  <h3>{c.title}</h3>
                  <p className="jd-live-card-sub">
                    {c.subtitle} • {c.bench}
                  </p>
                  <div className="jd-live-meta">
                    <div className="jd-live-meta-row">
                      <span className="k">Stage:</span>
                      <span className="v">{c.stage}</span>
                    </div>
                    <div className="jd-live-meta-row">
                      <span className="k">Petitioner AOR:</span>
                      <span className="v">{c.petitionerAOR.replace(", AOR", "")}</span>
                    </div>
                    <div className="jd-live-meta-row">
                      <span className="k">Respondent AOR:</span>
                      <span className="v">{c.respondentAOR.replace(", AOR", "")}</span>
                    </div>
                  </div>
                  <div className={`jd-live-snippet accent-${c.live!.accent}`}>
                    <div className="jd-live-snippet-head">
                      <span className="jd-live-snippet-label">
                        <span className={`material-symbols-outlined accent-${c.live!.accent}`}>
                          mic
                        </span>
                        Live Speech-to-Text
                      </span>
                      <span className="jd-live-snippet-time">{c.live!.time}</span>
                    </div>
                    <p>
                      &quot;[{c.live!.speaker}]: {c.live!.text}&quot;
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Today's pending cases */}
        <section className="jd-card jd-table-section">
          <div className="jd-table-toolbar">
            <div className="jd-section-title">
              <span className="jd-section-bar" />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 18 }}>Today&apos;s Pending Cases</h2>
                  <span className="jd-chip jd-chip-gray">Cause List: {cases.length} Causes</span>
                </div>
                <p className="jd-table-toolbar-sub">
                  Courtroom No. 04 • Daily Judicial Roster &amp; Hearing Status
                </p>
              </div>
            </div>
            <div className="jd-table-controls">
              <div className="jd-search">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Filter by stage, advocate, or case number..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {filters.map((f) => (
                <button
                  key={f.key}
                  className={`jd-filter-btn${filter === f.key ? " active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="jd-table-wrap">
            <table className="jd-table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Title</th>
                  <th>Filed Date</th>
                  <th>Plaintiff AOR</th>
                  <th>Defendant AOR</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th>Stage</th>
                  <th>Last Update Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr style={{ cursor: "default" }}>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--jd-muted)" }}>
                      Loading cause list from the backend…
                    </td>
                  </tr>
                )}
                {loadError && (
                  <tr style={{ cursor: "default" }}>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--jd-red)" }}>
                      Could not reach the backend ({loadError}) — start it with{" "}
                      <code>cd ../nyayam_backend &amp;&amp; pnpm dev</code>.
                    </td>
                  </tr>
                )}
                {rows.map((c) => (
                  <tr key={c.slug} onClick={() => router.push(`/case/${c.slug}`)}>
                    <td className="cnum">{c.caseNumber}</td>
                    <td className="ctitle">
                      {c.title}
                      <span>{c.subtitle}</span>
                    </td>
                    <td className="cdate">{c.filedDate}</td>
                    <td className="caor">{c.petitionerAOR}</td>
                    <td className="caor">{c.respondentAOR}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="jd-chip jd-chip-pending">
                        <span className="jd-dot" />
                        Pending
                      </span>
                    </td>
                    <td>
                      <span className="jd-stage-chip">{c.stage}</span>
                    </td>
                    <td className="cupdated">{c.lastUpdate}</td>
                  </tr>
                ))}
                {!loading && !loadError && rows.length === 0 && (
                  <tr style={{ cursor: "default" }}>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--jd-muted)" }}>
                      No causes match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="jd-table-footer">
            <div className="sync">
              <span className="material-symbols-outlined">verified</span>
              Supreme Court Digital Roster Sync Active • Certified Cause List
            </div>
            <span className="count">
              Displaying {rows.length} of {cases.length} Causes for Bench 04
            </span>
          </div>
        </section>
      </main>

      {/* Bench action toast */}
      <div className={`jd-toast${toast.show ? " show" : ""}`}>
        <span className="material-symbols-outlined">verified_user</span>
        <div>
          <div className="jd-toast-title">Judicial Bench Action Logged</div>
          <div className="jd-toast-msg">{toast.msg}</div>
        </div>
      </div>
    </>
  );
}
