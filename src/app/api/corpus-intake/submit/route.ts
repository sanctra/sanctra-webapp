import { NextRequest, NextResponse } from "next/server";
import { blockedOperations, laneConfigs, type IntakeLane } from "@/lib/corpusIntake";
import {
  assertPilotOperationAllowed,
  hardDisabledPilotOperations,
  pilotMutationRoles,
  requirePilotRole,
} from "@/lib/pilotAccessBoundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "sanctra";
const bucket = process.env.SANCTRA_CORPUS_BUCKET || "sanctra-corpus-intake";
const prefix = (process.env.SANCTRA_CORPUS_PREFIX || "pilot-corpus").replace(/^\/+|\/+$/g, "");
const maxFileBytes = Number(process.env.SANCTRA_CORPUS_MAX_FILE_BYTES || 512 * 1024 * 1024);

async function getAccessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  const metadataUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
  const response = await fetch(metadataUrl, { headers: { "Metadata-Flavor": "Google" }, cache: "no-store" });
  if (!response.ok) throw new Error(`metadata token unavailable: ${response.status}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("metadata token response did not include access_token");
  return payload.access_token;
}

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "upload.bin";
}

function jsonResponse(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function ensurePilotMutationActor(request: NextRequest) {
  return requirePilotRole(request, pilotMutationRoles, "Pilot admin/reviewer auth is required for real intake mutations.");
}

function validateManifestFiles(manifest: any, lane: IntakeLane) {
  const slotsById = new Map(laneConfigs[lane].slots.map((slot) => [slot.id, slot]));
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  if (!files.length) return { ok: false as const, error: "Manifest must describe at least one file slot." };

  for (const entry of files) {
    const slotId = String(entry?.slot_id || "");
    const slot = slotsById.get(slotId);
    if (!slot) return { ok: false as const, error: `Unknown slot_id ${slotId || "(missing)"} for ${lane}.` };
    if (entry?.modality !== slot.modality) return { ok: false as const, error: `${slotId} modality must remain ${slot.modality}.` };
    if (entry?.review_state !== slot.reviewState) return { ok: false as const, error: `${slotId} review_state must remain ${slot.reviewState} until reviewer action.` };
    if (entry?.training_allowed === true) return { ok: false as const, error: `${slotId} cannot enable training_allowed in pilot intake.` };
    if (entry?.derived_dataset_ready === true) return { ok: false as const, error: `${slotId} cannot mark derived_dataset_ready in pilot intake.` };
    if (typeof entry?.storage_uri === "string" && entry.storage_uri !== "pending_server_upload") {
      return { ok: false as const, error: `${slotId} storage_uri must stay pending_server_upload until the server assigns storage.` };
    }
  }

  return { ok: true as const };
}

function hasAllBlockedOperations(value: unknown) {
  if (!Array.isArray(value)) return false;
  const configured = new Set(value.filter((item): item is string => typeof item === "string"));
  return blockedOperations.every((op) => configured.has(op));
}

async function uploadObject(token: string, objectName: string, bytes: ArrayBuffer | Buffer, contentType: string) {
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o`);
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("name", objectName);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType || "application/octet-stream",
      "X-Upload-Content-Type": contentType || "application/octet-stream",
    },
    body: new Blob([bytes as BlobPart]),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GCS upload failed for ${objectName}: ${response.status} ${text.slice(0, 500)}`);
  }
  const payload = await response.json() as { name: string; bucket: string; size?: string; md5Hash?: string; crc32c?: string; generation?: string };
  return {
    bucket: payload.bucket || bucket,
    name: payload.name || objectName,
    generation: payload.generation,
    size: payload.size,
    md5Hash: payload.md5Hash,
    crc32c: payload.crc32c,
    uri: `gs://${payload.bucket || bucket}/${payload.name || objectName}`,
  };
}

