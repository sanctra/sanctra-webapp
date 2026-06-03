# sanctra-webapp

Next.js 14 app with a completed-avatar interaction shell:
- Web-first private interaction surface for an approved avatar package
- Text turn submission and static avatar presentation now
- Client-safe package interaction profile with disclosure labels and modality gates
- Speech-to-speech voice and full-motion video held behind deferred adapter seams
- Review feedback capture for family corrections and escalation flags

This slice follows `SANCTRA_INTERACTION_APP_PLATFORM_CONTRACT_CON-2454_2026-06-03.md`.
Corpus/biography submission remains in the concierge/package-authoring lane; the interaction screen does not add self-serve ingest.

## Interaction API seam

- `GET /api/packages/{packageId}/interaction-profile`
- `POST /api/interaction-sessions`
- `POST /api/interaction-sessions/{sessionId}/turns`
- `POST /api/interaction-sessions/{sessionId}/feedback`

When `NEXT_PUBLIC_ORCHESTRATOR_HTTP` is configured, text turns can proxy to the existing orchestrator `/turn` primitive. Voice/video provider integrations remain out of scope for this bounded shell.

## Quickstart
npm install
copy .env.example .env
npm run dev

## Contract checks
npm run test:curate-contract
npm run test:interaction-shell

## Env
- NEXT_PUBLIC_ORCHESTRATOR_HTTP=https://orchestrator.example.com
- NEXT_PUBLIC_ORCHESTRATOR_WS=wss://orchestrator.example.com
- NEXT_PUBLIC_SSE_PATH=/turn/events  (optional; SSE endpoint path)

## Docker (Cloud Run)
docker build -t sanctra-webapp:dev .
docker run --rm -p 8080:8080 sanctra-webapp:dev

## Current pilot deployment checkpoint (2026-05-10)

Sanctra's pilot corpus intake UI is live on Cloud Run:

- Hub: <https://sanctra-dataset-ui-709861426162.us-central1.run.app/dataset>
- Living-subject/self lane: <https://sanctra-dataset-ui-709861426162.us-central1.run.app/dataset/live>
- Posthumous/archive lane: <https://sanctra-dataset-ui-709861426162.us-central1.run.app/dataset/posthumous>

The submit API stores raw pilot corpus files and a server manifest in `gs://sanctra-corpus-intake/pilot-corpus`. Submission is **not** training authorization: model training, provider fine-tune, avatar runtime deployment, and public delivery remain blocked until later explicit human gates.

See `SANCTRA_CHECKPOINT_2026-05-10.md` and `CHANGELOG.md` for the current Paperclip/repo handoff state.
