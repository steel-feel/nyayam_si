import Link from "next/link";
import { PRESIDING_JUDGE } from "../data/cases";

export default function BenchTopBar() {
  return (
    <header className="jd-topbar">
      <div className="jd-topbar-left">
        <Link href="/dashboard" className="jd-topbar-logo" aria-label="Nyayam.si dashboard">
          <span className="material-symbols-outlined">gavel</span>
        </Link>
        <div>
          <div className="jd-topbar-conn">
            <span className="jd-dot" />
            CONNECTED // SECURE JUDICIAL NETWORK
          </div>
          <div className="jd-topbar-brand">NYAYAM.SI BENCH MONITOR</div>
        </div>
      </div>
      <div className="jd-topbar-right">
        <div className="jd-topbar-judge">
          <div className="jd-topbar-judge-name">{PRESIDING_JUDGE}</div>
          <div className="jd-topbar-judge-sub">Senior Judge, Commercial Appellate Division</div>
        </div>
        <div className="jd-avatar">RS</div>
      </div>
    </header>
  );
}
