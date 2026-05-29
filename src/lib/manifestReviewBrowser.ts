import { blockedOperations, type IntakeLane, type Modality, type ReviewState } from "@/lib/corpusIntake";
import { hardDisabledPilotOperations } from "@/lib/pilotAccessBoundary";
import {
  getAccessToken,
  projectLedgerRecords,
  readManifestReviewLedger,
  type GcsObjectMetadata,
} from "@/lib/manifestReviewLedger";

type GcsObject = GcsObjectMetadata;

type ManifestFileEntry = {
  slot_id?: string;
  modality?: Modality;
  original_filename?: string;
  content_type?: string;
  size_bytes?: number;
  review_state?: ReviewState;
  storage_uri?: string;
  gcs_object?: string;
  manifest_eligible?: boolean;
  training_allowed?: boolean;
  derived_dataset_ready?: boolean;
  last_reviewed_by?: string;
  last_admin_confirmed_by?: string;
};

type IntakeManifest = {
  schema_version?: string;
  intake_id?: string;
  lane?: IntakeLane;
  subject?: {
    display_name?: string;
    subject_status?: string;
    subject_ref?: string;
  };
  submitter?: {
    display_name?: string;
    role?: string;
    relationship_to_subject?: string;
  };
  storage_root?: string;
  server_received_at?: string;
  created_at?: string;
  pilot_submission_state?: string;
  files?: ManifestFileEntry[];
  audit_log?: Array<{
    event?: string;
    actor_id?: string;
    actor_role?: string;
    timestamp?: string;
    decision_reason?: string;
    new_state?: string;
  }>;
  gates?: {
    blocked_operations?: string[];
    corpus_schema_review_required?: boolean;
    dataset_shape_review_required?: boolean;
    human_review_required?: boolean;
    training_requires_later_explicit_gate?: boolean;
    release_requires_two_person_control?: boolean;
  };
  consent_authority?: {
    blocked_operations?: string[];
  };
  corpus_policy?: {
    blocked_operations?: string[];
  };
};

export type ManifestReviewFileSummary = {
  slot_id: string;
  modality: string;
  original_filename: string;
  content_type: string;
  size_bytes: number | null;
  review_state: string;
  storage_uri: string;
  gcs_object: string;
  manifest_eligible: boolean;
  training_allowed: false;
  derived_dataset_ready: false;
  last_reviewed_by: string | null;
  last_admin_confirmed_by: string | null;
};

export type ManifestReviewSummary = {
  intake_id: string;
  lane: string;
  subject_display_name: string;
  subject_ref: string;
  submitter_display_name: string;
  submitter_role: string;
  pilot_submission_state: string;
  server_received_at: string | null;
  created_at: string | null;
  manifest_uri: string;
  manifest_object: string;
  storage_root: string;
  object_updated: string | null;
  object_generation: string | null;
  object_size_bytes: number | null;
  ledger_object: string;
  ledger_generation: string | null;
  file_slots: ManifestReviewFileSummary[];
  modalities: string[];
  review_states: Record<string, number>;
  blocked_operations: string[];
  gates: {
    corpus_schema_review_required: boolean;
    dataset_shape_review_required: boolean;
    human_review_required: boolean;
    training_requires_later_explicit_gate: boolean;
    release_requires_two_person_control: boolean;
    model_training: false;
    provider_finetune: false;
    provider_call: false;
    avatar_runtime_deployment: false;
    public_delivery: false;
    publish_release: false;
    derived_dataset_release: false;
  };
  audit_summary: {
    count: number;
    latest_event: string | null;
    latest_timestamp: string | null;
    latest_actor_role: string | null;
    latest_state: string | null;
  };
};

export type ManifestReviewBrowserResult = {
  ok: true;
  bucket: string;
  prefix: string;
  storage_root: string;
  manifest_count: number;
  generated_at: string;
  disabled_operations: readonly string[];
  manifests: ManifestReviewSummary[];
};

