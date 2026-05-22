import {
  hardDisabledPilotOperations,
  type HardDisabledPilotOperation,
  type PilotActor,
} from "@/lib/pilotAccessBoundary";
import { isHighPresenceModality, type Modality, type ReviewState } from "@/lib/corpusIntake";

export type ReviewableManifestEntry = {
  slot_id: string;
  modality: Modality;
  review_state: ReviewState;
  manifest_eligible?: boolean;
  training_allowed?: boolean;
  derived_dataset_ready?: boolean;
  last_reviewed_by?: string;
  last_admin_confirmed_by?: string;
};

export type PilotReviewAction =
  | "reviewer_approve"
  | "reviewer_request_changes"
  | "reviewer_quarantine"
  | "reviewer_reject"
  | "admin_confirm_manifest_eligible";

export type PilotReviewMutationInput = {
  actor: PilotActor;
  action: PilotReviewAction;
  entry: ReviewableManifestEntry;
  reason: string;
  requestedOperation?: HardDisabledPilotOperation | string;
  now?: string;
};

const reviewerActions = new Set<PilotReviewAction>([
  "reviewer_approve",
  "reviewer_request_changes",
  "reviewer_quarantine",
  "reviewer_reject",
]);

const terminalReviewStates = new Set<ReviewState>(["manifest_eligible", "rejected"]);

function reject(error: string) {
  return { ok: false as const, error };
}

function sanitizeEntry(entry: ReviewableManifestEntry): ReviewableManifestEntry {
  return {
    ...entry,
    training_allowed: false,
    derived_dataset_ready: false,
  };
}

export function applyPilotReviewMutation(input: PilotReviewMutationInput) {
  const { actor, action, entry } = input;
  const reason = input.reason.trim();
  const timestamp = input.now || new Date().toISOString();

  if (!reason) return reject("A reviewer/admin decision reason is required.");
  if ((hardDisabledPilotOperations as readonly string[]).includes(String(input.requestedOperation || ""))) {
    return reject(`${input.requestedOperation} is hard-disabled in the pilot boundary.`);
  }
  if (entry.training_allowed === true || entry.derived_dataset_ready === true) {
    return reject("Reviewer/admin mutations cannot enable training or derived dataset readiness.");
  }
  if (terminalReviewStates.has(entry.review_state)) {
    return reject(`${entry.slot_id} is locked in terminal state ${entry.review_state}.`);
  }

  const highPresence = isHighPresenceModality(entry.modality);
  if (reviewerActions.has(action)) {
    if (actor.role !== "pilot_reviewer" && actor.role !== "pilot_admin") {
      return reject(`${actor.role} cannot record reviewer decisions.`);
    }
    const nextState: ReviewState =
      action === "reviewer_approve"
        ? "review_approved"
        : action === "reviewer_reject"
          ? "rejected"
          : action === "reviewer_quarantine"
            ? "quarantined"
            : "needs_review";
    const nextEntry = sanitizeEntry({
      ...entry,
      review_state: nextState,
      manifest_eligible: false,
      last_reviewed_by: actor.actorId,
    });
    return {
      ok: true as const,
      entry: nextEntry,
      audit: {
        event: "pilot_reviewer_mutation",
        actor_id: actor.actorId,
        actor_role: actor.role,
        timestamp,
        action,
        slot_id: entry.slot_id,
        modality: entry.modality,
        prior_state: entry.review_state,
        new_state: nextState,
        decision_reason: reason,
        manifest_eligible: false,
        admin_confirmation_required: action === "reviewer_approve" && highPresence,
        admin_confirmation_performed: false,
        training_allowed: false,
        derived_dataset_ready: false,
      },
    };
  }

  if (action !== "admin_confirm_manifest_eligible") return reject(`Unsupported pilot review action ${action}.`);
  if (actor.role !== "pilot_admin") return reject("pilot_admin is required to confirm manifest eligibility.");
  if (entry.review_state !== "review_approved") {
    return reject(`${entry.slot_id} must be review_approved before admin manifest eligibility confirmation.`);
  }
  if (highPresence && entry.last_reviewed_by === actor.actorId) {
    return reject("High-presence manifest eligibility requires a separate admin from the reviewer decision actor.");
  }

  const nextEntry = sanitizeEntry({
    ...entry,
    review_state: "manifest_eligible",
    manifest_eligible: true,
    last_admin_confirmed_by: actor.actorId,
  });
  return {
    ok: true as const,
    entry: nextEntry,
    audit: {
      event: "pilot_admin_manifest_eligibility_confirmed",
      actor_id: actor.actorId,
      actor_role: actor.role,
      timestamp,
      action,
      slot_id: entry.slot_id,
      modality: entry.modality,
      prior_state: entry.review_state,
      new_state: "manifest_eligible",
      decision_reason: reason,
      manifest_eligible: true,
      admin_confirmation_required: highPresence,
      admin_confirmation_performed: true,
      reviewer_actor_id: entry.last_reviewed_by || null,
      training_allowed: false,
      derived_dataset_ready: false,
    },
  };
}