export async function POST(request: NextRequest) {
  const actorResult = ensurePilotMutationActor(request);
  if ("error" in actorResult) return actorResult.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse(400, { ok: false, error: "Expected multipart/form-data." });
  }

  const manifestRaw = form.get("manifest");
  if (typeof manifestRaw !== "string") return jsonResponse(400, { ok: false, error: "Missing manifest JSON." });

  let manifest: any;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    return jsonResponse(400, { ok: false, error: "Manifest must be valid JSON." });
  }

  const lane = manifest?.lane as IntakeLane | undefined;
  if (!lane || !laneConfigs[lane]) return jsonResponse(400, { ok: false, error: "Invalid intake lane." });
  if (manifest?.schema_version !== "sanctra.corpus_intake.v0") return jsonResponse(400, { ok: false, error: "Unsupported manifest schema_version." });
  if (manifest?.consent_authority?.consent_checked_in_ui !== true) return jsonResponse(400, { ok: false, error: "Consent/authority acknowledgement is required." });
  if (!hasAllBlockedOperations(manifest?.consent_authority?.blocked_operations)) {
    return jsonResponse(400, { ok: false, error: "Consent policy must preserve the pilot blocked-operations set." });
  }
  if (!hasAllBlockedOperations(manifest?.corpus_policy?.blocked_operations)) {
    return jsonResponse(400, { ok: false, error: "Corpus policy must preserve the pilot blocked-operations set." });
  }
  for (const operation of hardDisabledPilotOperations) {
    const gate = assertPilotOperationAllowed(operation);
    if (gate.ok) continue;
    if (
      manifest?.corpus_policy?.[operation] === true ||
      manifest?.consent_authority?.[operation] === true ||
      manifest?.gates?.[operation] === true
    ) {
      return jsonResponse(400, { ok: false, error: gate.error });
    }
  }
  if (manifest?.corpus_policy?.training_requires_later_explicit_gate !== true) {
    return jsonResponse(400, { ok: false, error: "Pilot corpus policy must keep training behind a later explicit gate." });
  }
  const manifestValidation = validateManifestFiles(manifest, lane);
  if (!manifestValidation.ok) return jsonResponse(400, { ok: false, error: manifestValidation.error });

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) return jsonResponse(400, { ok: false, error: "At least one corpus file is required." });
  for (const file of files) {
    if (file.size > maxFileBytes) return jsonResponse(413, { ok: false, error: `${file.name} exceeds ${maxFileBytes} bytes.` });
  }

  const intakeId = String(manifest.intake_id || `corpus:${lane}:${Date.now()}`).replace(/[^a-zA-Z0-9:._-]+/g, "-");
  const receivedAt = new Date().toISOString();
  const token = await getAccessToken();
  const base = `${prefix}/${lane}/${intakeId}/${receivedAt.replace(/[:.]/g, "-")}`;
  const uploaded: Array<{
    slot_id: string;
    original_filename: string;
    content_type: string;
    size_bytes: number;
    storage_uri: string;
    gcs: Awaited<ReturnType<typeof uploadObject>>;
  }> = [];

  for (const [index, file] of files.entries()) {
    const slotId = String(form.get(`slotId:${index}`) || manifest.files?.[index]?.slot_id || "unslotted").replace(/[^a-zA-Z0-9._:-]+/g, "-");
    const objectName = `${base}/raw/${slotId}/${safeName(file.name)}`;
    const result = await uploadObject(token, objectName, await file.arrayBuffer(), file.type || "application/octet-stream");
    uploaded.push({
      slot_id: slotId,
      original_filename: file.name,
      content_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_uri: result.uri,
      gcs: result,
    });
  }

  const serverManifest = {
    ...manifest,
    project_id: projectId,
    corpus_bucket: bucket,
    server_received_at: receivedAt,
    pilot_submission_state: "submitted_for_review",
    storage_root: `gs://${bucket}/${base}`,
    files: (manifest.files || []).map((entry: any, index: number) => ({
      ...entry,
      storage_uri: uploaded[index]?.storage_uri || entry.storage_uri,
      gcs_object: uploaded[index]?.gcs?.name,
      review_state: laneConfigs[lane].slots.find((slot) => slot.id === entry.slot_id)?.reviewState || entry.review_state,
      training_allowed: false,
      derived_dataset_ready: false,
    })),
    uploaded_files: uploaded,
    audit_log: [
      {
        event: "pilot_intake_submitted",
        actor_id: actorResult.actor.actorId,
        actor_role: actorResult.actor.role,
        timestamp: receivedAt,
        lane,
        intake_id: intakeId,
        authority_basis: manifest?.submitter?.role || "unknown_submitter_role",
        consent_scope: "private_review_only",
        prior_state: "draft",
        new_state: "submitted_for_review",
        decision_reason: "Pilot intake accepted for internal review-gated storage only.",
        admin_confirmation_required: false,
        admin_confirmation_performed: actorResult.actor.role === "pilot_admin",
      },
    ],
    gates: {
      corpus_schema_review_required: true,
      dataset_shape_review_required: true,
      human_review_required: true,
      training_requires_later_explicit_gate: true,
      release_requires_two_person_control: true,
      blocked_operations: [...new Set([...blockedOperations, ...hardDisabledPilotOperations])],
    },
  };

  const manifestObject = `${base}/manifest/sanctra-corpus-intake-manifest.json`;
  const manifestUpload = await uploadObject(token, manifestObject, Buffer.from(JSON.stringify(serverManifest, null, 2)), "application/json");

  return jsonResponse(200, {
    ok: true,
    intake_id: intakeId,
    lane,
    storage_root: `gs://${bucket}/${base}`,
    manifest_uri: manifestUpload.uri,
    uploaded_files: uploaded.map((file) => ({ slot_id: file.slot_id, original_filename: file.original_filename, storage_uri: file.storage_uri, size_bytes: file.size_bytes })),
    gates: serverManifest.gates,
  });
}
