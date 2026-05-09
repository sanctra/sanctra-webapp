"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./DatasetSubmissionPage.module.css";

type Lane = "living_subject_prompted" | "posthumous_archive";
type SubjectStatus = "living_subject" | "posthumous_family_archive";
type Relationship = "self" | "synthetic_archive_submitter";
type Modality = "text" | "image" | "audio" | "video";
type SourceKind = "text" | "document" | "photo" | "audio" | "video" | "transcript" | "metadata";
type SensitivityLevel = "low" | "moderate" | "high" | "restricted";
type ReviewState = "requires_review" | "quarantined" | "approved_with_limits";

type IntakeArtifactSlot = {
  slotId: string;
  modality: Modality;
  sourceKind: SourceKind;
  promptRef?: string;
  file?: {
    name: string;
    type: string;
    sizeBytes: number;
    durationSeconds?: number;
    sha256Placeholder?: string;
  };
  textValue?: string;
  storageUri: string;
  provenanceNotes: string;
  rightsNotes: string;
  sensitivityLevel: SensitivityLevel;
  qualityNotes: string;
  usableFor: string[];
  excludeFrom: string[];
  reviewState: ReviewState;
};

type SelfSubmittedIntakeDraft = {
  draftId: string;
  lane: Lane;
  subject: {
    subjectRef: string;
    displayName: string;
    subjectStatus: SubjectStatus;
  };
  submitter: {
    submitterRef: string;
    relationshipToSubject: Relationship;
  };
  authorityAssertion: {
    assertionText: string;
    assertedByRef: string;
    assertedAt: string;
    authorityRecordRef: string;
    consentGrantRef: string;
    revocationAcknowledged: boolean;
    stopConditionsAcknowledged: boolean;
    reviewerRequired: true;
  };
  artifacts: IntakeArtifactSlot[];
  operatorNotes: string;
};

type IntakeManifest = {
  schema_version: "sanctra.live_test_intake_manifest.v0";
  intake_id: string;
  package_ref: string;
  subject_ref: string;
  submitted_by: string;
  storage_root: string;
  operator_notes: string;
  items: Array<Record<string, unknown>>;
  created_at: string;
  submission_lane: Lane;
  archive_context: {
    subject_status: SubjectStatus;
    uploader_relationship: string;
    authority_record_ref: string;
    consent_basis: string;
    reviewer_required: true;
    notes: string;
    consent_grant_ref: string;
    audience_profile_ref: string;
    revocation_acknowledgement_ref: string;
    revocation_acknowledgement: Record<string, unknown>;
    stop_conditions_acknowledged: boolean;
  };
};

type IntakePreflight = {
  schema_version: "sanctra.live_test_intake_preflight.v0";
  preflight_id: string;
  intake_ref: string;
  package_ref: string;
  status: "ready_for_package_import" | "ready_with_warnings" | "blocked";
  counts: Record<string, number>;
  duration_seconds: Record<string, number>;
  readiness_hints: string[];
  source_inventory_fragment: Record<string, unknown>;
  blockers: string[];
  warnings: string[];
  next_actions: string[];
  created_at: string;
  accepted_items: Array<Record<string, unknown>>;
  quarantined_items: Array<Record<string, unknown>>;
  submission_lane: Lane;
  triage_counts: Record<string, number>;
  manifest_gate_status: "blocked" | "ready_for_review" | "ready_for_evaluation_manifest";
  blocked_operations: string[];
  modality_readiness: Array<Record<string, unknown>>;
};

type LaneCopy = {
  label: string;
  subtitle: string;
  prepare: string[];
  assertion: string;
  subjectStatus: SubjectStatus;
  relationship: Relationship;
  storagePrefix: string;
};

const generatedAt = "2026-05-09T21:17:00.000Z";
const draftId = "draft:patrick_self_dataset_pilot";
const subjectRef = "subject:patrick_self_pilot";
const submitterRef = "stakeholder:patrick_self";
const authorityRecordRef = "authority:patrick_self_dataset_pilot";
const consentGrantRef = "consent:patrick_self_dataset_pilot";
const audienceProfileRef = "audience:patrick_private_pilot";
const revocationAcknowledgementRef = "revocation:patrick_self_dataset_pilot";
const blockedPilotOperations = ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment"];
const packageRef = "package:patrick_self_dataset_pilot";
const storageKey = "sanctra-self-dataset-intake-draft-v0";

