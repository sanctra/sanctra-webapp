# CON-2456 Acceptance Evidence

## Status

Implemented the first bounded completed-avatar web interaction-shell slice in the existing publish checkout.

## Scope Delivered

- Replaced the root page with a web-first private interaction surface for an approved avatar package.
- Added client-safe interaction profile state with disclosure labels, allowed text/image modalities, and deferred voice/video gates.
- Added local interaction-session API seams:
  - `GET /api/packages/{packageId}/interaction-profile`
  - `POST /api/interaction-sessions`
  - `POST /api/interaction-sessions/{sessionId}/turns`
  - `POST /api/interaction-sessions/{sessionId}/feedback`
- Preserved text-first orchestration seam: configured `NEXT_PUBLIC_ORCHESTRATOR_HTTP` can still proxy text turns to `/turn`.
- Kept speech-to-speech voice and full-motion video as disabled adapter affordances, not provider integrations.
- Kept corpus/biography submission out of the interaction shell; review feedback is recorded as family-review feedback only.

## Validation

- `npm run test:interaction-shell` passed.
- `npm run test:curate-contract` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed.
- Local HTTP smoke on `http://127.0.0.1:3087/` returned `200 OK`.
- API smoke checks passed for interaction profile, session creation, text turn, and feedback.

## Notes

- Browser-driven Playwright verification could not run because the shared MCP browser runtime is missing Chrome at `/opt/google/chrome/chrome`; attempted `npx playwright install chrome`, but the installer required root password escalation and failed.
- No raw media, provider media jobs, model weights, credentials, or self-serve ingest were added.
