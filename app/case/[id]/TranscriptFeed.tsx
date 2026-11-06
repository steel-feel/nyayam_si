"use client";

import { useEffect, useRef, useState } from "react";
import type { AvatarTone, TranscriptTurn } from "../../data/cases";

// AssemblyAI Universal-Streaming v3 — real-time STT with Streaming Diarization.
// The browser connects directly to the WSS endpoint with a short-lived token
// minted by /api/stt-token, and streams 16 kHz mono Int16 PCM frames.
// https://assemblyai.com/docs/streaming/getting-started/transcribe-streaming-audio
// https://assemblyai.com/docs/streaming/label-speakers-and-separate-channels
const WS_URL = "wss://streaming.assemblyai.com/v3/ws";
const SAMPLE_RATE = 16000;

// AudioWorklet processor: downsamples the mic signal (native context rate)
// to 16 kHz and quantizes to Int16 PCM, posting transferable buffers.
const WORKLET_SRC = `
class PCM16Downsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetRate || 16000;
    this.step = sampleRate / this.targetRate;
    this.readPos = 0;
    this.pending = [];
    // AssemblyAI requires each binary frame to carry 20–1000 ms of audio;
    // ~100 ms per message is the recommended size.
    this.flushAt = Math.max(1, Math.floor(this.targetRate / 10));
    this.out = new Int16Array(this.flushAt * 2);
    this.outLen = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length) {
      const ch = input[0];
      for (let i = 0; i < ch.length; i++) this.pending.push(ch[i]);
      while (this.readPos < this.pending.length - 1) {
        const i = Math.floor(this.readPos);
        const frac = this.readPos - i;
        const s = Math.max(-1, Math.min(1, this.pending[i] + (this.pending[i + 1] - this.pending[i]) * frac));
        if (this.outLen === this.out.length) {
          const bigger = new Int16Array(this.out.length * 2);
          bigger.set(this.out);
          this.out = bigger;
        }
        this.out[this.outLen++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        this.readPos += this.step;
      }
      const consumed = Math.floor(this.readPos) - 1;
      if (consumed > 0) {
        this.pending.splice(0, consumed);
        this.readPos -= consumed;
      }
      if (this.outLen >= this.flushAt) {
        const msg = this.out.slice(0, this.outLen);
        this.port.postMessage(msg.buffer, [msg.buffer]);
        this.outLen = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm16-downsampler", PCM16Downsampler);
`;

// Display styling for diarized speaker labels (A, B, C, …). Labels come from
// AssemblyAI — we don't know which one is the bench vs counsel, so they are
// presented neutrally as "Speaker A/B/C".
const SPEAKER_TONES: AvatarTone[] = ["petitioner", "respondent", "neutral"];

type PartialTurn = { text: string; label: string | null };
type Revision = { turn_order: number; speaker_label?: string };

function speakerTone(label: string): AvatarTone {
  const idx = label.length === 1 ? label.charCodeAt(0) - 65 : 0;
  return SPEAKER_TONES[Math.min(Math.max(idx, 0), SPEAKER_TONES.length - 1)];
}

function liveTurn(label: string | null, text: string, time: string): TranscriptTurn {
  if (!label) {
    return {
      speaker: "Courtroom Feed",
      avatar: "mic",
      avatarTone: "neutral",
      icon: true,
      role: { label: "LIVE", tone: "live" },
      time,
      text,
      live: true,
    };
  }
  return {
    speaker: `Speaker ${label}`,
    avatar: "person",
    avatarTone: speakerTone(label),
    icon: true,
    role: { label: "LIVE", tone: "live" },
    time,
    text,
    live: true,
  };
}