const laneCopy: Record<Lane, LaneCopy> = {
  living_subject_prompted: {
    label: "Directed / living-subject lane",
    subtitle: "Patrick intentionally supplies fresh text, image, audio, and video responses as himself for a bounded pilot.",
    prepare: [
      "Text: typed answers, pasted writing samples, or transcript-style prompt responses.",
      "Image: selected self-provided photos or documents, represented here as local metadata only.",
      "Audio: voice clips for review-bound intake; this UI records filename/metadata but does not upload audio.",
      "Video: video clips for review-bound intake; this UI records filename/metadata but does not call providers.",
    ],
    assertion: "I am Patrick, the living subject, and I intentionally submit my own materials for bounded Sanctra pilot intake, local manifest generation, and review-gated preflight only.",
    subjectStatus: "living_subject",
    relationship: "self",
    storagePrefix: `redacted://sanctra-pilot/patrick/living_subject_prompted/${draftId}`,
  },
  posthumous_archive: {
    label: "Posthumous / archive-simulation lane",
    subtitle: "Patrick uploads his own existing material as a synthetic family/archive packet to exercise posthumous intake UX without a third party.",
    prepare: [
      "Text: journals, notes, letters, transcripts, or metadata summaries he owns and chooses to include.",
      "Image: family/archive-style images represented as file metadata and redacted storage references.",
      "Audio: existing voice recordings represented as local metadata with mandatory review state.",
      "Video: archive video clips represented as local metadata with limits and exclusions.",
    ],
    assertion: "I am Patrick submitting my own existing archive material as a synthetic posthumous-family archive packet for UX/preflight testing only; no third-party likeness is being authorized.",
    subjectStatus: "posthumous_family_archive",
    relationship: "synthetic_archive_submitter",
    storagePrefix: `redacted://sanctra-pilot/patrick/posthumous_archive/${draftId}`,
  },
};

const defaultArtifacts: IntakeArtifactSlot[] = [
  {
    slotId: "slot:text:001",
    modality: "text",
    sourceKind: "text",
    promptRef: "prompt:identity_voice_baseline",
    textValue: "",
    storageUri: `redacted://sanctra-pilot/patrick/living_subject_prompted/${draftId}/text/identity-voice-baseline.txt`,
    provenanceNotes: "Typed by Patrick in the local UI during pilot intake.",
    rightsNotes: "Self-submitted by the subject for bounded review-gated Sanctra testing.",
    sensitivityLevel: "moderate",
    qualityNotes: "Awaiting typed response and human review.",
    usableFor: ["preflight_manifest", "text_style_review"],
    excludeFrom: ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment"],
    reviewState: "requires_review",
  },
  {
    slotId: "slot:image:001",
    modality: "image",
    sourceKind: "photo",
    storageUri: `redacted://sanctra-pilot/patrick/living_subject_prompted/${draftId}/image/self-provided-photo`,
    provenanceNotes: "File selected locally by Patrick; browser object/file bytes are not persisted in the manifest.",
    rightsNotes: "Self-provided or owned material; must be reviewed before downstream use.",
    sensitivityLevel: "high",
    qualityNotes: "Needs identity, privacy, and likeness review.",
    usableFor: ["preflight_manifest", "visual_reference_review"],
    excludeFrom: ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment", "artifact_generation"],
    reviewState: "requires_review",
  },
  {
    slotId: "slot:audio:001",
    modality: "audio",
    sourceKind: "audio",
    storageUri: `redacted://sanctra-pilot/patrick/living_subject_prompted/${draftId}/audio/self-provided-voice`,
    provenanceNotes: "File selected locally by Patrick; no raw audio leaves the browser in this implementation.",
    rightsNotes: "Self-submitted voice material; must remain review-gated.",
    sensitivityLevel: "restricted",
    qualityNotes: "Needs audio quality and consent/identity review.",
    usableFor: ["preflight_manifest", "voice_readiness_review"],
    excludeFrom: ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment", "artifact_generation"],
    reviewState: "requires_review",
  },
  {
    slotId: "slot:video:001",
    modality: "video",
    sourceKind: "video",
    storageUri: `redacted://sanctra-pilot/patrick/living_subject_prompted/${draftId}/video/self-provided-video`,
    provenanceNotes: "File selected locally by Patrick; no raw video leaves the browser in this implementation.",
    rightsNotes: "Self-submitted video material; must remain review-gated.",
    sensitivityLevel: "restricted",
    qualityNotes: "Needs video quality, likeness, and privacy review.",
    usableFor: ["preflight_manifest", "video_readiness_review"],
    excludeFrom: ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment", "artifact_generation"],
    reviewState: "requires_review",
  },
];

