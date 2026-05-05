# CON-1633 /curate pilot UX handoff

Implemented in `sanctra-webapp` worktree branch `paperclip/con-1633-curate-pilot-ux`.

## What changed

- `/curate` now renders lane progress, consent matrix, stop conditions, and prompt cards from Sanctra fixture/protocol JSON instead of local static prompt arrays.
- Living-subject lane is the default first lane.
- Prompt response states are normalized to the pilot UX contract: `answered`, `skipped`, `private_only`, `excluded_from_training`, `needs_review`.
- High-presence modalities (`audio`, `image`, `video`) display review-required messaging and are not presented as training-ready.
- Review summary shows accepted placeholders, quarantined/missing items, required authority/consent/audience/revocation records, modality gaps, and the handoff for Patrick's first real packet after storage policy approval.
- No raw media persistence, provider calls, model training, public delivery, or runtime deployment added.

## Verification

- `npm run -s test:curate` passed.
- `npm run -s lint` passed.
- `npm run -s build` passed after removing `output: 'standalone'`; the standalone copy step failed under this worktree with missing `.nft.json` trace files, while normal Next production build generated `/curate` successfully.

## Pilot packet next action

After storage policy approval, Patrick should submit a manifest containing external/redacted refs only plus subject-self authority, package consent, private-review audience, revocation acknowledgement, provenance, hashes/placeholders, and high-presence review queue coverage.