const bucket = process.env.SANCTRA_CORPUS_BUCKET || "sanctra-corpus-intake";
const prefix = (process.env.SANCTRA_CORPUS_PREFIX || "pilot-corpus").replace(/^\/+|\/+$/g, "");
const manifestSuffix = "/manifest/sanctra-corpus-intake-manifest.json";
const qaFixtureEnabled = process.env.NODE_ENV !== "production" && process.env.SANCTRA_MANIFEST_REVIEW_QA_FIXTURE === "1";
const qaFixtureManifestObject = "pilot-corpus/local-qa/live-subject-qa/manifest/sanctra-corpus-intake-manifest.json";
const qaFixtureObject: GcsObject = {
  bucket,
  name: qaFixtureManifestObject,
  size: "2876",
  contentType: "application/json",
  updated: "2026-05-29T16:00:00.000Z",
  generation: "qa-fixture-manifest-generation-1",
};
const qaFixtureLedger: Awaited<ReturnType<typeof readManifestReviewLedger>> = {
  object: "pilot-corpus/local-qa/live-subject-qa/review/sanctra-manifest-review-ledger.ndjson",
  generation: "qa-fixture-ledger-generation-2",
  raw: "",
  records: [
    {
      decision_id: "qa-fixture:text-corpus:reviewer_approve",
      manifest_object: qaFixtureManifestObject,
      intake_id: "corpus:local-qa:manifest-review",
      slot_id: "text-corpus",
      modality: "text",
      prior_state: "needs_review",
      new_state: "review_approved",
      actor_id: "qa-reviewer-001",
      actor_role: "pilot_reviewer",
      timestamp: "2026-05-29T16:05:00.000Z",
      action: "reviewer_approve",
      decision_reason: "Metadata-only fixture approval for screenshot QA.",
      admin_confirmation_required: false,
      admin_confirmation_performed: false,
      reviewer_actor_id: null,
      manifest_eligible: false,
      training_allowed: false,
      derived_dataset_ready: false,
      hard_disabled_operations: hardDisabledPilotOperations,
    },
    {
      decision_id: "qa-fixture:audio-corpus:reviewer_approve",
      manifest_object: qaFixtureManifestObject,
      intake_id: "corpus:local-qa:manifest-review",
      slot_id: "audio-corpus",
      modality: "audio",
      prior_state: "needs_review",
      new_state: "review_approved",
      actor_id: "qa-reviewer-001",
      actor_role: "pilot_reviewer",
      timestamp: "2026-05-29T16:07:00.000Z",
      action: "reviewer_approve",
      decision_reason: "High-presence metadata approved by reviewer; separate admin confirmation remains required.",
      admin_confirmation_required: true,
      admin_confirmation_performed: false,
      reviewer_actor_id: null,
      manifest_eligible: false,
      training_allowed: false,
      derived_dataset_ready: false,
      hard_disabled_operations: hardDisabledPilotOperations,
    },
    {
      decision_id: "qa-fixture:image-corpus:admin_confirm_manifest_eligible",
      manifest_object: qaFixtureManifestObject,
      intake_id: "corpus:local-qa:manifest-review",
      slot_id: "image-corpus",
      modality: "image",
      prior_state: "review_approved",
      new_state: "manifest_eligible",
      actor_id: "qa-admin-002",
      actor_role: "pilot_admin",
      timestamp: "2026-05-29T16:10:00.000Z",
      action: "admin_confirm_manifest_eligible",
      decision_reason: "Separate admin confirmed metadata-only manifest eligibility for fixture proof.",
      admin_confirmation_required: true,
      admin_confirmation_performed: true,
      reviewer_actor_id: "qa-reviewer-001",
      manifest_eligible: true,
      training_allowed: false,
      derived_dataset_ready: false,
      hard_disabled_operations: hardDisabledPilotOperations,
    },
  ],
};
const qaFixtureManifest: IntakeManifest = {
  schema_version: "sanctra.corpus_intake.v0",
  intake_id: "corpus:local-qa:manifest-review",
  lane: "live_subject",
  subject: {
    display_name: "Local QA Subject",
    subject_status: "living_subject",
    subject_ref: "subject:local_qa_manifest_review",
  },
  submitter: {
    display_name: "Local QA Harness",
    role: "pilot_operator_readonly",
    relationship_to_subject: "fixture",
  },
  storage_root: "gs://sanctra-corpus-intake/pilot-corpus/local-qa/live-subject-qa",
  server_received_at: "2026-05-29T16:00:00.000Z",
  created_at: "2026-05-29T15:55:00.000Z",
  pilot_submission_state: "submitted_for_review",
  files: [
    {
      slot_id: "text-corpus",
      modality: "text",
      original_filename: "qa-writing-metadata.txt",
      content_type: "text/plain",
      size_bytes: 1842,
      review_state: "needs_review",
      storage_uri: "gs://sanctra-corpus-intake/pilot-corpus/local-qa/live-subject-qa/text/qa-writing-metadata.txt",
      gcs_object: "pilot-corpus/local-qa/live-subject-qa/text/qa-writing-metadata.txt",
      training_allowed: false,
      derived_dataset_ready: false,
    },
    {
      slot_id: "audio-corpus",
      modality: "audio",
      original_filename: "qa-voice-sample-metadata.wav",
      content_type: "audio/wav",
      size_bytes: 482144,
      review_state: "needs_review",
      storage_uri: "gs://sanctra-corpus-intake/pilot-corpus/local-qa/live-subject-qa/audio/qa-voice-sample-metadata.wav",
      gcs_object: "pilot-corpus/local-qa/live-subject-qa/audio/qa-voice-sample-metadata.wav",
      training_allowed: false,
      derived_dataset_ready: false,
    },
    {
      slot_id: "image-corpus",
      modality: "image",
      original_filename: "qa-portrait-metadata.jpg",
      content_type: "image/jpeg",
      size_bytes: 214988,
      review_state: "review_approved",
      storage_uri: "gs://sanctra-corpus-intake/pilot-corpus/local-qa/live-subject-qa/image/qa-portrait-metadata.jpg",
      gcs_object: "pilot-corpus/local-qa/live-subject-qa/image/qa-portrait-metadata.jpg",
      training_allowed: false,
      derived_dataset_ready: false,
      last_reviewed_by: "qa-reviewer-001",
    },
    {
      slot_id: "video-corpus",
      modality: "video",
      original_filename: "qa-presence-clip-metadata.mp4",
      content_type: "video/mp4",
      size_bytes: 1288992,
      review_state: "quarantined",
      storage_uri: "gs://sanctra-corpus-intake/pilot-corpus/local-qa/live-subject-qa/video/qa-presence-clip-metadata.mp4",
      gcs_object: "pilot-corpus/local-qa/live-subject-qa/video/qa-presence-clip-metadata.mp4",
      training_allowed: false,
      derived_dataset_ready: false,
      last_reviewed_by: "qa-reviewer-001",
    },
  ],
  audit_log: [
    {
      event: "fixture_manifest_seeded",
      actor_id: "local-qa-harness",
      actor_role: "pilot_operator_readonly",
      timestamp: "2026-05-29T16:00:00.000Z",
      decision_reason: "Local/dev-only screenshot fixture; metadata-only values.",
      new_state: "submitted_for_review",
    },
  ],
  gates: {
    blocked_operations: ["provider_call", "provider_finetune", "model_training", "publish_release", "derived_dataset_release"],
    corpus_schema_review_required: true,
    dataset_shape_review_required: true,
    human_review_required: true,
    training_requires_later_explicit_gate: true,
    release_requires_two_person_control: true,
  },
  consent_authority: {
    blocked_operations: ["public_delivery", "avatar_runtime_deployment"],
  },
  corpus_policy: {
    blocked_operations: ["model_training", "provider_finetune", "publish_release", "derived_dataset_release"],
  },
};