function sanitizeRef(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_:-]+|[_:-]+$/g, "")
    .slice(0, 72);
  return normalized || fallback;
}

function withLaneStorage(artifact: IntakeArtifactSlot, lane: Lane): IntakeArtifactSlot {
  const suffix = artifact.storageUri.split("/").slice(-2).join("/");
  return {
    ...artifact,
    storageUri: `${laneCopy[lane].storagePrefix}/${suffix}`,
    promptRef: lane === "living_subject_prompted" ? artifact.promptRef ?? `prompt:${artifact.modality}_pilot_sample` : undefined,
  };
}

function makeDraft(lane: Lane, artifacts: IntakeArtifactSlot[], operatorNotes: string, now: string): SelfSubmittedIntakeDraft {
  const copy = laneCopy[lane];
  return {
    draftId,
    lane,
    subject: {
      subjectRef,
      displayName: "Patrick self-pilot subject",
      subjectStatus: copy.subjectStatus,
    },
    submitter: {
      submitterRef,
      relationshipToSubject: copy.relationship,
    },
    authorityAssertion: {
      assertionText: copy.assertion,
      assertedByRef: submitterRef,
      assertedAt: now,
      authorityRecordRef,
      consentGrantRef,
      revocationAcknowledged: true,
      stopConditionsAcknowledged: true,
      reviewerRequired: true,
    },
    artifacts,
    operatorNotes,
  };
}

