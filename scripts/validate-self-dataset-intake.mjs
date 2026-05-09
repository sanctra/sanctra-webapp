#!/usr/bin/env node
import fs from 'node:fs';

const blockedOps = ['provider_call', 'model_training', 'public_delivery', 'runtime_avatar_deployment'];
const requiredModalities = ['text', 'image', 'audio', 'video', 'runtime_persona'];
const validLanes = new Set(['living_subject_prompted', 'posthumous_archive']);

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
function fail(errors, message) { errors.push(message); }
function hasRedactedStorage(value) { return typeof value === 'string' && value.startsWith('redacted://sanctra-pilot/patrick/'); }

function validateManifest(manifest, errors) {
  if (manifest.schema_version !== 'sanctra.live_test_intake_manifest.v0') fail(errors, 'manifest schema_version mismatch');
  if (!validLanes.has(manifest.submission_lane)) fail(errors, 'manifest submission_lane must be living_subject_prompted or posthumous_archive');
  if (!hasRedactedStorage(manifest.storage_root)) fail(errors, 'manifest storage_root must use redacted://sanctra-pilot/patrick/...');
  if (!Array.isArray(manifest.items) || manifest.items.length < 4) fail(errors, 'manifest must include at least four modality items');
  const ctx = manifest.archive_context || {};
  for (const field of ['subject_status', 'uploader_relationship', 'authority_record_ref', 'consent_basis', 'consent_grant_ref', 'reviewer_required', 'revocation_acknowledgement_ref', 'stop_conditions_acknowledged']) {
    if (ctx[field] === undefined || ctx[field] === '') fail(errors, `manifest archive_context.${field} missing`);
  }
  if (ctx.reviewer_required !== true) fail(errors, 'manifest archive_context.reviewer_required must be true');
  if (ctx.stop_conditions_acknowledged !== true) fail(errors, 'manifest archive_context.stop_conditions_acknowledged must be true');
  const kinds = new Set();
  for (const item of manifest.items || []) {
    kinds.add(item.kind === 'photo' ? 'image' : item.kind);
    if (!hasRedactedStorage(item.storage_uri)) fail(errors, `item ${item.source_id || '<unknown>'} storage_uri must be redacted Sanctra pilot storage`);
    for (const op of blockedOps) if (!item.exclude_from?.includes(op)) fail(errors, `item ${item.source_id || '<unknown>'} missing exclude_from ${op}`);
    if (item.uploader_authority?.authority_status !== 'verified') fail(errors, `item ${item.source_id || '<unknown>'} must carry verified uploader authority for Patrick self-pilot`);
    for (const op of blockedOps) if (!item.consent_linkage?.restricted_uses?.includes(op)) fail(errors, `item ${item.source_id || '<unknown>'} consent_linkage missing restricted use ${op}`);
    if (item.identity_confidence?.level !== 'high') fail(errors, `item ${item.source_id || '<unknown>'} identity_confidence.level must be high for self-pilot source`);
  }
  for (const modality of ['text', 'image', 'audio', 'video']) if (!kinds.has(modality)) fail(errors, `manifest missing ${modality} modality`);
}

function validatePreflight(preflight, manifest, errors) {
  if (preflight.schema_version !== 'sanctra.live_test_intake_preflight.v0') fail(errors, 'preflight schema_version mismatch');
  if (preflight.submission_lane !== manifest.submission_lane) fail(errors, 'preflight lane must match manifest lane');
  for (const op of blockedOps) if (!preflight.blocked_operations?.includes(op)) fail(errors, `preflight missing blocked operation ${op}`);
  const readiness = new Map((preflight.modality_readiness || []).map((entry) => [entry.modality, entry]));
  for (const modality of requiredModalities) {
    const entry = readiness.get(modality);
    if (!entry) fail(errors, `preflight missing modality_readiness ${modality}`);
    if (entry && !['missing', 'requires_review', 'ready_for_review', 'ready_for_evaluation_manifest', 'blocked'].includes(entry.status)) fail(errors, `preflight ${modality} has invalid status ${entry.status}`);
  }
}

if (process.argv.length < 4) {
  console.error('Usage: node scripts/validate-self-dataset-intake.mjs <manifest.json> <preflight.json>');
  process.exit(2);
}
const errors = [];
const manifest = readJson(process.argv[2]);
const preflight = readJson(process.argv[3]);
validateManifest(manifest, errors);
validatePreflight(preflight, manifest, errors);
if (errors.length) {
  console.error(`self-dataset intake validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('self-dataset intake validation passed');
