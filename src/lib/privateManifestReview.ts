import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { cookies, headers } from "next/headers";

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

const PILOT_CORPUS_PREFIX = "gs://sanctra-corpus-intake/pilot-corpus/" as const;
const ADMIN_COOKIE_NAME = "sanctra_manifest_review_key";
const ADMIN_HEADER_NAME = "x-sanctra-manifest-review-key";

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

export type ManifestQueueSource = "gcs_metadata_export" | "fixture_only";

export type PrivateManifestQueue = {
  source: ManifestQueueSource;
  sourceLabel: string;
  manifests: IntakeManifest[];
};

export type ManifestReviewAccess = {
  allowed: boolean;
  reason: "allowed" | "admin_secret_missing" | "admin_secret_too_short" | "credential_missing" | "credential_mismatch";
};

const defaultBlockedOperations = [
  "provider_call",
  "training_or_finetuning",
  "public_delivery",
  "raw_browser_download",
  "derived_dataset_release",
];

const pilotFixtureManifestQueue: IntakeManifest[] = [
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

function safeCompare(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getPrivateManifestReviewAccess(): ManifestReviewAccess {
  const adminSecret = process.env.SANCTRA_PRIVATE_MANIFEST_REVIEW_ADMIN_SECRET;
  if (!adminSecret) return { allowed: false, reason: "admin_secret_missing" };
  if (adminSecret.length < 16) return { allowed: false, reason: "admin_secret_too_short" };

  const suppliedSecret = headers().get(ADMIN_HEADER_NAME) ?? cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!suppliedSecret) return { allowed: false, reason: "credential_missing" };
  if (!safeCompare(suppliedSecret, adminSecret)) return { allowed: false, reason: "credential_mismatch" };

  return { allowed: true, reason: "allowed" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStringArray(value: unknown, path: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`invalid private manifest queue: ${path} must be a string array`);
  }
}

function assertManifestItem(value: unknown, path: string): asserts value is ManifestItem {
  if (!isRecord(value)) throw new Error(`invalid private manifest queue: ${path} must be an object`);
  for (const key of ["id", "modality", "label", "reviewState", "provenanceNote", "consentNote", "authorityStatus", "identityConfidence", "likenessRisk", "reviewerRecommendation"] as const) {
    if (typeof value[key] !== "string") throw new Error(`invalid private manifest queue: ${path}.${key} must be a string`);
  }
  const modality = value.modality as string;
  const reviewState = value.reviewState as string;
  if (!["text", "audio", "image", "video"].includes(modality)) throw new Error(`invalid private manifest queue: ${path}.modality is not supported`);
  if (!REVIEW_STATES.includes(reviewState as ReviewState)) throw new Error(`invalid private manifest queue: ${path}.reviewState is not supported`);
  assertStringArray(value.privacyFlags, `${path}.privacyFlags`);
  assertStringArray(value.blockedOperations, `${path}.blockedOperations`);
}

function assertIntakeManifest(value: unknown, path: string): asserts value is IntakeManifest {
  if (!isRecord(value)) throw new Error(`invalid private manifest queue: ${path} must be an object`);
  for (const key of ["intakeId", "lane", "subjectDisplayName", "submitterDisplayName", "submittedAt", "manifestUri", "storageRoot", "manifestHash", "authorityStatus"] as const) {
    if (typeof value[key] !== "string") throw new Error(`invalid private manifest queue: ${path}.${key} must be a string`);
  }
  const lane = value.lane as string;
  const manifestUri = value.manifestUri as string;
  const storageRoot = value.storageRoot as string;
  if (!["live_subject", "posthumous_archive"].includes(lane)) throw new Error(`invalid private manifest queue: ${path}.lane is not supported`);
  if (!manifestUri.startsWith(PILOT_CORPUS_PREFIX) || !storageRoot.startsWith(PILOT_CORPUS_PREFIX)) {
    throw new Error(`invalid private manifest queue: ${path} must stay under ${PILOT_CORPUS_PREFIX}`);
  }
  assertStringArray(value.privacyFlags, `${path}.privacyFlags`);
  assertStringArray(value.blockedOperations, `${path}.blockedOperations`);
  if (!Array.isArray(value.items) || value.items.length === 0) throw new Error(`invalid private manifest queue: ${path}.items must be a non-empty array`);
  value.items.forEach((item, index) => assertManifestItem(item, `${path}.items[${index}]`));
}

function parseManifestQueue(rawJson: string, sourceLabel: string): PrivateManifestQueue {
  const parsed = JSON.parse(rawJson) as unknown;
  const manifests = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.manifests)
      ? parsed.manifests
      : null;
  if (!manifests) throw new Error(`invalid private manifest queue: ${sourceLabel} must be an array or { manifests: [...] }`);
  manifests.forEach((manifest, index) => assertIntakeManifest(manifest, `manifests[${index}]`));
  return { source: "gcs_metadata_export", sourceLabel, manifests };
}

