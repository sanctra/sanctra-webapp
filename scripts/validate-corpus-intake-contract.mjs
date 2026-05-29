#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/app/dataset/live/page.tsx',
  'src/app/dataset/posthumous/page.tsx',
  'src/app/admin/manifest-review/page.tsx',
  'src/app/api/corpus-intake/submit/route.ts',
  'src/app/api/admin/manifest-review/route.ts',
  'src/lib/corpusIntake.ts',
  'src/lib/manifestReviewBrowser.ts',
  'src/lib/manifestReviewLedger.ts',
  'src/lib/pilotReviewMutations.ts',
];
const errors = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing ${file}`);
}
const contract = fs.existsSync(path.join(root, 'src/lib/corpusIntake.ts')) ? fs.readFileSync(path.join(root, 'src/lib/corpusIntake.ts'), 'utf8') : '';
for (const token of ['live_subject', 'posthumous_archive', 'model_training', 'provider_finetune', 'avatar_runtime_deployment', 'training_requires_later_explicit_gate']) {
  if (!contract.includes(token)) errors.push(`corpus contract missing ${token}`);
}
const route = fs.existsSync(path.join(root, 'src/app/api/corpus-intake/submit/route.ts')) ? fs.readFileSync(path.join(root, 'src/app/api/corpus-intake/submit/route.ts'), 'utf8') : '';
const reviewRoute = fs.existsSync(path.join(root, 'src/app/api/admin/manifest-review/route.ts')) ? fs.readFileSync(path.join(root, 'src/app/api/admin/manifest-review/route.ts'), 'utf8') : '';
const reviewMutations = fs.existsSync(path.join(root, 'src/lib/pilotReviewMutations.ts')) ? fs.readFileSync(path.join(root, 'src/lib/pilotReviewMutations.ts'), 'utf8') : '';
const reviewBrowser = fs.existsSync(path.join(root, 'src/lib/manifestReviewBrowser.ts')) ? fs.readFileSync(path.join(root, 'src/lib/manifestReviewBrowser.ts'), 'utf8') : '';
const reviewLedger = fs.existsSync(path.join(root, 'src/lib/manifestReviewLedger.ts')) ? fs.readFileSync(path.join(root, 'src/lib/manifestReviewLedger.ts'), 'utf8') : '';
const reviewPage = fs.existsSync(path.join(root, 'src/app/admin/manifest-review/page.tsx')) ? fs.readFileSync(path.join(root, 'src/app/admin/manifest-review/page.tsx'), 'utf8') : '';
const boundary = fs.existsSync(path.join(root, 'src/lib/pilotAccessBoundary.ts')) ? fs.readFileSync(path.join(root, 'src/lib/pilotAccessBoundary.ts'), 'utf8') : '';
const middleware = fs.existsSync(path.join(root, 'src/middleware.ts')) ? fs.readFileSync(path.join(root, 'src/middleware.ts'), 'utf8') : '';
for (const token of [
  'SANCTRA_CORPUS_BUCKET',
  'storage.googleapis.com/upload/storage/v1',
  'training_allowed: false',
  'dataset_shape_review_required',
  'requirePilotRole',
  'pilotMutationRoles',
  'hardDisabledPilotOperations',
  'release_requires_two_person_control',
]) {
  if (!route.includes(token)) errors.push(`upload route missing ${token}`);
}
for (const token of [
  'x-sanctra-pilot-actor-id',
  'x-sanctra-pilot-actor-role',
  'pilot_admin',
  'pilot_reviewer',
  'pilot_operator_readonly',
  'provider_call',
  'provider_finetune',
  'model_training',
  'publish_release',
  'derived_dataset_release',
]) {
  if (!boundary.includes(token)) errors.push(`pilot boundary missing ${token}`);
}
for (const token of [
  '/curate/:path*',
  '/dataset/:path*',
  '/upload/:path*',
  '/admin/manifest-review/:path*',
  'getPilotActorFromHeaders',
  'pilotReadRoles',
  '403',
]) {
  if (!middleware.includes(token)) errors.push(`middleware missing ${token}`);
}
for (const token of [
  'audit_log',
  'submitted_for_review',
]) {
  if (!route.includes(token)) errors.push(`upload route missing ${token}`);
}
for (const token of [
  'GET',
  'listPilotManifestReviews',
  'pilotReadRoles',
  'applyPilotReviewMutation',
  'pilotReviewRoles',
  'Pilot reviewer/admin auth is required',
  'audit_log_entry',
  'manifest_object',
  'slot_id',
  'entry_generation',
  'ledger_generation',
  'appendManifestReviewLedgerRecord',
  'Review ledger generation changed',
  'high_presence_two_person_gate_enforced',
  'provider_training_publish_release_disabled',
]) {
  if (!reviewRoute.includes(token)) errors.push(`manifest review route missing ${token}`);
}
for (const token of [
  'storage.googleapis.com/storage/v1',
  'manifest/sanctra-corpus-intake-manifest.json',
  'alt", "media"',
  'file_slots',
  'blocked_operations',
  'audit_summary',
  'readManifestReviewLedger',
  'ledger_object',
  'ledger_generation',
  'projectLedgerRecords',
  'model_training: false',
  'provider_finetune: false',
  'provider_call: false',
  'avatar_runtime_deployment: false',
  'public_delivery: false',
  'publish_release: false',
  'derived_dataset_release: false',
  'SANCTRA_MANIFEST_REVIEW_QA_FIXTURE',
  'NODE_ENV !== "production"',
  'local-qa-fixture',
]) {
  if (!reviewBrowser.includes(token)) errors.push(`manifest review browser missing ${token}`);
}
for (const token of [
  'sanctra-manifest-review-ledger.ndjson',
  'ifGenerationMatch',
  'application/x-ndjson',
  'decision_id',
  'manifest_object',
  'hard_disabled_operations',
  'training_allowed: false',
  'derived_dataset_ready: false',
]) {
  if (!reviewLedger.includes(token)) errors.push(`manifest review ledger missing ${token}`);
}
for (const token of [
  'Manifest review',
  'Metadata-only intake browser',
  'Raw corpus bodies',
  'Blocked operations',
  'Decision reason',
  'Admin confirm',
  'ledger_generation',
  'training off',
  'derived dataset off',
  'High-presence manifest eligibility requires a separate admin',
  'local/dev-only fixture state',
]) {
  if (!reviewPage.includes(token)) errors.push(`manifest review page missing ${token}`);
}
for (const token of [
  'reviewer_approve',
  'admin_confirm_manifest_eligible',
  'manifest_eligible',
  'High-presence manifest eligibility requires a separate admin',
  'training_allowed: false',
  'derived_dataset_ready: false',
  'hardDisabledPilotOperations',
  'pilot_admin is required',
  'pilot_reviewer_mutation',
  'pilot_admin_manifest_eligibility_confirmed',
]) {
  if (!reviewMutations.includes(token)) errors.push(`review mutation boundary missing ${token}`);
}
if (errors.length) {
  console.error('corpus intake contract failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('corpus intake contract passed');
