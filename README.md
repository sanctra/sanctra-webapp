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
