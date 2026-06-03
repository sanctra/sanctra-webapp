export type Modality = "text" | "image" | "voice" | "video";

export type InteractionProfile = {
  package_id: string;
  subject_display_name: string;
  status: "approved_for_private_interaction" | "review_pending" | "blocked";
  allowed_modalities: Modality[];
  deferred_modalities: Modality[];
  blocked_modalities: Array<{ modality: Modality; reason: string }>;
  disclosure_labels: string[];
  artifact_refs: Array<{
    artifact_type: "portrait_image" | "memory_image" | "voice_sample" | "video_clip";
    display_label: string;
    review_status: "approved" | "pending" | "blocked";
    storage_uri?: string;
  }>;
  review_notes: string[];
};

export type InteractionSession = {
  session_id: string;
  package_id: string;
  allowed_modalities: Modality[];
  deferred_modalities: Modality[];
};

export type TurnResponse = {
  turn_id: string;
  interaction_session_id: string;
  type: "agent_text" | "adapter_error" | "modality_blocked";
  text: string;
  requested_modality: Modality;
  available_modalities: Modality[];
  deferred_modalities: Modality[];
};

export type FeedbackResponse = {
  feedback_id: string;
  interaction_session_id: string;
  status: "recorded_for_review";
};

export const defaultPackageId = "pkg_private_memorial_demo";

export const demoInteractionProfile: InteractionProfile = {
  package_id: defaultPackageId,
  subject_display_name: "Eleanor Grace",
  status: "approved_for_private_interaction",
  allowed_modalities: ["text", "image"],
  deferred_modalities: ["voice", "video"],
  blocked_modalities: [
    {
      modality: "voice",
      reason: "Speech-to-speech adapter is reserved for the next phase.",
    },
    {
      modality: "video",
      reason: "Full-motion video remains deferred until authority and media readiness gates pass.",
    },
  ],
  disclosure_labels: ["memorial-avatar", "review-bound", "no-current-awareness"],
  artifact_refs: [
    {
      artifact_type: "portrait_image",
      display_label: "Approved family portrait",
      review_status: "approved",
    },
  ],
  review_notes: [
    "Private family interaction only.",
    "Text and approved static imagery are enabled for this slice.",
    "Corpus and biography submission stay in the concierge/package-authoring lane.",
  ],
};

export function buildInteractionSession(packageId: string): InteractionSession {
  return {
    session_id: `sess_${Date.now().toString(36)}`,
    package_id: packageId,
    allowed_modalities: demoInteractionProfile.allowed_modalities,
    deferred_modalities: demoInteractionProfile.deferred_modalities,
  };
}

export function buildLocalTurnResponse(
  sessionId: string,
  text: string,
  modality: Modality = "text",
): TurnResponse {
  if (!demoInteractionProfile.allowed_modalities.includes(modality)) {
    const blocked = demoInteractionProfile.blocked_modalities.find((item) => item.modality === modality);
    return {
      turn_id: `turn_${Date.now().toString(36)}`,
      interaction_session_id: sessionId,
      type: "modality_blocked",
      text: blocked?.reason ?? "That modality is not available for this package yet.",
      requested_modality: modality,
      available_modalities: demoInteractionProfile.allowed_modalities,
      deferred_modalities: demoInteractionProfile.deferred_modalities,
    };
  }

  return {
    turn_id: `turn_${Date.now().toString(36)}`,
    interaction_session_id: sessionId,
    type: "agent_text",
    text: `I can answer in the approved text mode for Eleanor Grace. You asked: "${text}"`,
    requested_modality: modality,
    available_modalities: demoInteractionProfile.allowed_modalities,
    deferred_modalities: demoInteractionProfile.deferred_modalities,
  };
}