function makeManifest(draft: SelfSubmittedIntakeDraft): IntakeManifest {
  return {
    schema_version: "sanctra.live_test_intake_manifest.v0",
    intake_id: "intake:patrick_self_dataset_pilot",
    package_ref: packageRef,
    subject_ref: draft.subject.subjectRef,
    submitted_by: draft.submitter.submitterRef,
    storage_root: laneCopy[draft.lane].storagePrefix,
    operator_notes: draft.operatorNotes || "Self-dataset UI pilot package generated locally; raw private media is not persisted in this repository or sent to providers.",
    created_at: draft.authorityAssertion.assertedAt,
    submission_lane: draft.lane,
    archive_context: {
      subject_status: draft.subject.subjectStatus,
      uploader_relationship: draft.lane === "living_subject_prompted" ? "self" : "self submitting own archive as synthetic family/archive packet",
      authority_record_ref: draft.authorityAssertion.authorityRecordRef,
      consent_basis: draft.lane === "living_subject_prompted" ? "Patrick self-submitted living-subject private pilot; no provider calls, no training, no public delivery" : "Patrick-owned synthetic posthumous/archive simulation; no third-party authority implied",
      reviewer_required: true,
      notes: draft.lane === "living_subject_prompted" ? "Living-subject private pilot lane." : "Synthetic archive simulation using Patrick-owned material only; no third-party posthumous authority is implied.",
      consent_grant_ref: draft.authorityAssertion.consentGrantRef,
      revocation_acknowledgement_ref: revocationAcknowledgementRef,
      audience_profile_ref: audienceProfileRef,
      revocation_acknowledgement: {
        acknowledged_by: draft.authorityAssertion.assertedByRef,
        acknowledged_at: draft.authorityAssertion.assertedAt,
        copy: "I can revoke or exclude submitted material before any later controlled processing step.",
      },
      stop_conditions_acknowledged: draft.authorityAssertion.stopConditionsAcknowledged,
    },
    items: draft.artifacts.map((artifact, index) => ({
      source_id: sanitizeRef(`source:${artifact.modality}:${index + 1}:${artifact.file?.name ?? artifact.slotId}`, `source:${artifact.modality}:${index + 1}`),
      kind: artifact.sourceKind,
      storage_uri: artifact.storageUri,
      filename_hint: artifact.file?.name,
      duration_seconds: artifact.file?.durationSeconds,
      prompt_ref: artifact.promptRef,
      capture_context: artifact.textValue ? "typed_local_text_entry" : "local_file_metadata_only_no_upload",
      triage_status: artifact.reviewState === "quarantined" ? "quarantined" : "accepted",
      readiness_gap: artifact.reviewState === "requires_review" ? "Human review is required before any downstream artifact generation." : undefined,
      provenance_notes: artifact.provenanceNotes,
      rights_notes: artifact.rightsNotes,
      sensitivity_level: artifact.sensitivityLevel,
      quality_notes: artifact.qualityNotes,
      usable_for: artifact.usableFor,
      exclude_from: artifact.excludeFrom,
      retention_policy: "local draft and redacted manifest only until controlled storage review is approved",
      uploader_authority: {
        uploader_ref: draft.authorityAssertion.assertedByRef,
        relationship_to_subject: draft.submitter.relationshipToSubject,
        authority_record_ref: draft.authorityAssertion.authorityRecordRef,
        authority_status: "verified",
        notes: draft.lane === "living_subject_prompted" ? "Subject self-submitted in authenticated/private pilot context." : "Synthetic archive simulation, not third-party posthumous authority.",
      },
      consent_linkage: {
        consent_ref: draft.authorityAssertion.consentGrantRef,
        allowed_uses: draft.lane === "living_subject_prompted" ? ["private_preflight", "guardrail_evaluation", "review_package"] : ["private_preflight", "archive_flow_simulation", "review_package"],
        restricted_uses: draft.lane === "living_subject_prompted" ? ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment"] : ["provider_call", "model_training", "public_delivery", "runtime_avatar_deployment", "third_party_memorial_claim"],
        revocation_policy: "Patrick can revoke or exclude material before any later controlled processing step.",
        notes: "Bounded local/preflight package only; no provider calls, training, public delivery, or runtime deployment.",
      },
      identity_confidence: {
        level: "high",
        basis: draft.lane === "living_subject_prompted" ? "Living subject self-asserted identity in pilot UI." : "Synthetic posthumous/archive lane using Patrick-owned self material only.",
        notes: "Human review remains required before any downstream use.",
      },
      provenance_chain: [draft.draftId, artifact.slotId],
      quarantine_reasons: artifact.reviewState === "quarantined" ? ["User marked this slot quarantined in the local UI."] : [],
      archive_readiness_tags: [`modality:${artifact.modality}`, `lane:${draft.lane}`, `review:${artifact.reviewState}`],
      review_state: artifact.reviewState,
      privacy_scope: "private_pilot_only",
      audience_scope: [draft.submitter.submitterRef],
      sha256_placeholder: artifact.file?.sha256Placeholder,
    })).map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined))),
  };
}