function asSize(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function combineBlockedOperations(manifest: IntakeManifest) {
  return uniq([
    ...blockedOperations,
    ...hardDisabledPilotOperations,
    ...(manifest.gates?.blocked_operations || []),
    ...(manifest.consent_authority?.blocked_operations || []),
    ...(manifest.corpus_policy?.blocked_operations || []),
  ]);
}

function summarizeAudit(manifest: IntakeManifest, ledgerRecords: Awaited<ReturnType<typeof readManifestReviewLedger>>["records"]): ManifestReviewSummary["audit_summary"] {
  const log = Array.isArray(manifest.audit_log) ? manifest.audit_log : [];
  const ledgerEvents = ledgerRecords.map((record) => ({
    event: record.action,
    actor_role: record.actor_role,
    timestamp: record.timestamp,
    new_state: record.new_state,
  }));
  const combined = [...log, ...ledgerEvents];
  const latest = [...combined].reverse().find((entry) => entry && typeof entry === "object");
  return {
    count: combined.length,
    latest_event: latest?.event || null,
    latest_timestamp: latest?.timestamp || null,
    latest_actor_role: latest?.actor_role || null,
    latest_state: latest?.new_state || null,
  };
}

function summarizeManifest(manifest: IntakeManifest, object: GcsObject, ledger: Awaited<ReturnType<typeof readManifestReviewLedger>>): ManifestReviewSummary {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const fileSummaries = files.map((entry): ManifestReviewFileSummary => {
    const projected = projectLedgerRecords({
      slot_id: String(entry.slot_id || "unknown_slot"),
      modality: entry.modality || "unknown" as Modality,
      review_state: entry.review_state || "needs_review",
      manifest_eligible: entry.manifest_eligible === true,
      training_allowed: false,
      derived_dataset_ready: false,
      last_reviewed_by: entry.last_reviewed_by,
      last_admin_confirmed_by: entry.last_admin_confirmed_by,
    }, ledger.records);
    return {
      slot_id: projected.slot_id,
      modality: String(projected.modality || "unknown"),
      original_filename: String(entry.original_filename || ""),
      content_type: String(entry.content_type || ""),
      size_bytes: asSize(entry.size_bytes),
      review_state: String(projected.review_state || "needs_review"),
      storage_uri: String(entry.storage_uri || ""),
      gcs_object: String(entry.gcs_object || ""),
      manifest_eligible: projected.manifest_eligible === true,
      training_allowed: false,
      derived_dataset_ready: false,
      last_reviewed_by: projected.last_reviewed_by || null,
      last_admin_confirmed_by: projected.last_admin_confirmed_by || null,
    };
  });
  const reviewStates = fileSummaries.reduce<Record<string, number>>((states, entry) => {
    states[entry.review_state] = (states[entry.review_state] || 0) + 1;
    return states;
  }, {});
  const manifestObject = String(object.name || "");
  return {
    intake_id: String(manifest.intake_id || manifestObject.split("/").at(-3) || "unknown_intake"),
    lane: String(manifest.lane || manifestObject.split("/").at(1) || "unknown_lane"),
    subject_display_name: String(manifest.subject?.display_name || "Unknown subject"),
    subject_ref: String(manifest.subject?.subject_ref || ""),
    submitter_display_name: String(manifest.submitter?.display_name || ""),
    submitter_role: String(manifest.submitter?.role || ""),
    pilot_submission_state: String(manifest.pilot_submission_state || "unknown"),
    server_received_at: manifest.server_received_at || null,
    created_at: manifest.created_at || null,
    manifest_uri: `gs://${object.bucket || bucket}/${manifestObject}`,
    manifest_object: manifestObject,
    storage_root: String(manifest.storage_root || `gs://${object.bucket || bucket}/${manifestObject.replace(manifestSuffix, "")}`),
    object_updated: object.updated || null,
    object_generation: object.generation || null,
    object_size_bytes: asSize(object.size),
    ledger_object: ledger.object,
    ledger_generation: ledger.generation,
    file_slots: fileSummaries,
    modalities: uniq(fileSummaries.map((entry) => entry.modality)),
    review_states: reviewStates,
    blocked_operations: combineBlockedOperations(manifest),
    gates: {
      corpus_schema_review_required: manifest.gates?.corpus_schema_review_required !== false,
      dataset_shape_review_required: manifest.gates?.dataset_shape_review_required !== false,
      human_review_required: manifest.gates?.human_review_required !== false,
      training_requires_later_explicit_gate: manifest.gates?.training_requires_later_explicit_gate !== false,
      release_requires_two_person_control: manifest.gates?.release_requires_two_person_control !== false,
      model_training: false,
      provider_finetune: false,
      provider_call: false,
      avatar_runtime_deployment: false,
      public_delivery: false,
      publish_release: false,
      derived_dataset_release: false,
    },
    audit_summary: summarizeAudit(manifest, ledger.records),
  };
}

async function listManifestObjects(token: string) {
  const objects: GcsObject[] = [];
  let pageToken = "";
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o`);
    url.searchParams.set("prefix", prefix ? `${prefix}/` : "");
    url.searchParams.set("fields", "items(bucket,name,size,contentType,updated,generation,md5Hash,crc32c),nextPageToken");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GCS manifest listing failed: ${response.status} ${text.slice(0, 300)}`);
    }
    const payload = await response.json() as { items?: GcsObject[]; nextPageToken?: string };
    objects.push(...(payload.items || []).filter((item) => item.name?.endsWith(manifestSuffix)));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return objects;
}

