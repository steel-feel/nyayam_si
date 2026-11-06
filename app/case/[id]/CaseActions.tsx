"use client";

import { useRef, useState } from "react";

export default function CaseActions({ caseNumber }: { caseNumber: string }) {
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3200);
  }

  return (
    <>
      <div className="jd-side-actions">
        <button
          className="jd-btn jd-btn-primary"
          onClick={() =>
            showToast(`Certified transcript for ${caseNumber} exported with BSA Sec. 63 hash seal`)
          }
        >
          <span className="material-symbols-outlined">picture_as_pdf</span>
          Download Certified Transcript PDF
        </button>
        <button
          className="jd-btn jd-btn-light"
          onClick={() => showToast(`Bench briefing note for ${caseNumber} queued for generation`)}
        >
          <span className="material-symbols-outlined">summarize</span>
          Generate Bench Briefing Note
        </button>
        <button
          className="jd-btn jd-btn-light"
          onClick={() => showToast("Evidentiary timestamp flagged and anchored to the sealed log")}
        >
          <span className="material-symbols-outlined">flag</span>
          Flag Evidentiary Timestamp
        </button>
      </div>

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
