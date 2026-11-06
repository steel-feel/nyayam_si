"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

type TimelineEvent = {
  id: number;
  case_slug: string;
  event_date: string;
  title: string;
  detail: string;
  kind: string;
};

const KIND_ICON: Record<string, string> = {
  filing: "description",
  notice: "mark_email_unread",
  order: "gavel",
  hearing: "record_voice_over",
  evidence: "folder_special",
  stage: "flag",
};

export default function CaseTimeline({ slug }: { slug: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/cases/${slug}/timeline`)
      .then((r) => {
        if (!r.ok) throw new Error(`Backend returned ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="jd-card jd-side-card">
      <div className="jd-side-head">
        <div className="jd-side-head-left">
          <span className="material-symbols-outlined">timeline</span>
          <h2>Case History — Till Date</h2>
        </div>
        <span className="jd-chip jd-chip-gray">{events.length} events</span>
      </div>

      {loading && <p className="jd-timeline-note">Loading case history…</p>}
      {error && (
        <p className="jd-timeline-note">
          Could not reach the backend ({error}) — start it with{" "}
          <code>cd ../nyayam_backend &amp;&amp; pnpm dev</code>.
        </p>
      )}

      {!loading && !error && (
        <ol className="jd-timeline">
          {events.map((e, i) => (
            <li key={e.id} className={`jd-timeline-item kind-${e.kind}`}>
              <div className="jd-timeline-rail">
                <span className="jd-timeline-dot">
                  <span className="material-symbols-outlined">
                    {KIND_ICON[e.kind] ?? "circle"}
                  </span>
                </span>
                {i < events.length - 1 && <span className="jd-timeline-line" />}
              </div>
              <div className="jd-timeline-body">
                <div className="jd-timeline-head">
                  <span className="jd-timeline-title">{e.title}</span>
                  <span className="jd-timeline-date">{e.event_date}</span>
                </div>
                <p className="jd-timeline-detail">{e.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
