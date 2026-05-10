export type ManifestLane = "live_subject" | "posthumous_archive";
export type ReviewState =
  | "corpus_staged"
  | "needs_review"
  | "quarantined"
  | "approved"
  | "approved_with_limits"
  | "rejected";
export type Modality = "text" | "audio" | "image" | "video";
export type AuthorityStatus = "self_attested" | "family_authorized" | "needs_authority_review" | "disputed";
export type IdentityConfidence = "high" | "medium" | "low" | "unverified";
export type LikenessRisk = "low" | "medium" | "high";

export const REVIEW_STATES: ReviewState[] = [
  "corpus_staged",
  "needs_review",
  "quarantined",
  "approved",
  "approved_with_limits",
  "rejected",
];

export const HARD_LOCKS = [
  "No provider calls",
  "No training or fine-tuning",
  "No public delivery",
  "No raw corpus exposure by default",
  "No browser-direct corpus download",
] as const;

export type ManifestItem = {
  id: string;
  modality: Modality;
  label: string;
  reviewState: ReviewState;
  provenanceNote: string;
  consentNote: string;
  authorityStatus: AuthorityStatus;
  identityConfidence: IdentityConfidence;
  privacyFlags: string[];
  likenessRisk: LikenessRisk;
  reviewerRecommendation: string;
  blockedOperations: string[];
};

export type IntakeManifest = {
  intakeId: string;
  lane: ManifestLane;
  subjectDisplayName: string;
  submitterDisplayName: string;
  submittedAt: string;
  manifestUri: `gs://sanctra-corpus-intake/pilot-corpus/${string}`;
  storageRoot: `gs://sanctra-corpus-intake/pilot-corpus/${string}`;
  manifestHash: string;
  authorityStatus: AuthorityStatus;
  privacyFlags: string[];
  blockedOperations: string[];
  items: ManifestItem[];
};

const defaultBlockedOperations = [
  "provider_call",
  "training_or_finetuning",
  "public_delivery",
  "raw_browser_download",
  "derived_dataset_release",
];

