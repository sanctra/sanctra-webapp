import type { HardDisabledPilotOperation, PilotActor } from "@/lib/pilotAccessBoundary";
import type { Modality, ReviewState } from "@/lib/corpusIntake";
import type { PilotReviewAction, ReviewableManifestEntry } from "@/lib/pilotReviewMutations";

export type GcsObjectMetadata = {
  bucket?: string;
  name?: string;
  size?: string;
  contentType?: string;
  updated?: string;
  generation?: string;
  md5Hash?: string;
  crc32c?: string;
};

export type ManifestReviewLedgerRecord = {
  decision_id: string;
  manifest_object: string;
  intake_id: string;
  slot_id: string;
  modality: Modality;
  prior_state: ReviewState;
  new_state: ReviewState;
  actor_id: string;
  actor_role: PilotActor["role"];
  timestamp: string;
  action: PilotReviewAction;
  decision_reason: string;
  admin_confirmation_required: boolean;
  admin_confirmation_performed: boolean;
  reviewer_actor_id: string | null;
  manifest_eligible: boolean;
  training_allowed: false;
  derived_dataset_ready: false;
  hard_disabled_operations: readonly (HardDisabledPilotOperation | string)[];
};

export type LedgerReadResult = {
  object: string;
  generation: string | null;
  records: ManifestReviewLedgerRecord[];
  raw: string;
};

export type AppendLedgerInput = {
  bucket: string;
  manifestObject: string;
  record: ManifestReviewLedgerRecord;
  expectedLedgerGeneration?: string;
  token: string;
};

export type AppendLedgerResult =
  | { ok: true; object: string; generation: string | null; records: ManifestReviewLedgerRecord[] }
  | { ok: false; conflict: true; object: string; generation: string | null; records: ManifestReviewLedgerRecord[] };

const ledgerFileName = "sanctra-manifest-review-ledger.ndjson";

export async function getAccessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  const metadataUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
  const response = await fetch(metadataUrl, { headers: { "Metadata-Flavor": "Google" }, cache: "no-store" });
  if (!response.ok) throw new Error(`metadata token unavailable: ${response.status}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("metadata token response did not include access_token");
  return payload.access_token;
}

export function reviewLedgerObjectForManifest(manifestObject: string) {
  const normalized = manifestObject.replace(/^\/+/, "");
  const suffix = "/manifest/sanctra-corpus-intake-manifest.json";
  if (normalized.endsWith(suffix)) return `${normalized.slice(0, -suffix.length)}/review/${ledgerFileName}`;
  const parts = normalized.split("/");
  parts.pop();
  return `${parts.join("/")}/review/${ledgerFileName}`;
}

export function makeDecisionId(input: {
  manifestObject: string;
  slotId: string;
  action: PilotReviewAction;
  actorId: string;
  timestamp: string;
}) {
  return [
    "pilot-review",
    input.manifestObject,
    input.slotId,
    input.action,
    input.actorId,
    input.timestamp,
  ].join(":");
}

function parseLedger(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ManifestReviewLedgerRecord);
}

async function readGcsObjectText(bucket: string, objectName: string, token: string) {
  const metadataUrl = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`);
  const metadataResponse = await fetch(metadataUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (metadataResponse.status === 404) return { exists: false as const, generation: null, raw: "", records: [] as ManifestReviewLedgerRecord[] };
  if (!metadataResponse.ok) {
    const text = await metadataResponse.text();
    throw new Error(`GCS review ledger metadata failed for ${objectName}: ${metadataResponse.status} ${text.slice(0, 300)}`);
  }
  const metadata = await metadataResponse.json() as GcsObjectMetadata;
  const mediaUrl = new URL(metadataUrl);
  mediaUrl.searchParams.set("alt", "media");
  const mediaResponse = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!mediaResponse.ok) {
    const text = await mediaResponse.text();
    throw new Error(`GCS review ledger download failed for ${objectName}: ${mediaResponse.status} ${text.slice(0, 300)}`);
  }
  const raw = await mediaResponse.text();
  return { exists: true as const, generation: metadata.generation || null, raw, records: parseLedger(raw) };
}

export async function readManifestReviewLedger(bucket: string, manifestObject: string, token: string): Promise<LedgerReadResult> {
  const object = reviewLedgerObjectForManifest(manifestObject);
  const result = await readGcsObjectText(bucket, object, token);
  return {
    object,
    generation: result.generation,
    raw: result.raw,
    records: result.records,
  };
}

export function projectLedgerRecords(entry: ReviewableManifestEntry, records: ManifestReviewLedgerRecord[]): ReviewableManifestEntry {
  return records.reduce<ReviewableManifestEntry>((current, record) => {
    if (record.slot_id !== entry.slot_id) return current;
    return {
      ...current,
      review_state: record.new_state,
      manifest_eligible: record.manifest_eligible,
      training_allowed: false,
      derived_dataset_ready: false,
      last_reviewed_by: record.action.startsWith("reviewer_") ? record.actor_id : current.last_reviewed_by,
      last_admin_confirmed_by: record.admin_confirmation_performed ? record.actor_id : current.last_admin_confirmed_by,
    };
  }, entry);
}

export async function appendManifestReviewLedgerRecord(input: AppendLedgerInput): Promise<AppendLedgerResult> {
  const ledgerObject = reviewLedgerObjectForManifest(input.manifestObject);
  const current = await readManifestReviewLedger(input.bucket, input.manifestObject, input.token);
  if (input.expectedLedgerGeneration && input.expectedLedgerGeneration !== String(current.generation || "")) {
    return { ok: false, conflict: true, object: ledgerObject, generation: current.generation, records: current.records };
  }

  const nextRaw = `${current.raw.trim() ? `${current.raw.trim()}\n` : ""}${JSON.stringify(input.record)}\n`;
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(input.bucket)}/o`);
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("name", ledgerObject);
  url.searchParams.set("ifGenerationMatch", current.generation || "0");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/x-ndjson",
    },
    body: nextRaw,
    cache: "no-store",
  });

  if (response.status === 412) {
    const latest = await readManifestReviewLedger(input.bucket, input.manifestObject, input.token);
    return { ok: false, conflict: true, object: ledgerObject, generation: latest.generation, records: latest.records };
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GCS review ledger append failed for ${ledgerObject}: ${response.status} ${text.slice(0, 300)}`);
  }
  const metadata = await response.json() as GcsObjectMetadata;
  return {
    ok: true,
    object: ledgerObject,
    generation: metadata.generation || null,
    records: [...current.records, input.record],
  };
}
