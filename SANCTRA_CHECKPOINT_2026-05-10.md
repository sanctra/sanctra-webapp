# Sanctra checkpoint — 2026-05-10

## Current branch
- Repo: `/host/repos/Sanctra/sanctra-webapp-con1745-publish`
- Branch: `paperclip/con-1745-self-dataset-ui`
- Remote: `origin git@github.com:sanctra/sanctra-webapp.git`
- Source pushed through commit `63a907c Enable standalone build for corpus intake deploy`.

## What shipped today
- Deployed Sanctra dataset intake UI to Cloud Run service `sanctra-dataset-ui` in project `sanctra`, region `us-central1`.
- Current serving revision recorded during deploy: `sanctra-dataset-ui-00002-f44`.
- Live routes:
  - Hub: <https://sanctra-dataset-ui-709861426162.us-central1.run.app/dataset>
  - Living-subject/self lane: <https://sanctra-dataset-ui-709861426162.us-central1.run.app/dataset/live>
  - Posthumous/family archive lane: <https://sanctra-dataset-ui-709861426162.us-central1.run.app/dataset/posthumous>
- Created GCS bucket `gs://sanctra-corpus-intake` with public access prevention.
- Cloud Run runtime service account can create objects in the bucket.
- API route `/api/corpus-intake/submit` now accepts multipart manifest + files and stores raw files plus a server manifest under `gs://sanctra-corpus-intake/pilot-corpus/...`.
- Next.js standalone output is enabled for Docker/Cloud Run deploys.

## Storage contract
- Bucket: `gs://sanctra-corpus-intake`
- Prefix: `pilot-corpus`
- Max file size env: `SANCTRA_CORPUS_MAX_FILE_BYTES=536870912`
- Manifest schema: `sanctra.corpus_intake.v0`
- Lanes:
  - `live_subject` — Patrick submitting himself as living-subject pilot data.
  - `posthumous_archive` — family/professional archive lane, simulated with Patrick-controlled data for the pilot.

## Guardrails still active
Every submitted server manifest keeps these blocked until later explicit review/gates:
- `model_training`
- `provider_finetune`
- `avatar_runtime_deployment`
- `public_delivery`

Each uploaded file is marked:
- `training_allowed: false`
- `derived_dataset_ready: false`

The server manifest also records review gates for corpus schema review, dataset-shape review, human review, and later explicit training approval.

## Verification completed
- `npm run build` passed locally before deploy.
- Docker image built and pushed to Artifact Registry.
- Cloud Run deploy completed.
- Live route checks returned HTTP 200 for `/dataset`, `/dataset/live`, and `/dataset/posthumous`.
- Negative API smoke returned expected `400 Missing manifest JSON.`
- Positive multipart smoke returned HTTP 200 and wrote a synthetic file + manifest to GCS.
- Repo verification after docs: `npm run -s test:corpus-intake` passes.

## Latest source commits
- `63a907c Enable standalone build for corpus intake deploy`
- `b7b72e4 Add GCS-backed corpus intake lanes`
- `a95a434 CON-1745: add self-dataset validation stub`
- `576fc37 CON-1745: add self-dataset intake UI`

## Paperclip reality as of this checkpoint
- `CON-1745` should be treated as complete: the UI is live, source is pushed, and GCS-backed intake smoke passed.
- `CON-1386` / `CON-1343` remain blocked only on operator real-data submission / first controlled packet selection. That blocker is now actionable through the live `/dataset/live` and `/dataset/posthumous` routes.
- Paperclip can safely continue other Sanctra workstreams while Patrick submits pilot data, especially downstream processor/review tooling that does not require seeing Patrick's private raw corpus.

## Good next Paperclip tasks while Patrick submits data
- Build a private reviewer/manifest browser for `gs://sanctra-corpus-intake/pilot-corpus` that lists intake IDs, lanes, files, review states, and blocked operations without exposing raw media by default.
- Add a server-side preflight CLI that validates a submitted GCS manifest against the expected corpus schema and reports missing modalities, unsafe review states, third-party/privacy flags, and training-gate status.
- Design the derived-dataset staging contract that transforms raw corpus entries into modality-specific candidate datasets while preserving `training_allowed=false` until human approval.
- Add authenticated/admin-only access around dataset intake/review surfaces before any broader beta exposure.
- Draft the human review SOP for living-subject vs posthumous/archive submissions.

## Known cautions
- Next.js version is `14.2.5`; Docker build warns this version has a security advisory. Schedule a dependency upgrade pass before public/broader beta.
- Uploaded pilot corpus is private/sensitive. Do not commit raw GCS exports, manifests containing private details, generated media, model weights, or `.env` files.
- Automatic GitHub Actions deploy remains disallowed by project guardrails; use approved headless GCloud lanes for deploys.
