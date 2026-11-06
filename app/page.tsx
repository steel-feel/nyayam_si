"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Demo bench credentials for the hackathon build
const DEMO_ID = "judge.shrivastava";
const DEMO_PASS = "bench04";

export default function LoginPage() {
  const router = useRouter();
  const [benchId, setBenchId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Mock authentication — institutional SSO would sit here in production
    setTimeout(() => {
      if (benchId.trim().toLowerCase() === DEMO_ID && password === DEMO_PASS) {
        router.push("/dashboard");
      } else {
        setError("Invalid bench credentials. Clearance denied — this attempt has been logged.");
        setLoading(false);
      }
    }, 600);
  }

  return (
    <main className="jd-login">
      <div className="jd-login-card">
        <div className="jd-login-brand">
          <div className="jd-login-logo">
            <span className="material-symbols-outlined">gavel</span>
          </div>
          <div className="jd-login-conn">
            <span className="jd-dot" />
            SECURE JUDICIAL NETWORK
          </div>
          <h1>NYAYAM.SI Bench Monitor</h1>
          <p>Judicial Bench Supervisory Console • Institutional Clearance L4</p>
        </div>

        <form onSubmit={signIn} className="jd-login-form">
          <label htmlFor="bench-id">Judicial Bench ID</label>
          <input
            id="bench-id"
            type="text"
            autoComplete="username"
            placeholder="e.g. judge.shrivastava"
            value={benchId}
            onChange={(e) => setBenchId(e.target.value)}
            required
          />

          <label htmlFor="bench-pass">Password</label>
          <input
            id="bench-pass"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="jd-login-error">{error}</div>}

          <button type="submit" className="jd-btn jd-btn-navy jd-login-btn" disabled={loading}>
            {loading ? "Verifying clearance…" : "Sign In to Bench Console"}
          </button>
        </form>

        <div className="jd-login-demo">
          <span className="material-symbols-outlined">info</span>
          Demo credentials — ID: <b>{DEMO_ID}</b> · Password: <b>{DEMO_PASS}</b>
        </div>

        <div className="jd-login-foot">
          AIR-GAP ENCRYPTED JUDICIAL FEED • 0G MAINNET • CHAIN ID 16661
        </div>
      </div>
    </main>
  );
}
