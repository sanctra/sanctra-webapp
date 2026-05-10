# sanctra-webapp

Next.js 14 app with tri-modal interaction:
- Text chat pane and video pane
- WebRTC mic capture; streams audio to Orchestrator /turn
- Shows interim transcript, plays WAV immediately, swaps to MP4 when notified via SSE
- Simple settings page to choose a persona

## Quickstart
npm install
copy .env.example .env
npm run dev

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
