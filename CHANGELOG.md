# Changelog

## 2026-05-10 — GCS-backed pilot corpus intake deploy

- Deployed `sanctra-dataset-ui` Cloud Run revision `sanctra-dataset-ui-00002-f44` for pilot dataset intake.
- Added live hub/self/archive routes under `/dataset`, `/dataset/live`, and `/dataset/posthumous`.
- Added GCS-backed multipart corpus intake API at `/api/corpus-intake/submit`.
- Created/configured `gs://sanctra-corpus-intake` with prefix `pilot-corpus`.
- Enforced manifest schema `sanctra.corpus_intake.v0`, consent acknowledgement, max file size, raw-object uploads, and server manifest generation.
- Preserved safety gates: no model training, provider fine-tune, avatar runtime deployment, or public delivery from submission alone.
- Enabled Next.js standalone output for Docker/Cloud Run.
- Verified local build, live route HTTP 200 checks, negative API smoke, positive multipart GCS smoke, source push, and `npm run -s test:corpus-intake`.

### Git commits

- `63a907c Enable standalone build for corpus intake deploy`
- `b7b72e4 Add GCS-backed corpus intake lanes`
- `a95a434 CON-1745: add self-dataset validation stub`
- `576fc37 CON-1745: add self-dataset intake UI`
