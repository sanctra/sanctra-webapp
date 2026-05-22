import { NextRequest, NextResponse } from "next/server";

export const pilotRoles = ["pilot_admin", "pilot_reviewer", "pilot_operator_readonly"] as const;
export type PilotRole = (typeof pilotRoles)[number];

export type PilotActor = {
  actorId: string;
  role: PilotRole;
};

export const pilotMutationRoles = new Set<PilotRole>(["pilot_admin", "pilot_reviewer"]);
export const pilotReviewRoles = new Set<PilotRole>(["pilot_admin", "pilot_reviewer"]);
export const pilotReadRoles = new Set<PilotRole>(pilotRoles);

export const hardDisabledPilotOperations = [
  "model_training",
  "provider_finetune",
  "provider_call",
  "avatar_runtime_deployment",
  "public_delivery",
  "publish_release",
  "derived_dataset_release",
] as const;

export type HardDisabledPilotOperation = (typeof hardDisabledPilotOperations)[number];

export function isPilotRole(value: string | null | undefined): value is PilotRole {
  return !!value && (pilotRoles as readonly string[]).includes(value);
}

export function getPilotActorFromHeaders(headers: Headers): PilotActor | null {
  const actorId = headers.get("x-sanctra-pilot-actor-id") || process.env.SANCTRA_PILOT_ACTOR_ID || "";
  const role = headers.get("x-sanctra-pilot-actor-role") || process.env.SANCTRA_PILOT_ROLE || "";
  if (!actorId || !isPilotRole(role)) return null;
  return { actorId, role };
}

export function forbiddenPilotResponse(message = "Pilot admin/reviewer access is required.") {
  return NextResponse.json({ ok: false, error: message }, { status: 403, headers: { "Cache-Control": "no-store" } });
}

export function requirePilotRole(
  request: NextRequest,
  allowedRoles: ReadonlySet<PilotRole>,
  message = "Pilot access is required.",
) {
  const actor = getPilotActorFromHeaders(request.headers);
  if (!actor) return { error: forbiddenPilotResponse(message) };
  if (!allowedRoles.has(actor.role)) {
    return { error: forbiddenPilotResponse(`${actor.role} is not allowed for this pilot action.`) };
  }
  return { actor };
}

export function assertPilotOperationAllowed(operation: string) {
  if ((hardDisabledPilotOperations as readonly string[]).includes(operation)) {
    return {
      ok: false as const,
      error: `${operation} is hard-disabled in the pilot boundary and requires a later explicit two-person release gate.`,
    };
  }
  return { ok: true as const };
}