function makePreflight(manifest: IntakeManifest): IntakePreflight {
  const items = manifest.items;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const kind = String(item.kind);
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
  const accepted = items.filter((item) => item.triage_status === "accepted");
  const quarantined = items.filter((item) => item.triage_status === "quarantined");
  const reviewWarnings = items.filter((item) => item.review_state === "requires_review").length;
  const warnings = [
    "Raw private media is not uploaded by this UI; storage_uri values are redacted placeholders.",
    ...(reviewWarnings ? [`${reviewWarnings} item(s) require human review before downstream use.`] : []),
  ];

  return {
    schema_version: "sanctra.live_test_intake_preflight.v0",
    preflight_id: "preflight:patrick_self_dataset_pilot",
    intake_ref: manifest.intake_id,
    package_ref: manifest.package_ref,
    status: accepted.length ? (quarantined.length ? "blocked" : "ready_with_warnings") : "blocked",
    counts,
    duration_seconds: {},
    readiness_hints: [
      "Manifest shape is compatible with the live-test intake schema contract.",
      "All four requested modalities are represented with local metadata or typed text.",
      "Provider calls and public deployment are intentionally out of scope for this intake boundary.",
    ],
    source_inventory_fragment: {
      storage_root: manifest.storage_root,
      source_ids: items.map((item) => item.source_id),
      modalities: Object.keys(counts),
    },
    blockers: accepted.length ? (quarantined.length ? ["One or more slots are quarantined and must be resolved before package import."] : []) : ["At least one accepted self-submitted artifact slot is required."],
    warnings,
    next_actions: [
      "Export the manifest/preflight JSON for local scaffold validation or backend import tests.",
      "Replace redacted:// storage placeholders only after controlled storage has been approved.",
      "Keep all text/image/audio/video material review-gated before any generation or provider call.",
    ],
    created_at: manifest.created_at,
    accepted_items: accepted.map((item) => ({ source_id: item.source_id, kind: item.kind, decision: "accepted", reasons: ["Local intake slot is present and review-gated."], readiness_tags: item.archive_readiness_tags })),
    quarantined_items: quarantined.map((item) => ({ source_id: item.source_id, kind: item.kind, decision: "quarantined", reasons: ["Marked quarantined in local intake UI."], readiness_tags: item.archive_readiness_tags })),
    submission_lane: manifest.submission_lane,
    triage_counts: {
      accepted: accepted.length,
      quarantined: quarantined.length,
      requires_review: reviewWarnings,
    },
    manifest_gate_status: quarantined.length || !accepted.length ? "blocked" : "ready_for_review",
    blocked_operations: blockedPilotOperations,
    modality_readiness: ["text", "image", "audio", "video", "runtime_persona"].map((modality) => {
      const related = items.filter((item) => String(item.kind) === modality || (modality === "image" && item.kind === "photo") || (modality === "runtime_persona" && ["text", "document", "transcript"].includes(String(item.kind))));
      return {
        modality,
        status: related.length ? "requires_review" : "missing",
        gaps: related.length ? ["Human review required before evaluation manifest, model/provider, or runtime-avatar boundary use."] : [`Missing ${modality} slot for this lane.`],
        related_source_ids: related.map((item) => item.source_id),
      };
    }),
  };
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ArtifactEditor({ artifact, lane, onChange }: { artifact: IntakeArtifactSlot; lane: Lane; onChange: (artifact: IntakeArtifactSlot) => void }) {
  const fileAccept = artifact.modality === "image" ? "image/*" : artifact.modality === "audio" ? "audio/*" : artifact.modality === "video" ? "video/*" : ".txt,.md,.json,text/plain";
  const textOnly = artifact.modality === "text";

  return (
    <article className={styles.slotCard}>
      <div className={styles.slotHeader}>
        <div>
          <p className={styles.kicker}>{artifact.modality} slot</p>
          <h3>{artifact.modality === "text" ? "Typed or document text" : `${artifact.modality} file metadata`}</h3>
        </div>
        <select
          className={styles.select}
          aria-label={`${artifact.modality} review state`}
          value={artifact.reviewState}
          onChange={(event) => onChange({ ...artifact, reviewState: event.target.value as ReviewState })}
        >
          <option value="requires_review">Requires review</option>
          <option value="approved_with_limits">Approved with limits</option>
          <option value="quarantined">Quarantined</option>
        </select>
      </div>

      {textOnly ? (
        <label className={styles.field} htmlFor={`${artifact.slotId}-text`}>
          <span className={styles.kicker}>Text entry</span>
          <textarea
            id={`${artifact.slotId}-text`}
            className={styles.input}
            rows={4}
            value={artifact.textValue ?? ""}
            onChange={(event) => onChange({ ...artifact, textValue: event.target.value, storageUri: `${laneCopy[lane].storagePrefix}/text/${sanitizeRef(event.target.value.slice(0, 24), "typed-response")}.txt` })}
            placeholder="Paste or type a self-submitted response. The manifest stores a redacted:// reference, not the raw private text."
          />
        </label>
      ) : (
        <label className={styles.field} htmlFor={`${artifact.slotId}-file`}>
          <span className={styles.kicker}>Local file picker</span>
          <input
            id={`${artifact.slotId}-file`}
            className={styles.input}
            type="file"
            accept={fileAccept}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onChange({
                ...artifact,
                file: {
                  name: file.name,
                  type: file.type || `${artifact.modality}/unknown`,
                  sizeBytes: file.size,
                  sha256Placeholder: `sha256:placeholder:${sanitizeRef(file.name, artifact.modality)}`,
                },
                storageUri: `${laneCopy[lane].storagePrefix}/${artifact.modality}/${sanitizeRef(file.name, artifact.modality)}`,
              });
            }}
          />
        </label>
      )}

      <div className={styles.twoCol}>
        <label className={styles.field} htmlFor={`${artifact.slotId}-sensitivity`}>
          <span className={styles.kicker}>Sensitivity</span>
          <select
            id={`${artifact.slotId}-sensitivity`}
            className={styles.select}
            value={artifact.sensitivityLevel}
            onChange={(event) => onChange({ ...artifact, sensitivityLevel: event.target.value as SensitivityLevel })}
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="restricted">Restricted</option>
          </select>
        </label>
        <label className={styles.field} htmlFor={`${artifact.slotId}-kind`}>
          <span className={styles.kicker}>Source kind</span>
          <select
            id={`${artifact.slotId}-kind`}
            className={styles.select}
            value={artifact.sourceKind}
            onChange={(event) => onChange({ ...artifact, sourceKind: event.target.value as SourceKind })}
          >
            <option value="text">Text</option>
            <option value="document">Document</option>
            <option value="photo">Photo</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="transcript">Transcript</option>
            <option value="metadata">Metadata</option>
          </select>
        </label>
      </div>

      <label className={styles.field} htmlFor={`${artifact.slotId}-quality`}>
        <span className={styles.kicker}>Quality / provenance notes</span>
        <textarea
          id={`${artifact.slotId}-quality`}
          className={styles.input}
          rows={3}
          value={`${artifact.provenanceNotes}\n${artifact.qualityNotes}`}
          onChange={(event) => {
            const [provenanceNotes = "", ...rest] = event.target.value.split("\n");
            onChange({ ...artifact, provenanceNotes, qualityNotes: rest.join("\n") || provenanceNotes });
          }}
        />
      </label>

      <p className={styles.uri}>{artifact.storageUri}</p>
      {artifact.file && <p className={styles.slotMeta}>{artifact.file.name} · {artifact.file.type || "unknown type"} · {artifact.file.sizeBytes.toLocaleString()} bytes</p>}
    </article>
  );
}

