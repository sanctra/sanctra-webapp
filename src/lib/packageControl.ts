export type ArtifactClass = "text" | "audio" | "image" | "video";
export type PackagePhase = "intake" | "corpus" | "review" | "artifact" | "delivery";
export type GateState = "ready" | "waiting" | "blocked" | "future";

export type PackageGate = {
  id: string;
  label: string;
  state: GateState;
  safeLabel: string;
  adminDetail: string;
  nextHumanAction: string;
};

export type ArtifactExpectation = {
  artifactClass: ArtifactClass;
  label: string;
  tierCopy: string;
  expectedFormat: string;
  statusRef: string;
  clientStatus: string;
  enabledNow: boolean;
};

export type ConsultantPackage = {
  id: string;
  title: string;
  subjectLabel: string;
  familyLabel: string;
  tierCode: string;
  workflowMode: "white_glove";
  phase: PackagePhase;
  consultant: string;
  updatedAt: string;
  gates: PackageGate[];
  artifactExpectations: ArtifactExpectation[];
};

export const packagePhases: Array<{ phase: PackagePhase; label: string; description: string }> = [
  { phase: "intake", label: "Intake", description: "Family goals, authority, consent scope, and package tier are captured." },
  { phase: "corpus", label: "Corpus", description: "Source inventory and controlled-storage references are staged for review." },
  { phase: "review", label: "Review", description: "Consultant and reviewer decisions determine what can become package material." },
  { phase: "artifact", label: "Artifacts", description: "Approved outputs are tracked by manifest refs, hashes, and delivery state." },
  { phase: "delivery", label: "Delivery", description: "Family-facing package materials are released only after review approval." },
];

export const consultantPackage: ConsultantPackage = {
  id: "package:rivera-white-glove-demo",
  title: "Rivera family memorial package",
  subjectLabel: "Subject profile ready for review",
  familyLabel: "Family status view: safe labels only",
  tierCode: "white_glove_text_audio_preview",
  workflowMode: "white_glove",
  phase: "review",
  consultant: "Consultant queue",
  updatedAt: "2026-05-22T20:47:00Z",
  gates: [
    {
      id: "intake",
      label: "Intake status",
      state: "ready",
      safeLabel: "Package details received",
      adminDetail: "Requester, subject, audience, authority basis, and delivery goals are captured.",
      nextHumanAction: "Confirm family display names and intended recipients.",
    },
    {
      id: "corpus",
      label: "Corpus status",
      state: "waiting",
      safeLabel: "Materials are being organized",
      adminDetail: "Text is staged. Audio and image refs are metadata-only pending high-presence review.",
      nextHumanAction: "Collect missing provenance notes for audio and image references.",
    },
    {
      id: "review",
      label: "Review status",
      state: "blocked",
      safeLabel: "Human review is in progress",
      adminDetail: "Voice/image likeness cannot move to artifact request until authority and reviewer approval are recorded.",
      nextHumanAction: "Record reviewer decision and separate admin confirmation for high-presence slots.",
    },
    {
      id: "artifact",
      label: "Artifact status",
      state: "waiting",
      safeLabel: "Draft outputs are not ready yet",
      adminDetail: "Only manifest refs and provider receipts may be shown here; no raw corpus or processing internals.",
      nextHumanAction: "Request text draft after review approves reusable text memories.",
    },
    {
      id: "delivery",
      label: "Delivery status",
      state: "waiting",
      safeLabel: "Delivery is waiting on review",
      adminDetail: "Family delivery remains blocked until artifact manifest review and disclosure labels pass.",
      nextHumanAction: "Prepare delivery checklist after approved artifact refs exist.",
    },
  ],
  artifactExpectations: [
    {
      artifactClass: "text",
      label: "Text memorial packet",
      tierCopy: "Included in starter and white-glove tiers.",
      expectedFormat: "UTF-8 markdown/plain text plus JSON metadata and provenance.",
      statusRef: "artifact:text:intake-summary:awaiting-review",
      clientStatus: "Text memories are being reviewed.",
      enabledNow: true,
    },
    {
      artifactClass: "audio",
      label: "Voice/audio remembrance",
      tierCopy: "Available only after explicit voice authority and artifact review.",
      expectedFormat: "WAV master, MP3 derivative, loudness/true-peak report, manifest hashes.",
      statusRef: "artifact:audio:voice-remembrance:blocked-by-review",
      clientStatus: "Audio is not ready for preview.",
      enabledNow: false,
    },
    {
      artifactClass: "image",
      label: "Image/avatar reference",
      tierCopy: "Placeholder for reviewed still/avatar artifacts; generation is not live.",
      expectedFormat: "External storage refs, hashes, lineage, disclosure label, evaluation report.",
      statusRef: "artifact:image:avatar-reference:placeholder",
      clientStatus: "Image/avatar options are planned for a later step.",
      enabledNow: false,
    },
    {
      artifactClass: "video",
      label: "Future video tier",
      tierCopy: "Future entitlement placeholder only.",
      expectedFormat: "Future MP4/H.264 1080p at 24 or 30 fps with AAC 48 kHz audio; bitrate TBD by tier.",
      statusRef: "artifact:video:future-tier:not-implemented",
      clientStatus: "Video is not part of the current package.",
      enabledNow: false,
    },
  ],
};

export const privateSurfaceRules = [
  "Client view shows safe progress labels, not raw corpus file names, storage URIs, provider logs, or processing internals.",
  "Consultant view may show manifest refs, blocker flags, reviewer state, and next human action.",
  "Artifact requests are policy-gated by tier, authority, corpus readiness, review state, and revocation posture.",
  "White-glove workflow uses the same package and manifest records; it does not bypass consent or review gates.",
];
