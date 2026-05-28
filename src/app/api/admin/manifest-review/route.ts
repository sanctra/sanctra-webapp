import { NextRequest, NextResponse } from "next/server";
import { getPilotManifestReview, getPilotManifestReviewBucket, listPilotManifestReviews } from "@/lib/manifestReviewBrowser";
import {
  appendManifestReviewLedgerRecord,
  makeDecisionId,
  projectLedgerRecords,
  type ManifestReviewLedgerRecord,
} from "@/lib/manifestReviewLedger";
import { applyPilotReviewMutation, type PilotReviewAction, type PilotReviewAudit, type ReviewableManifestEntry } from "@/lib/pilotReviewMutations";
import { hardDisabledPilotOperations } from "@/lib/pilotAccessBoundary";
import { pilotReadRoles, pilotReviewRoles, requirePilotRole } from "@/lib/pilotAccessBoundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function normalizeManifestObject(value: string) {
  return value.replace(/^gs:\/\/[^/]+\//, "").replace(/^\/+/, "");
}

async function parseMutationPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      manifest_object: String(form.get("manifest_object") || ""),
      slot_id: String(form.get("slot_id") || ""),
      action: String(form.get("action") || "") as PilotReviewAction,
      reason: String(form.get("reason") || ""),
      entry_generation: String(form.get("entry_generation") || ""),
      ledger_generation: String(form.get("ledger_generation") || ""),
      requestedOperation: String(form.get("requestedOperation") || ""),
    };
  }
  return await request.json();
}

function asLedgerRecord(input: {
  manifestObject: string;
  intakeId: string;
  audit: PilotReviewAudit;
}): ManifestReviewLedgerRecord {
  return {
    decision_id: makeDecisionId({
      manifestObject: input.manifestObject,
      slotId: input.audit.slot_id,
      action: input.audit.action,
      actorId: input.audit.actor_id,
      timestamp: input.audit.timestamp,
    }),
    manifest_object: input.manifestObject,
    intake_id: input.intakeId,
    slot_id: input.audit.slot_id,
    modality: input.audit.modality,
    prior_state: input.audit.prior_state,
    new_state: input.audit.new_state,
    actor_id: input.audit.actor_id,
    actor_role: input.audit.actor_role,
    timestamp: input.audit.timestamp,
    action: input.audit.action,
    decision_reason: input.audit.decision_reason,
    admin_confirmation_required: input.audit.admin_confirmation_required,
    admin_confirmation_performed: input.audit.admin_confirmation_performed,
    reviewer_actor_id: input.audit.reviewer_actor_id || null,
    manifest_eligible: input.audit.manifest_eligible,
    training_allowed: false,
    derived_dataset_ready: false,
    hard_disabled_operations: hardDisabledPilotOperations,
  };
}

export async function GET(request: NextRequest) {
  const actorResult = requirePilotRole(request, pilotReadRoles, "Pilot admin, reviewer, or operator-readonly auth is required for manifest review reads.");
  if ("error" in actorResult) return actorResult.error;

  try {
    const result = await listPilotManifestReviews();
    return jsonResponse(200, result);
  } catch (error) {
    return jsonResponse(502, {
      ok: false,
      error: error instanceof Error ? error.message : "Manifest review listing failed.",
    });
  }
}

