import Link from "next/link";
import { notFound } from "next/navigation";
import BenchTopBar from "../../components/BenchTopBar";
import CaseActions from "./CaseActions";
import TranscriptFeed from "./TranscriptFeed";
import { CASES, getCaseDetail } from "../../data/cases";

export function generateStaticParams() {
  return CASES.map((c) => ({ id: c.slug }));
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = CASES.find((x) => x.slug === id);
  if (!c) notFound();
  const d = getCaseDetail(c);
  const idx = CASES.findIndex((x) => x.slug === id);
  const next = idx >= 0 && idx < CASES.length - 1 ? CASES[idx + 1] : null;
  const inSession = Boolean(c.live);

  return (
    <>
      <BenchTopBar />
      <main className="jd-page">
        {/* Breadcrumbs & context bar */}
        <div className="jd-card jd-crumbs">
          <div>
            <nav className="jd-crumb-nav">
              <Link href="/dashboard">
                <span className="material-symbols-outlined">dashboard</span>
                Dashboard
              </Link>
              <span className="material-symbols-outlined">chevron_right</span>
              <Link href="/dashboard">Live Case Monitoring</Link>
              <span className="material-symbols-outlined">chevron_right</span>
              <span className="current">
                {d.verdictRef} ({c.caseNumber})
              </span>
            </nav>
            <div className="jd-detail-title">
              <h1>{c.title}</h1>
              {inSession ? (
                <span className="jd-chip jd-chip-amber">
                  <span className="jd-dot" />
                  Hearing in Progress
                </span>
              ) : (
                <span className="jd-chip jd-chip-pending">
                  <span className="jd-dot" />
                  Pending
                </span>
              )}
            </div>
          </div>
          {next && (
            <Link href={`/case/${next.slug}`} className="jd-btn jd-btn-navy jd-btn-sm">
              Next: {next.verdictRef}
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          )}
        </div>

        {/* Live metric telemetry ribbon */}
        <div className="jd-telemetry">
          <div className="jd-card jd-tele-card">
            <div>
              <div className="jd-tele-label">Courtroom Allocation</div>
              <div className="jd-tele-value">{c.bench}</div>
              <div className="jd-tele-sub">{c.division}</div>
            </div>
            <div className="jd-tele-icon">
              <span className="material-symbols-outlined">gavel</span>
            </div>
          </div>
          <div className="jd-card jd-tele-card">
            <div>
              <div className="jd-tele-label">Session Phase</div>
              <div className="jd-tele-value">{d.sessionPhase}</div>
              <div className="jd-tele-sub">{d.sessionPhaseSub}</div>
            </div>
            <div className="jd-tele-icon blue">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="jd-card jd-tele-card">
            <div>
              <div className="jd-tele-label">Diarization Engine</div>
              {d.diarizationActive ? (
                <div className="jd-tele-value green">
                  <span className="jd-dot" />
                  Active Synced
                </div>
              ) : (
                <div className="jd-tele-value">Standby</div>
              )}
              <div className="jd-tele-sub">{d.diarizationSub}</div>
            </div>
            <div className="jd-tele-icon green">
              <span className="material-symbols-outlined">graphic_eq</span>
            </div>
          </div>
          <div className="jd-card jd-tele-card">
            <div>
              <div className="jd-tele-label">Session Clock</div>
              <div className="jd-tele-value big">{d.sessionClock}</div>
              <div className="jd-tele-sub">
                Cryptographic Log: {inSession ? "Verified" : "Not Started"}
              </div>
            </div>
            <div className="jd-tele-icon high">
              <span className="material-symbols-outlined">lock_clock</span>
            </div>
          </div>
        </div>

        {/* Main split: transcript stream + case dossier */}
        <div className="jd-detail-grid">
          <section className="jd-detail-main">
            <TranscriptFeed initialTurns={d.transcript} bench={c.bench} />
          </section>

          <aside className="jd-detail-side">
            {/* Docket & bench identity */}
            <div className="jd-card jd-side-card">
              <div className="jd-side-head">
                <div className="jd-side-head-left">
                  <span className="material-symbols-outlined">folder_special</span>
                  <h2>Docket &amp; Bench Identity</h2>
                </div>
                <span className="jd-chip jd-chip-amber">Status: Pending</span>
              </div>
              <div className="jd-kv">
                <span className="k">Verdict Reference:</span>
                <span className="v mono">{d.verdictRef}</span>
              </div>
              <div className="jd-kv">
                <span className="k">Case Docket No.:</span>
                <span className="v mono">{c.caseNumber}</span>
              </div>
              <div className="jd-kv-col">
                <span className="k">Full Matter Title:</span>
                <span className="v">{c.title}</span>
              </div>
              <div className="jd-kv">
                <span className="k">Judicial Bench:</span>
                <span className="v">Courtroom No. 04</span>
              </div>
              <div className="jd-kv-col">
                <span className="k">Presiding Judge:</span>
                <span className="v" style={{ fontWeight: 600 }}>
                  {d.presidingJudge}
                </span>
              </div>
              <div className="jd-kv">
                <span className="k">Division:</span>
                <span className="v">{d.division}</span>
              </div>
            </div>

            {/* Litigant & representation */}
            <div className="jd-card jd-side-card">
              <div className="jd-side-head">
                <div className="jd-side-head-left">
                  <span className="material-symbols-outlined">group</span>
                  <h2>Litigant &amp; Legal Representation</h2>
                </div>
              </div>
              <div className="jd-block">
                <div className="jd-block-label">Petitioner / Appellant</div>
                <div className="jd-block-name">{d.petitionerName}</div>
                <div className="jd-block-sub">
                  <span className="material-symbols-outlined">person</span>
                  {d.petitionerRep}
                </div>
              </div>
              <div className="jd-block">
                <div className="jd-block-label muted">Respondent</div>
                <div className="jd-block-name">{d.respondentName}</div>
                <div className="jd-block-sub">
                  <span className="material-symbols-outlined">person</span>
                  {d.respondentRep}
                </div>
              </div>
            </div>

            {/* Chronology & telemetry */}
            <div className="jd-card jd-side-card">
              <div className="jd-side-head">
                <div className="jd-side-head-left">
                  <span className="material-symbols-outlined">analytics</span>
                  <h2>Chronology &amp; Operational Telemetry</h2>
                </div>
              </div>
              <div className="jd-tele-grid">
                <div className="jd-block">
                  <span className="jd-block-label faint">Case Filing Date</span>
                  <span className="v">{d.filingDate}</span>
                </div>
                <div className="jd-block">
                  <span className="jd-block-label faint">Session Date</span>
                  <span className="v">{d.sessionDate}</span>
                </div>
                <div className="jd-block">
                  <span className="jd-block-label faint">Original Languages</span>
                  <span className="v">{d.originalLanguages}</span>
                </div>
                <div className="jd-block">
                  <span className="jd-block-label faint">Judicial Format</span>
                  <span className="v">{d.judicialFormat}</span>
                </div>
              </div>
              <div className="jd-progress">
                <div className="jd-progress-row">
                  <span className="k">Spoken Turns Captured</span>
                  <span className="v">{d.spokenTurns}</span>
                </div>
                <div className="jd-progress-track">
                  <div className="jd-progress-fill" style={{ width: `${d.spokenTurnsPct}%` }} />
                </div>
                <div className="jd-progress-row">
                  <span className="k">Speaker Diarization Clarity</span>
                  <span className="v green">{d.speakers}</span>
                </div>
                <div className="jd-progress-track">
                  <div className="jd-progress-fill green" style={{ width: `${d.speakersPct}%` }} />
                </div>
              </div>
            </div>

            {/* AI case intelligence + evidentiary actions */}
            <div className="jd-card jd-side-card">
              <div className="jd-side-head">
                <div className="jd-side-head-left">
                  <span className="material-symbols-outlined">psychology</span>
                  <h2>AI Real-Time Case Intelligence</h2>
                </div>
              </div>
              <div className="jd-block">
                <div className="jd-block-label">Petitioner Key Submissions</div>
                <p>{d.petitionerSubmissions}</p>
              </div>
              <div className="jd-block">
                <div className="jd-block-label muted">Respondent Key Submissions</div>
                <p>{d.respondentSubmissions}</p>
              </div>
              {d.statutes.length > 0 && (
                <div className="jd-block">
                  <div className="jd-block-label faint">Statutory Hooks in Argument</div>
                  <div className="jd-statutes">
                    {d.statutes.map((s) => (
                      <span key={s} className="jd-statute">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <CaseActions caseNumber={c.caseNumber} />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
