export type IntakeLane = "live_subject" | "posthumous_archive";
export type Modality = "text" | "audio" | "image" | "video" | "document";
export type ReviewState = "corpus_staged" | "needs_review" | "quarantined";

export type IntakeSlot = {
  id: string;
  modality: Modality;
  title: string;
  prompt: string;
  accepts: string;
  required: boolean;
  reviewState: ReviewState;
  guidance: string[];
};

export type LaneConfig = {
  lane: IntakeLane;
  eyebrow: string;
  title: string;
  subtitle: string;
  submitterRole: string;
  subjectStatus: "living_subject" | "posthumous_subject";
  consentTitle: string;
  consentText: string;
  relationshipQuestions: string[];
  slots: IntakeSlot[];
};

export const blockedOperations = [
  "model_training",
  "provider_finetune",
  "avatar_runtime_deployment",
  "public_delivery",
] as const;

const sharedSlots: IntakeSlot[] = [
  {
    id: "text-corpus",
    modality: "text",
    title: "Writing, messages, memories, and prompt responses",
    prompt: "Upload text files or documents and add notes about authorship, date range, private topics, and what the material should teach the avatar.",
    accepts: ".txt,.md,.json,.csv,.pdf,.doc,.docx",
    required: true,
    reviewState: "corpus_staged",
    guidance: ["Prefer owned/self-authored text first.", "Flag names, private events, medical/financial content, and anything excluded from training."],
  },
  {
    id: "audio-corpus",
    modality: "audio",
    title: "Voice and audio samples",
    prompt: "Upload clean single-speaker clips, interviews, or natural speech. Add recording context, speaker identity, background voices/music, and transcript availability.",
    accepts: ".wav,.mp3,.m4a,.flac,.aac,.ogg",
    required: true,
    reviewState: "needs_review",
    guidance: ["Voice likeness remains review-gated.", "Single-speaker, low-noise clips are most useful for future audio tuning."],
  },
  {
    id: "image-corpus",
    modality: "image",
    title: "Photos and visual references",
    prompt: "Upload portraits and reference images. Add photographer/source, date/context, visible third parties, and whether crops/derivatives are allowed.",
    accepts: ".jpg,.jpeg,.png,.webp,.heic",
    required: true,
    reviewState: "needs_review",
    guidance: ["Images with other people, minors, or private locations need explicit notes.", "Originals are corpus material; training crops are later derived datasets."],
  },
  {
    id: "video-corpus",
    modality: "video",
    title: "Video, gesture, and presence samples",
    prompt: "Upload short clips that show face, voice, gestures, posture, or storytelling style. Add context, speaker confidence, third parties, and music/copyright concerns.",
    accepts: ".mp4,.mov,.webm,.m4v",
    required: true,
    reviewState: "needs_review",
    guidance: ["Video is high-presence corpus material and defaults to review required.", "Avatar training/deployment stays blocked until a later gate."],
  },
];

export const laneConfigs: Record<IntakeLane, LaneConfig> = {
  live_subject: {
    lane: "live_subject",
    eyebrow: "Live submission UI · Subject 001",
    title: "Submit your own Sanctra corpus as the living subject",
    subtitle: "Guided intake for Patrick to contribute text, audio, image, and video materials that can later be curated into modality-specific datasets.",
    submitterRole: "self / living subject",
    subjectStatus: "living_subject",
    consentTitle: "Living-subject corpus consent",
    consentText: "I am the subject and submitter. I consent to Sanctra storing these files as a private pilot corpus for review, dataset design, evaluation, and later explicitly approved training/tuning gates. I understand this submission alone does not authorize public delivery or runtime avatar deployment.",
    relationshipQuestions: [
      "What should this avatar learn about your voice, values, style, and boundaries?",
      "Which people, topics, periods of life, or materials should be excluded or treated as private-only?",
      "Are any uploaded files co-created, third-party-owned, or sensitive enough to require quarantine?",
    ],
    slots: sharedSlots,
  },
  posthumous_archive: {
    lane: "posthumous_archive",
    eyebrow: "Posthumous/archive UI · simulated with Patrick data",
    title: "Upload an archive as a family member or professional",
    subtitle: "A separate guided lane for family/professional submitters to inventory a subject archive, authority basis, conflicts, provenance, and privacy risks.",
    submitterRole: "family/professional archive submitter",
    subjectStatus: "posthumous_subject",
    consentTitle: "Archive authority and conflict disclosure",
    consentText: "I am submitting an archive packet for review-gated Sanctra corpus intake. For this pilot, Patrick will use his own data to simulate the lane. In production, this lane requires authority basis, known subject wishes, family conflict status, third-party privacy review, and human approval before training or public use.",
    relationshipQuestions: [
      "What is your relationship to the subject, and what authority lets you submit these materials?",
      "Are there known conflicts, objections, legal restrictions, or unclear ownership claims?",
      "Which materials include third parties, minors, private settings, copyrighted media, or disputed memories?",
    ],
    slots: sharedSlots.map((slot) => ({ ...slot, reviewState: slot.modality === "text" ? "needs_review" : "quarantined" })),
  },
};

export function buildClientManifest(input: {
  lane: IntakeLane;
  subjectName: string;
  submitterName: string;
  relationshipAnswers: Record<string, string>;
  operatorNotes: string;
  selectedFiles: Array<{ slotId: string; name: string; type: string; size: number }>;
}) {
  const config = laneConfigs[input.lane];
  const now = new Date().toISOString();
  return {
    schema_version: "sanctra.corpus_intake.v0",
    intake_id: `corpus:${input.lane}:${Date.now()}`,
    created_at: now,
    lane: input.lane,
    subject: {
      display_name: input.subjectName || "Patrick self-pilot",
      subject_status: config.subjectStatus,
      subject_ref: input.lane === "live_subject" ? "subject:patrick_live_self_pilot" : "subject:patrick_archive_simulation_pilot",
    },
    submitter: {
      display_name: input.submitterName || "Patrick",
      role: config.submitterRole,
      relationship_to_subject: input.lane === "live_subject" ? "self" : "self_simulating_family_or_professional_submitter",
    },
    consent_authority: {
      title: config.consentTitle,
      consent_text: config.consentText,
      consent_checked_in_ui: true,
      review_required: true,
      revocation_supported: true,
      blocked_operations: [...blockedOperations],
    },
    relationship_answers: input.relationshipAnswers,
    operator_notes: input.operatorNotes,
    corpus_policy: {
      raw_corpus_private: true,
      canonical_dataset_derivation_required: true,
      modality_dataset_shape_review_required: true,
      training_requires_later_explicit_gate: true,
      blocked_operations: [...blockedOperations],
    },
    files: input.selectedFiles.map((file) => {
      const slot = config.slots.find((candidate) => candidate.id === file.slotId);
      return {
        slot_id: file.slotId,
        modality: slot?.modality ?? "document",
        original_filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        review_state: slot?.reviewState ?? "needs_review",
        storage_uri: "pending_server_upload",
        derived_dataset_ready: false,
        training_allowed: false,
      };
    }),
  };
}
