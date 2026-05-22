import { NextRequest, NextResponse } from "next/server";
import { applyPilotReviewMutation, type PilotReviewAction, type ReviewableManifestEntry } from "@/lib/pilotReviewMutations";
import { pilotReviewRoles, requirePilotRole } from "@/lib/pilotAccessBoundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const actorResult = requirePilotRole(request, pilotReviewRoles, "Pilot reviewer/admin auth is required for manifest review mutations.");
  if ("error" in actorResult) return actorResult.error;

  let payload: {
    action?: PilotReviewAction;
    entry?: ReviewableManifestEntry;
    reason?: string;
    requestedOperation?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Expected JSON review mutation payload." });
  }

  if (!payload.entry?.slot_id || !payload.entry?.modality || !payload.entry?.review_state || !payload.action) {
    return jsonResponse(400, { ok: false, error: "Missing action or manifest entry fields." });
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