export async function POST(request: NextRequest) {
  const actorResult = requirePilotRole(request, pilotReviewRoles, "Pilot reviewer/admin auth is required for manifest review mutations.");
  if ("error" in actorResult) return actorResult.error;

  let payload: {
    manifest_object?: string;
    slot_id?: string;
    action?: PilotReviewAction;
    entry?: ReviewableManifestEntry;
    reason?: string;
    entry_generation?: string;
    ledger_generation?: string;
    requestedOperation?: string;
  };
  try {
    payload = await parseMutationPayload(request);
  } catch {
    return jsonResponse(400, { ok: false, error: "Expected JSON review mutation payload." });
  }

  if (!payload.action) {
    return jsonResponse(400, { ok: false, error: "Missing review action." });
  }
  if (!String(payload.reason || "").trim()) {
    return jsonResponse(400, { ok: false, error: "A reviewer/admin decision reason is required." });
  }

  if (payload.manifest_object && payload.slot_id) {
    const manifestObject = normalizeManifestObject(payload.manifest_object);
    let review: Awaited<ReturnType<typeof getPilotManifestReview>>;
    try {
      review = await getPilotManifestReview(manifestObject);
    } catch (error) {
      return jsonResponse(502, {
        ok: false,
        error: error instanceof Error ? error.message : "Manifest review lookup failed.",
      });
    }
    if (!review) return jsonResponse(404, { ok: false, error: `Manifest object not found: ${manifestObject}` });

    const slot = review.summary.file_slots.find((entry) => entry.slot_id === payload.slot_id);
    if (!slot) return jsonResponse(404, { ok: false, error: `Manifest slot not found: ${payload.slot_id}` });
    if (payload.entry_generation && payload.entry_generation !== String(review.object.generation || "")) {
      return jsonResponse(409, {
        ok: false,
        error: "Manifest generation changed; refresh before retrying.",
        manifest_object: manifestObject,
        slot_id: payload.slot_id,
        entry: slot,
        manifest_generation: review.object.generation || null,
        ledger: { object: review.ledger.object, generation: review.ledger.generation },
      });
    }

    const entry: ReviewableManifestEntry = {
      slot_id: slot.slot_id,
      modality: slot.modality as ReviewableManifestEntry["modality"],
      review_state: slot.review_state as ReviewableManifestEntry["review_state"],
      manifest_eligible: slot.manifest_eligible,
      training_allowed: false,
      derived_dataset_ready: false,
      last_reviewed_by: slot.last_reviewed_by || undefined,
      last_admin_confirmed_by: slot.last_admin_confirmed_by || undefined,
    };
    const result = applyPilotReviewMutation({
      actor: actorResult.actor,
      action: payload.action,
      entry,
      reason: payload.reason || "",
      requestedOperation: payload.requestedOperation,
    });
    if (!result.ok) return jsonResponse(403, result);

    const record = asLedgerRecord({ manifestObject, intakeId: review.summary.intake_id, audit: result.audit });
    try {
      const append = await appendManifestReviewLedgerRecord({
        bucket: getPilotManifestReviewBucket(),
        manifestObject,
        record,
        expectedLedgerGeneration: payload.ledger_generation,
        token: review.token,
      });
      if (!append.ok) {
        return jsonResponse(409, {
          ok: false,
          error: "Review ledger generation changed; refresh before retrying.",
          manifest_object: manifestObject,
          slot_id: payload.slot_id,
          entry: projectLedgerRecords(entry, append.records),
          ledger: { object: append.object, generation: append.generation },
        });
      }
      return jsonResponse(200, {
        ok: true,
        manifest_object: manifestObject,
        slot_id: payload.slot_id,
        entry: result.entry,
        audit_log_entry: result.audit,
        ledger: { object: append.object, generation: append.generation },
        gates: {
          provider_training_publish_release_disabled: true,
          reviewer_decision_required: true,
          admin_manifest_confirmation_required: result.audit.admin_confirmation_required,
          high_presence_two_person_gate_enforced: true,
          training_allowed: false,
          derived_dataset_ready: false,
        },
      });
    } catch (error) {
      return jsonResponse(502, {
        ok: false,
        error: error instanceof Error ? error.message : "Review ledger append failed.",
      });
    }
  }

  if (!payload.entry?.slot_id || !payload.entry?.modality || !payload.entry?.review_state) {
    return jsonResponse(400, { ok: false, error: "Missing manifest_object/slot_id or transition entry fields." });
  }

  const result = applyPilotReviewMutation({
    actor: actorResult.actor,
    action: payload.action,
    entry: payload.entry,
    reason: payload.reason || "",
    requestedOperation: payload.requestedOperation,
  });
  if (!result.ok) return jsonResponse(403, result);

  return jsonResponse(200, {
    ok: true,
    entry: result.entry,
    audit_log_entry: result.audit,
    gates: {
      provider_training_publish_release_disabled: true,
      reviewer_decision_required: true,
      admin_manifest_confirmation_required: result.audit.admin_confirmation_required,
      high_presence_two_person_gate_enforced: true,
      training_allowed: false,
      derived_dataset_ready: false,
    },
  });
}