export function loadPrivateManifestQueue(): PrivateManifestQueue {
  const inlineQueue = process.env.SANCTRA_PRIVATE_MANIFEST_QUEUE_JSON;
  if (inlineQueue) return parseManifestQueue(inlineQueue, "SANCTRA_PRIVATE_MANIFEST_QUEUE_JSON server-side GCS metadata export");

  const queuePath = process.env.SANCTRA_PRIVATE_MANIFEST_QUEUE_PATH;
  if (queuePath) {
    if (!existsSync(queuePath)) throw new Error(`private manifest queue path does not exist: ${queuePath}`);
    return parseManifestQueue(readFileSync(queuePath, "utf8"), "SANCTRA_PRIVATE_MANIFEST_QUEUE_PATH server-side GCS metadata export");
  }

  if (process.env.SANCTRA_PRIVATE_MANIFEST_REVIEW_FIXTURE_MODE === "enabled") {
    return {
      source: "fixture_only",
      sourceLabel: "explicit fixture-only mode; not live GCS manifest coverage",
      manifests: pilotFixtureManifestQueue,
    };
  }

  throw new Error("private manifest queue is not configured; set SANCTRA_PRIVATE_MANIFEST_QUEUE_JSON or SANCTRA_PRIVATE_MANIFEST_QUEUE_PATH, or explicitly enable SANCTRA_PRIVATE_MANIFEST_REVIEW_FIXTURE_MODE=enabled for non-production fixture review");
}

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

export type PackageDashboardModality = Modality | "missing";

export type PackageDashboardSummary = {
  intakeId: string;
  lane: ManifestLane;
  subjectLabel: string;
  submitterLabel: string;
  submittedAt: string;
  authorityStatus: AuthorityStatus;
  manifestRef: string;
  storageRef: string;
  modalityCounts: Record<Modality, number>;
  reviewCounts: Record<ReviewState, number>;
  readinessGaps: string[];
  reviewerState: string;
  blockedOperations: string[];
  privacyFlags: string[];
};

export type PackageDashboardData = {
  source: ManifestQueueSource;
  sourceLabel: string;
  summaries: PackageDashboardSummary[];
};

function redactedManifestRef(manifest: IntakeManifest): string {
  const lanePrefix = manifest.lane === "live_subject" ? "live-subject" : "family-archive";
  return `${lanePrefix}/${manifest.intakeId}/server-manifest.json · ${manifest.manifestHash}`;
}

function redactedStorageRef(manifest: IntakeManifest): string {
  const lanePrefix = manifest.lane === "live_subject" ? "live-subject" : "family-archive";
  return `${lanePrefix}/${manifest.intakeId}/ · raw object names withheld`;
}

function readinessGaps(manifest: IntakeManifest, counts: Record<Modality, number>, reviewCounts: Record<ReviewState, number>): string[] {
  const gaps: string[] = [];
  if (manifest.authorityStatus === "needs_authority_review" || manifest.authorityStatus === "disputed") {
    gaps.push("Authority review must resolve before package release.");
  }
  for (const modality of ["text", "audio", "image", "video"] as Modality[]) {
    if (counts[modality] === 0) gaps.push(`${modality} modality is missing from this packet.`);
  }
  if (reviewCounts.needs_review > 0 || reviewCounts.corpus_staged > 0) {
    gaps.push("Reviewer decisions are still pending for staged items.");
  }
  if (reviewCounts.quarantined > 0 || reviewCounts.rejected > 0) {
    gaps.push("Quarantined or rejected metadata must remain blocked from derived work.");
  }
  if (unresolvedFlags(manifest).length > 0) {
    gaps.push("Privacy, likeness, or third-party flags need explicit reviewer disposition.");
  }
  return gaps.length ? gaps : ["Metadata is review-ready for private package handoff; production release remains blocked."];
}

function reviewerState(reviewCounts: Record<ReviewState, number>): string {
  const accepted = reviewCounts.approved + reviewCounts.approved_with_limits;
  const blocked = reviewCounts.quarantined + reviewCounts.rejected;
  const pending = reviewCounts.corpus_staged + reviewCounts.needs_review;
  return `${accepted} accepted or limited · ${pending} pending · ${blocked} blocked`;
}

function summarizePackage(manifest: IntakeManifest): PackageDashboardSummary {
  const modalityCounts = countByModality(manifest);
  const reviewCounts = countByReviewState(manifest);
  return {
    intakeId: manifest.intakeId,
    lane: manifest.lane,
    subjectLabel: manifest.subjectDisplayName,
    submitterLabel: manifest.submitterDisplayName,
    submittedAt: manifest.submittedAt,
    authorityStatus: manifest.authorityStatus,
    manifestRef: redactedManifestRef(manifest),
    storageRef: redactedStorageRef(manifest),
    modalityCounts,
    reviewCounts,
    readinessGaps: readinessGaps(manifest, modalityCounts, reviewCounts),
    reviewerState: reviewerState(reviewCounts),
    blockedOperations: Array.from(new Set([...manifest.blockedOperations, ...manifest.items.flatMap((item) => item.blockedOperations)])).sort(),
    privacyFlags: unresolvedFlags(manifest),
  };
}

export function loadPackageDashboardData(): PackageDashboardData {
  const hasConfiguredQueue = Boolean(process.env.SANCTRA_PRIVATE_MANIFEST_QUEUE_JSON || process.env.SANCTRA_PRIVATE_MANIFEST_QUEUE_PATH);
  const explicitFixtureMode = process.env.SANCTRA_PRIVATE_MANIFEST_REVIEW_FIXTURE_MODE === "enabled";

  if (!hasConfiguredQueue && !explicitFixtureMode) {
    return {
      source: "fixture_only",
      sourceLabel: "fixture/local manifest metadata fallback; no live storage read or provider call",
      summaries: pilotFixtureManifestQueue.map(summarizePackage),
    };
  }

  const queue = loadPrivateManifestQueue();
  return {
    source: queue.source,
    sourceLabel: queue.sourceLabel,
    summaries: queue.manifests.map(summarizePackage),
  };
}
