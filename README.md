# NyayaTEE — Confidential Courtroom ASR & Verifiable Evidence Ledger

Hackathon project (see `../nyayam.pdf` for the concept note): confidential
courtroom transcription in the Indian judicial context, running inside a
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

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Judicial bench login (demo credentials: `judge.shrivastava` / `bench04`) |
| `/dashboard` | Judicial bench monitor (cause list, mock data) |
| `/case/[id]` | Case detail with **live streaming transcription** — mic PCM streams over WebSocket to AssemblyAI Universal-Streaming (`universal-3-6-pro`, multilingual code-switch) with real-time speaker diarization (Speaker A/B/C…) |
| `/transcribe` | Standalone NyayaTEE transcription + evidence certificate + tamper test (record-then-convert, 0G TEE) |
| `/api/transcribe` | Server proxy → 0G Private Computer TEE (key stays server-side) |
| `/api/stt-token` | Mints 60s AssemblyAI streaming tokens for the browser (key stays server-side) |

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

1. `.env` must contain your private-compute API secret (`app-sk-...`):

   ```
   OG_SPEECH_API_Key=app-sk-your-secret-here
   ```

2. Keep the provider sub-account funded (1 0G minimum reserve + fees):

   ```bash
   0g-compute-cli transfer-fund \
     --provider 0xE63C4F83abFbDFCaB884247EaC21f59e2e8d502e \
     --amount 5
   ```

3. Run:

   ```bash
   pnpm install
   pnpm dev   # → http://localhost:3000
   ```

## Roadmap (from the concept note)

- LLM summarization / judicial order drafting inside the same enclave
  (needs a chat model on the private compute endpoint — currently only
  whisper-large-v3 is served).
- Anchor the evidence Merkle root on 0G Storage / DA for on-chain
  verification.
- POCSO-protected name redaction.