export default function DatasetSubmissionPage() {
  const [lane, setLane] = useState<Lane>("living_subject_prompted");
  const [artifacts, setArtifacts] = useState<IntakeArtifactSlot[]>(() => defaultArtifacts.map((artifact) => withLaneStorage(artifact, "living_subject_prompted")));
  const [operatorNotes, setOperatorNotes] = useState("Patrick self-dataset pilot: local-only manifest/preflight generation for text, image, audio, and video intake slots.");
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(generatedAt);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const draft = useMemo(() => makeDraft(lane, artifacts, operatorNotes, now), [lane, artifacts, operatorNotes, now]);
  const manifest = useMemo(() => makeManifest(draft), [draft]);
  const preflight = useMemo(() => makePreflight(manifest), [manifest]);
  const copy = laneCopy[lane];
  const modalitiesPresent = new Set(artifacts.map((artifact) => artifact.modality)).size === 4;
  const authorityReady = consentAccepted && draft.authorityAssertion.revocationAcknowledged && draft.authorityAssertion.stopConditionsAcknowledged;
  const canExport = modalitiesPresent && authorityReady && manifest.items.length >= 4;

  const switchLane = (next: Lane) => {
    setLane(next);
    setArtifacts((current) => current.map((artifact) => withLaneStorage(artifact, next)));
    setConsentAccepted(false);
    setSaved(false);
  };

  const updateArtifact = (slotId: string, next: IntakeArtifactSlot) => {
    setArtifacts((current) => current.map((artifact) => (artifact.slotId === slotId ? next : artifact)));
    setSaved(false);
  };

  const saveLocal = () => {
    if (!authorityReady) return;
    const savedAt = new Date().toISOString();
    setNow(savedAt);
    const payload = { draft: makeDraft(lane, artifacts, operatorNotes, savedAt), manifest: makeManifest(makeDraft(lane, artifacts, operatorNotes, savedAt)), preflight: makePreflight(makeManifest(makeDraft(lane, artifacts, operatorNotes, savedAt))) };
    window.localStorage.setItem(storageKey, JSON.stringify(payload, null, 2));
    setSaved(true);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Self-dataset intake · no provider calls</p>
          <h1 className={styles.title}>Submit Patrick&apos;s text, image, audio, and video pilot materials</h1>
          <p className={styles.subtitle}>
            This local/dev UI builds a deterministic draft, live-test intake manifest, and preflight preview for the existing Sanctra scaffold. Raw private media stays in the browser file picker; exported JSON uses redacted storage placeholders.
          </p>
        </div>
        <Link className={styles.link} href="/">Back to session</Link>
      </header>

      <section className={`${styles.card} ${styles.consent}`} aria-labelledby="lane-title">
        <h2 id="lane-title">1. Choose the pilot lane</h2>
        <p className={styles.subtitle}>Both lanes are self-submitted by Patrick. The second lane simulates posthumous/archive intake UX without involving third-party data.</p>
        <div className={styles.controls} role="group" aria-label="Dataset submission lane">
          {(["living_subject_prompted", "posthumous_archive"] as Lane[]).map((option) => (
            <button key={option} type="button" className={`${styles.button} ${lane === option ? "" : styles.secondary}`} onClick={() => switchLane(option)} aria-pressed={lane === option}>
              {laneCopy[option].label}
            </button>
          ))}
        </div>
        <p className={styles.subtitle}>{copy.subtitle}</p>
        <div className={styles.notice}>
          <strong>Consent / authority copy</strong>
          {copy.assertion}
        </div>
        <label className={styles.check} htmlFor="authority-consent">
          <input id="authority-consent" type="checkbox" checked={consentAccepted} onChange={(event) => { setConsentAccepted(event.target.checked); setSaved(false); }} />
          <span>I accept this lane-specific consent/authority statement, acknowledge revocation and stop-condition boundaries, and understand this local package does not authorize provider calls, model training, public delivery, or runtime-avatar deployment.</span>
        </label>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <h2>2. Fill the four required modality slots</h2>
          <p className={styles.subtitle}>Each slot maps to one intake item with uploader authority, consent linkage, identity confidence, sensitivity, review state, privacy scope, and blocked operations.</p>
          <div className={styles.slotGrid}>
            {artifacts.map((artifact) => (
              <ArtifactEditor key={artifact.slotId} artifact={artifact} lane={lane} onChange={(next) => updateArtifact(artifact.slotId, next)} />
            ))}
          </div>

          <label className={styles.field} htmlFor="operatorNotes">
            <span className={styles.kicker}>Operator notes</span>
            <textarea id="operatorNotes" className={styles.input} rows={4} value={operatorNotes} onChange={(event) => setOperatorNotes(event.target.value)} />
          </label>
        </div>

        <aside className={styles.card}>
          <h2>3. Preview and export the scaffold package</h2>
          <div className={styles.notice}>
            <strong>Local storage boundary</strong>
            Save stores draft JSON under <code>{storageKey}</code>. Export downloads JSON to the browser. No raw files are committed, uploaded, or sent to a provider.
          </div>

          <div className={styles.chipRow}>
            <span className={`${styles.chip} ${modalitiesPresent ? styles.ready : styles.paused}`}>4 modalities represented</span>
            <span className={`${styles.chip} ${authorityReady ? styles.ready : styles.paused}`}>{authorityReady ? "Authority asserted" : "Authority checkbox required"}</span>
            <span className={`${styles.chip} ${styles.paused}`}>Provider calls blocked</span>
            <span className={`${styles.chip} ${preflight.blockers.length ? styles.paused : styles.ready}`}>{preflight.manifest_gate_status}</span>
          </div>

          <div className={styles.controls}>
            <button className={styles.button} type="button" onClick={saveLocal} disabled={!canExport}>Save local package</button>
            <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => downloadJson("sanctra-self-dataset-manifest.json", manifest)} disabled={!canExport}>Export manifest</button>
            <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => downloadJson("sanctra-self-dataset-preflight.json", preflight)} disabled={!canExport}>Export preflight</button>
          </div>
          {saved && <p className={styles.notice} role="status"><strong>Saved locally</strong> Draft, manifest, and preflight preview were saved in this browser only.</p>}

          <h3>What Patrick should prepare</h3>
          <ol className={styles.prepareList}>
            {copy.prepare.map((item) => <li key={item}>{item}</li>)}
          </ol>

          <h3>Manifest preview</h3>
          <pre className={styles.preview}>{JSON.stringify(manifest, null, 2)}</pre>

          <h3>Preflight preview</h3>
          <pre className={styles.preview}>{JSON.stringify(preflight, null, 2)}</pre>
        </aside>
      </section>
    </main>
  );
}
