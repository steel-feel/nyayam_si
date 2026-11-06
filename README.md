# Nyayam.si — Confidential Courtroom ASR & Verifiable Evidence Ledger

Confidential courtroom transcription in the Indian judicial context, running inside a
hardware-sealed **TEE enclave on 0G Private Computer** (0G Mainnet), with
tamper-evident evidence certificates aligned to **Section 63, Bharatiya
Sakshya Adhiniyam 2023**.

## What it does

1. **Ingest** — record a deposition from the mic (Hindi/Hinglish/English/…)
   or upload audio.
2. **Confidential transcription** — audio is transcribed by
   `openai/whisper-large-v3` inside an Intel TDX TEE enclave; the node
   operator cannot inspect the audio or transcript (DPDP Act / in-camera
   proceeding friendly).
3. **BSA Section 63 certificate** — the server returns a receipt with
   SHA-256 hashes of the raw audio and transcript, TEE attestation details,
   provider address, and UTC timestamp.
4. **Tamper test** — edit any word in the transcript and hit
   *Verify Authenticity*: the client recomputes the transcript hash and the
   UI flashes red on mismatch against the enclave record.

## Architecture

```
nyayam_si/        Next.js 15 frontend (this repo) — no API routes, no secrets, no mock data
nyayam_backend/   Elysia (Bun) server on :4000 — SQLite (bun:sqlite) at data/nyayam.db
                  (cases, case details, transcript turns, timelines, evidence — all in the DB)
```

Live transcription happens **entirely in the browser**: the frontend fetches a
60 s AssemblyAI streaming token from the backend, then streams mic PCM
straight to `wss://streaming.assemblyai.com/v3/ws`. It is enabled only while a
case is at the **Arguments** or **Evidence** stage (locked otherwise).

## Routes (frontend)

| Route | Purpose |
| --- | --- |
| `/` | Judicial bench login (demo credentials: `judge.shrivastava` / `bench04`) |
| `/dashboard` | Judicial bench monitor (cause list, mock data) |
| `/case/[id]` | Case detail — live diarized transcription (stage-gated) + **till-date case-history timeline** (from backend SQLite) |
| `/case/[id]/evidence` | Evidence locker — submit exhibit images; stored server-side, SHA-256 sealed, analysed by the 0G vision model in a TEE |
| `/transcribe` | Standalone NyayaTEE transcription + evidence certificate + tamper test (record-then-convert, 0G TEE) |

## API (backend, `http://localhost:4000`)

| Endpoint | Purpose |
| --- | --- |
| `GET /api/cases` | Cause list — all cases from SQLite (seeded) |
| `GET /api/cases/:slug` | One case + full detail + transcript turns + next cause on the list |
| `POST /api/stt-token` | Mints 60 s AssemblyAI streaming tokens (key stays server-side) |
| `POST /api/transcribe` | 0G TEE whisper proxy with BSA §63 receipt |
| `GET /api/cases/:slug/timeline` | Procedural history timeline (SQLite, seeded) |
| `GET/POST /api/cases/:slug/evidence` | List / submit exhibit images (multipart `file` + optional `label`) |
| `GET /uploads/:name` | Serves stored exhibit images |

## Evidence image analysis

Exhibits are analysed by **`0GM-1.0-35B-A3B`** (vision chat model, 262K ctx)
inside a 0G Private Computer Intel-TDX enclave:
`https://compute-network-20.integratenetwork.work/v1/proxy/chat/completions`,
provider `0xf4FB8d2bD856e672b5f9848b0eD235A20079B250`.

> **Note:** the originally requested `z-image-turbo`
> (`0x59E598DB6E8c63D7fEeB64a69De36510a221C762`, compute-network-15) is a
> *text-to-image generation* model — it cannot analyse images, so the
> vision-capable chat model is used instead.

pc.0g.ai API keys are **provider-scoped** — the whisper key
(`0xE63C…502e`) does not work for the vision provider. Mint a key for
`0xf4FB…B250` on pc.0g.ai and set `OG_VISION_API_Key` in
`nyayam_backend/.env`.

## 0G Mainnet details

| Parameter | Value |
| --- | --- |
| Network | 0G Mainnet |
| Chain ID | 16661 |
| RPC | https://evmrpc.0g.ai |
| Explorer | https://chainscan.0g.ai |
| Provider endpoint | https://compute-network-16.integratenetwork.work/v1/proxy |
| Model | `openai/whisper-large-v3` (speech-to-text, TeeML / Intel TDX / dstack) |
| Provider address | `0xE63C4F83abFbDFCaB884247EaC21f59e2e8d502e` |

## Setup

1. **Backend** (`../nyayam_backend`) — `.env` holds the secrets:

   ```
   ASSEMBLY_AI_KEY=...            # AssemblyAI streaming
   OG_SPEECH_API_KEY=app-sk-...   # 0G whisper (provider 0xE63C…502e)
   OG_VISION_API_KEY=app-sk-...   # 0G vision (provider 0xf4FB…B250)
   ```

   ```bash
   cd ../nyayam_backend
   pnpm install
   pnpm dev   # → http://localhost:4000 (Elysia + SQLite)
   ```

2. **Frontend** (this repo) — `.env` only points at the backend:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

   ```bash
   pnpm install
   pnpm dev   # → http://localhost:3000
   ```

3. Keep the 0G provider sub-accounts funded (1 0G minimum reserve + fees):

   ```bash
   0g-compute-cli transfer-fund \
     --provider 0xE63C4F83abFbDFCaB884247EaC21f59e2e8d502e \
     --amount 5
   ```

## Roadmap (from the concept note)

- LLM summarization / judicial order drafting inside the same enclave
  (needs a chat model on the private compute endpoint — currently only
  whisper-large-v3 is served).
- Anchor the evidence Merkle root on 0G Storage / DA for on-chain
  verification.
- POCSO-protected name redaction.