function Turn({ t, partial }: { t: TranscriptTurn; partial?: boolean }) {
  const bubbleClass = t.live
    ? `jd-msg-bubble live-bubble${partial ? " partial" : ""}`
    : t.avatarTone === "judge"
      ? "jd-msg-bubble judge-bubble"
      : "jd-msg-bubble";
  return (
    <div className="jd-msg">
      <div className={`jd-msg-avatar ${t.avatarTone}${t.live ? " live-ring" : ""}`}>
        {t.icon ? <span className="material-symbols-outlined">{t.avatar}</span> : t.avatar}
        {t.live && <span className="jd-msg-live-dot" />}
      </div>
      <div className="jd-msg-col">
        <div className="jd-msg-head">
          <span className="jd-msg-name">{t.speaker}</span>
          {t.role && (
            <span className={`jd-role ${t.role.tone}`}>
              {t.role.tone === "live" && <span className="jd-dot" />}
              {t.role.label}
            </span>
          )}
          <span className={`jd-msg-time${t.live ? " live-time" : ""}`}>{t.time}</span>
        </div>
        <div className={bubbleClass}>{t.text}</div>
      </div>
    </div>
  );
}

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function istTime(): string {
  return (
    new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
}

export default function TranscriptFeed({
  initialTurns,
  bench,
}: {
  initialTurns: TranscriptTurn[];
  bench: string;
}) {
  const [turns, setTurns] = useState<TranscriptTurn[]>(initialTurns);
  const [live, setLive] = useState(false);
  const [partial, setPartial] = useState<PartialTurn | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0); // seconds on the record clock

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wantLiveRef = useRef(false);
  const closeReasonRef = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // turn_order → index in `turns`, so SpeakerRevision messages can relabel
  // earlier turns when AssemblyAI revises its diarization mid/end of session.
  const liveIndexRef = useRef<{ turnOrder: number; index: number }[]>([]);

  // Auto-scroll the feed as live turns arrive
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, partial, live]);

  // Cleanup on unmount
  useEffect(() => () => teardown(false), []);

  function teardown(terminate: boolean) {
    wantLiveRef.current = false;
    if (clockRef.current) clearInterval(clockRef.current);
    clockRef.current = null;

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      // Always send Terminate — streaming is billed per open session.
      if (terminate && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "Terminate" }));
        } catch {
          /* socket racing close */
        }
        setTimeout(() => {
          try {
            ws.close();
          } catch {
            /* already closed */
          }
        }, 2500);
      } else {
        try {
          ws.close();
        } catch {
          /* already closed */
        }
      }
    }

    workletRef.current?.disconnect();
    workletRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }

  function onWsMessage(ev: MessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    switch (msg.type) {
      case "Turn": {
        const text: string = (msg.transcript || "").trim();
        if (!text) break;
        const label: string | null =
          msg.speaker_label && msg.speaker_label !== "PENDING" ? msg.speaker_label : null;
        if (msg.end_of_turn) {
          setPartial(null);
          appendTurn(msg.turn_order ?? -1, label, text);
        } else {
          setPartial({ text, label });
        }
        break;
      }
      case "SpeakerRevision":
        applyRevisions((msg.revisions as Revision[]) || []);
        break;
      case "Error":
        // Sent right before the close frame — carries the real reason
        // (e.g. "Input duration violation …").
        closeReasonRef.current = typeof msg.error === "string" ? msg.error : "Stream error";
        break;
      case "Termination":
        stopLive();
        break;
      default:
        break;
    }
  }

  function appendTurn(turnOrder: number, label: string | null, text: string) {
    setTurns((prev) => {
      liveIndexRef.current.push({ turnOrder, index: prev.length });
      return [...prev, liveTurn(label, text, istTime())];
    });
  }

  function applyRevisions(revisions: Revision[]) {
    if (!revisions.length) return;
    setTurns((prev) => {
      const next = [...prev];
      let changed = false;
      for (const rev of revisions) {
        const entry = liveIndexRef.current.find((e) => e.turnOrder === rev.turn_order);
        if (!entry || !next[entry.index]) continue;
        const label =
          rev.speaker_label && rev.speaker_label !== "PENDING" ? rev.speaker_label : null;
        next[entry.index] = liveTurn(label, next[entry.index].text, next[entry.index].time);
        changed = true;
      }
      return changed ? next : prev;
    });
  }

  // Starts the mic + audio graph. Must be called from the click handler:
  // an AudioContext created outside a user gesture starts suspended, the
  // worklet never runs, no audio reaches the socket, and the session idles
  // out — which is exactly the "player turns off by itself" failure.
  async function startAudio() {
    if (audioCtxRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    mediaStreamRef.current = stream;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    const workletURL = URL.createObjectURL(
      new Blob([WORKLET_SRC], { type: "application/javascript" })
    );
    await ctx.audioWorklet.addModule(workletURL);
    URL.revokeObjectURL(workletURL);
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;
    const node = new AudioWorkletNode(ctx, "pcm16-downsampler", {
      processorOptions: { targetRate: SAMPLE_RATE },
    });
    workletRef.current = node;
    node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(e.data);
    };
    source.connect(node);
    node.connect(ctx.destination); // silent — keeps the worklet pulling
  }

  async function startLive() {
    setError("");
    try {
      // Mic first (needs the click gesture), then the streaming session.
      await startAudio();

      // The API key never reaches the browser — only a 60s streaming token.
      const res = await fetch("/api/stt-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not mint streaming token");

      const params = new URLSearchParams({
        token: data.token,
        sample_rate: String(SAMPLE_RATE),
        encoding: "pcm_s16le",
        speech_model: "universal-3-6-pro",
        format_turns: "true",
        speaker_labels: "true",
        max_speakers: "3",
        speaker_labels_revision_interval_ms: "300000",
      });
      const ws = new WebSocket(`${WS_URL}?${params.toString()}`);
      wsRef.current = ws;
      ws.onmessage = onWsMessage;
      // onerror is always followed by onclose — report there, not here.
      ws.onclose = (e) => {
        const wasLive = wantLiveRef.current;
        const serverReason = closeReasonRef.current;
        closeReasonRef.current = null;
        setLive(false);
        setPartial(null);
        teardown(false);
        if (wasLive && !(e.code === 1000 && e.reason === "Session Ended")) {
          setError(
            serverReason
              ? `${serverReason} (code ${e.code}). Tap the mic to retry.`
              : `Stream closed (${e.code}${e.reason ? ` — ${e.reason}` : ""}). Tap the mic to retry.`
          );
        }
      };

      wantLiveRef.current = true;
      liveIndexRef.current = [];
      setLive(true);
      setElapsed(0);
      clockRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start live transcription");
      setLive(false);
      teardown(false); // release the mic if the session never opened
    }
  }

  function stopLive() {
    setLive(false);
    setPartial(null);
    teardown(true); // Terminate finalizes the open turn server-side
  }

  return (
    <div className="jd-card jd-stream">
      <div className="jd-stream-toolbar">
        <div className="jd-stream-toolbar-left">
          <span className={`jd-live-ind${live ? " on" : ""}`} />
          <span className="jd-stream-toolbar-title">
            {live
              ? "Streaming to AssemblyAI Universal-3.6 Pro — transcribing & diarizing…"
              : "Live diarized feed (AssemblyAI Universal-Streaming · multilingual code-switch)"}
          </span>
        </div>
      </div>

      {error && <div className="jd-stream-error">{error}</div>}

      <div className="jd-stream-body" ref={bodyRef}>
        {turns.length > 0 || partial ? (
          <>
            {turns.map((t, i) => (
              <Turn key={i} t={t} />
            ))}
            {partial && <Turn t={liveTurn(partial.label, partial.text, "…")} partial />}
          </>
        ) : (
          <div className="jd-stream-empty">
            <span className="material-symbols-outlined">mic_off</span>
            <p>
              Bench not in session — press the <b>record button</b> below to stream {bench} audio
              to AssemblyAI and the diarized transcript (Speaker A, B, C…) will appear here in
              real time.
            </p>
          </div>
        )}

        {/* Record player — start/stop the live streaming transcription */}
        <div className={`jd-rec-bar${live ? " on" : ""}`}>
          <button
            className={`jd-rec-btn${live ? " on" : ""}`}
            onClick={live ? stopLive : startLive}
            aria-label={live ? "Stop recording" : "Start recording"}
          >
            <span className="material-symbols-outlined">{live ? "stop" : "mic"}</span>
          </button>
          <div className="jd-rec-meta">
            {live ? (
              <>
                <span className="jd-rec-time">
                  <span className="jd-rec-dot" />
                  REC {fmtClock(elapsed)}
                </span>
                <span className="jd-rec-hint">
                  Listening — speakers are diarized automatically, tap stop to end the feed
                </span>
              </>
            ) : (
              <>
                <span className="jd-rec-time idle">Live Transcription</span>
                <span className="jd-rec-hint">
                  Tap the mic to stream {bench} audio to AssemblyAI (Hindi/English code-switch
                  supported)
                </span>
              </>
            )}
          </div>
          {live && (
            <div className="jd-rec-bars" aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