export const pilotManifestQueue: IntakeManifest[] = [
  {
    intakeId: "pilot-live-patrick-001",
    lane: "live_subject",
    subjectDisplayName: "Living subject pilot",
    submitterDisplayName: "Subject self-submission",
    submittedAt: "2026-05-10T13:42:00Z",
    manifestUri: "gs://sanctra-corpus-intake/pilot-corpus/live-subject/pilot-live-patrick-001/server-manifest.json",
    storageRoot: "gs://sanctra-corpus-intake/pilot-corpus/live-subject/pilot-live-patrick-001/",
    manifestHash: "sha256:metadata-only-live-subject-placeholder",
    authorityStatus: "self_attested",
    privacyFlags: ["living_subject", "likeness_control_required", "contact_before_derivatives"],
    blockedOperations: defaultBlockedOperations,
    items: [
      {
        id: "text-reflections-001",
        modality: "text",
        label: "Curated text reflections",
        reviewState: "approved_with_limits",
        provenanceNote: "Subject-authored packet metadata includes date/source notes and redaction boundaries.",
        consentNote: "Permitted for private package context only; not reusable for public delivery.",
        authorityStatus: "self_attested",
        identityConfidence: "high",
        privacyFlags: ["private_names_redacted", "relationship_context_only"],
        likenessRisk: "low",
        reviewerRecommendation: "Allow metadata/package-context reuse after final subject signoff.",
        blockedOperations: ["public_delivery", "training_or_finetuning"],
      },
      {
        id: "audio-sample-001",
        modality: "audio",
        label: "Voice sample manifest entry",
        reviewState: "needs_review",
        provenanceNote: "Recorder/date/single-speaker notes present; transcript confidence still pending.",
        consentNote: "Voice likeness consent must be explicitly confirmed before derivative voice work.",
        authorityStatus: "self_attested",
        identityConfidence: "medium",
        privacyFlags: ["voice_likeness", "background_speech_possible"],
        likenessRisk: "high",
        reviewerRecommendation: "Keep staged; request transcript/quality notes and explicit voice-likeness approval.",
        blockedOperations: defaultBlockedOperations,
      },
      {
        id: "image-reference-001",
        modality: "image",
        label: "Portrait/reference image metadata",
        reviewState: "corpus_staged",
        provenanceNote: "Source and date exist in manifest; visible third-party review still open.",
        consentNote: "May remain as metadata reference only until crop/avatar derivative approval exists.",
        authorityStatus: "self_attested",
        identityConfidence: "medium",
        privacyFlags: ["possible_third_party", "face_reference"],
        likenessRisk: "medium",
        reviewerRecommendation: "Review third-party visibility before any image-derived artifact work.",
        blockedOperations: ["raw_browser_download", "derived_dataset_release", "public_delivery"],
      },
    ],
  },
  {
    intakeId: "pilot-archive-family-001",
    lane: "posthumous_archive",
    subjectDisplayName: "Family archive pilot",
    submitterDisplayName: "Authorized family submitter",
    submittedAt: "2026-05-10T14:05:00Z",
    manifestUri: "gs://sanctra-corpus-intake/pilot-corpus/family-archive/pilot-archive-family-001/server-manifest.json",
    storageRoot: "gs://sanctra-corpus-intake/pilot-corpus/family-archive/pilot-archive-family-001/",
    manifestHash: "sha256:metadata-only-family-archive-placeholder",
    authorityStatus: "needs_authority_review",
    privacyFlags: ["family_authority_review", "third_party_screening", "archive_context"],
    blockedOperations: defaultBlockedOperations,
    items: [
      {
        id: "archive-letter-001",
        modality: "text",
        label: "Archive letter inventory entry",
        reviewState: "needs_review",
        provenanceNote: "Submitter relationship and source note present; author identity requires reviewer confirmation.",
        consentNote: "Family authority basis must be validated before memorial package reuse.",
        authorityStatus: "needs_authority_review",
        identityConfidence: "medium",
        privacyFlags: ["third_party_names", "family_context_sensitive"],
        likenessRisk: "low",
        reviewerRecommendation: "Request authority evidence and redact third-party names before approval.",
        blockedOperations: ["public_delivery", "derived_dataset_release"],
      },
      {
        id: "archive-video-001",
        modality: "video",
        label: "Home video manifest entry",
        reviewState: "quarantined",
        provenanceNote: "Scene context and owner notes incomplete; third parties and music likely present.",
        consentNote: "No video likeness or third-party privacy clearance exists in the current manifest.",
        authorityStatus: "needs_authority_review",
        identityConfidence: "low",
        privacyFlags: ["third_party_presence", "minor_possible", "music_background", "video_likeness"],
        likenessRisk: "high",
        reviewerRecommendation: "Quarantine. Do not expose raw video or start extraction until authority/privacy review resolves.",
        blockedOperations: defaultBlockedOperations,
      },
      {
        id: "archive-photo-001",
        modality: "image",
        label: "Family photo reference metadata",
        reviewState: "rejected",
        provenanceNote: "Manifest flags uncertain source and unresolved visible third-party identities.",
        consentNote: "No usable authority path for this item in the current pilot packet.",
        authorityStatus: "disputed",
        identityConfidence: "unverified",
        privacyFlags: ["disputed_authority", "third_party_presence", "uncertain_source"],
        likenessRisk: "medium",
        reviewerRecommendation: "Reject from pilot corpus; retain audit metadata only for accountability.",
        blockedOperations: defaultBlockedOperations,
      },
      {
        id: "archive-audio-001",
        modality: "audio",
        label: "Interview audio metadata",
        reviewState: "approved",
        provenanceNote: "Interview date/source and speaker identity confidence are recorded in manifest metadata.",
        consentNote: "Approved for private reviewer transcript/context only; voice cloning remains blocked.",
        authorityStatus: "family_authorized",
        identityConfidence: "high",
        privacyFlags: ["voice_likeness", "private_family_context"],
        likenessRisk: "medium",
        reviewerRecommendation: "Use for transcript/context review only; keep all derivative voice work blocked.",
        blockedOperations: ["training_or_finetuning", "provider_call", "public_delivery"],
      },
    ],
  },
];

export function countByModality(manifest: IntakeManifest): Record<Modality, number> {
  return manifest.items.reduce<Record<Modality, number>>(
    (counts, item) => ({ ...counts, [item.modality]: counts[item.modality] + 1 }),
    { text: 0, audio: 0, image: 0, video: 0 },
  );
}

export function countByReviewState(manifest: IntakeManifest): Record<ReviewState, number> {
  return manifest.items.reduce<Record<ReviewState, number>>(
    (counts, item) => ({ ...counts, [item.reviewState]: counts[item.reviewState] + 1 }),
    {
      corpus_staged: 0,
      needs_review: 0,
      quarantined: 0,
      approved: 0,
      approved_with_limits: 0,
      rejected: 0,
    },
  );
}

export function unresolvedFlags(manifest: IntakeManifest): string[] {
  return Array.from(new Set([
    ...manifest.privacyFlags,
    ...manifest.items.flatMap((item) => item.privacyFlags),
  ])).filter((flag) => /review|possible|third_party|disputed|uncertain|minor|likeness|background/.test(flag));
}

export function manifestStorageSummary(manifest: IntakeManifest): string {
  return `${manifest.manifestUri} · ${manifest.manifestHash} · raw object links withheld`;
}