async function downloadManifest(token: string, objectName: string) {
  const url = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`);
  url.searchParams.set("alt", "media");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GCS manifest download failed for ${objectName}: ${response.status} ${text.slice(0, 300)}`);
  }
  return await response.json() as IntakeManifest;
}

export async function getPilotManifestReview(manifestObject: string) {
  const normalized = manifestObject.replace(/^\/+/, "");
  if (qaFixtureEnabled && normalized === qaFixtureManifestObject) {
    return {
      token: "local-qa-fixture-token",
      manifest: qaFixtureManifest,
      object: qaFixtureObject,
      ledger: qaFixtureLedger,
      summary: summarizeManifest(qaFixtureManifest, qaFixtureObject, qaFixtureLedger),
    };
  }
  const token = await getAccessToken();
  const metadataUrl = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(normalized)}`);
  const metadataResponse = await fetch(metadataUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (metadataResponse.status === 404) return null;
  if (!metadataResponse.ok) {
    const text = await metadataResponse.text();
    throw new Error(`GCS manifest metadata failed for ${normalized}: ${metadataResponse.status} ${text.slice(0, 300)}`);
  }
  const object = await metadataResponse.json() as GcsObject;
  const manifest = await downloadManifest(token, normalized);
  const ledger = await readManifestReviewLedger(bucket, normalized, token);
  return {
    token,
    manifest,
    object,
    ledger,
    summary: summarizeManifest(manifest, object, ledger),
  };
}

export function getPilotManifestReviewBucket() {
  return bucket;
}

export async function listPilotManifestReviews(): Promise<ManifestReviewBrowserResult> {
  if (qaFixtureEnabled) {
    const manifests = [summarizeManifest(qaFixtureManifest, qaFixtureObject, qaFixtureLedger)];
    return {
      ok: true,
      bucket,
      prefix: "local-qa-fixture",
      storage_root: `gs://${bucket}/pilot-corpus/local-qa`,
      manifest_count: manifests.length,
      generated_at: "2026-05-29T16:15:00.000Z",
      disabled_operations: hardDisabledPilotOperations,
      manifests,
    };
  }
  const token = await getAccessToken();
  const objects = await listManifestObjects(token);
  const manifests = await Promise.all(objects.map(async (object) => {
    const objectName = String(object.name || "");
    const manifest = await downloadManifest(token, objectName);
    const ledger = await readManifestReviewLedger(bucket, objectName, token);
    return summarizeManifest(manifest, object, ledger);
  }));
  manifests.sort((a, b) => String(b.server_received_at || b.object_updated || "").localeCompare(String(a.server_received_at || a.object_updated || "")));
  return {
    ok: true,
    bucket,
    prefix,
    storage_root: `gs://${bucket}/${prefix}`,
    manifest_count: manifests.length,
    generated_at: new Date().toISOString(),
    disabled_operations: hardDisabledPilotOperations,
    manifests,
  };
}
