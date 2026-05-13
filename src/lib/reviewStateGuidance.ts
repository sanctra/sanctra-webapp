import type { ReviewState } from "./privateManifestReview";

export type ReviewTone = "neutral" | "caution" | "blocked" | "ready" | "limited" | "closed";

export type ReviewStateGuidance = {
  state: ReviewState;
  label: string;
  tone: ReviewTone;
  subjectMeaning: string;
  reviewerMeaning: string;
  riskPosture: string;
  allowedNextActions: string[];
  blockedOperations: string[];
  recoveryPrompt: string;
};

export const REVIEW_STATE_GUIDANCE: Record<ReviewState, ReviewStateGuidance> = {
  corpus_staged: {
    state: "corpus_staged",
    label: "Staged, not reviewed",
    tone: "neutral",
    subjectMeaning: "Sanctra has a metadata record for this material, but no human reviewer has cleared it for artifact work yet.",
    reviewerMeaning: "Confirm the manifest has enough provenance, consent, authority, and privacy metadata before moving it into review.",
    riskPosture: "Medium caution: raw media and derivative use remain blocked until the packet has a reviewer decision.",
    allowedNextActions: ["Check metadata completeness", "Ask the submitter for missing context", "Keep the item in metadata-only inventory"],
    blockedOperations: ["provider calls", "training or fine-tuning", "public delivery", "raw browser download"],
    recoveryPrompt: "Add missing source, date, subject, consent, and contact notes so a reviewer can make an explicit decision.",
  },
  needs_review: {
    state: "needs_review",
    label: "Needs reviewer decision",
    tone: "caution",
    subjectMeaning: "The material is visible to the private review process, but Sanctra still needs a reviewer to resolve risk and permission questions.",
    reviewerMeaning: "Review provenance, authority, privacy flags, likeness concerns, and requested use before approving, limiting, quarantining, or rejecting it.",
    riskPosture: "High caution: use is intentionally paused while review questions are open.",
    allowedNextActions: ["Review authority and consent notes", "Request clarification", "Document the decision rationale"],
    blockedOperations: ["provider calls", "training or fine-tuning", "public delivery", "derived dataset release"],
    recoveryPrompt: "Resolve the named review questions or collect missing consent/authority evidence before any artifact step resumes.",
  },
  quarantined: {
    state: "quarantined",
    label: "Quarantined",
    tone: "blocked",
    subjectMeaning: "Sanctra is intentionally holding this material away from artifact workflows because privacy, authority, or likeness risk is unresolved.",
    reviewerMeaning: "Do not expose raw media or start extraction. Identify the specific authority, privacy, third-party, or provenance issue that must be cleared.",
    riskPosture: "Blocked: raw media remains unavailable and all derivative operations stay locked.",
    allowedNextActions: ["Keep audit metadata only", "Request authority/privacy evidence", "Escalate to a human privacy reviewer"],
    blockedOperations: ["raw media exposure", "provider calls", "training or fine-tuning", "public delivery", "derived dataset release"],
    recoveryPrompt: "Name the blocking concern and collect the exact consent, redaction, or ownership evidence required before review can continue.",
  },
  approved: {
    state: "approved",
    label: "Approved for bounded private use",
    tone: "ready",
    subjectMeaning: "A reviewer has cleared the material for the specific private Sanctra use described in its manifest metadata.",
    reviewerMeaning: "The metadata supports bounded use, but global hard locks still apply unless a later approved workflow explicitly changes them.",
    riskPosture: "Lowest current review risk, still private and scope-bound.",
    allowedNextActions: ["Use as private package context", "Include in reviewer packet summaries", "Proceed only within documented use boundaries"],
    blockedOperations: ["public delivery without separate approval", "training or fine-tuning without separate approval", "raw browser download"],
    recoveryPrompt: "If the requested use changes, return the item to review instead of expanding approval by implication.",
  },
  approved_with_limits: {
    state: "approved_with_limits",
    label: "Approved with limits",
    tone: "limited",
    subjectMeaning: "A reviewer has allowed a narrow use, but important restrictions still apply.",
    reviewerMeaning: "Respect the listed limits exactly; this state does not grant training, public delivery, likeness synthesis, or broader reuse permission.",
    riskPosture: "Conditional: safe only inside the documented limits.",
    allowedNextActions: ["Use only the allowed private context", "Display restrictions beside the item", "Request a new review for broader use"],
    blockedOperations: ["training or fine-tuning", "public delivery", "likeness synthesis beyond the written limit", "unrestricted reuse"],
    recoveryPrompt: "To expand allowed use, capture the requested new use and send it back through privacy/authority review.",
  },
  rejected: {
    state: "rejected",
    label: "Rejected from pilot use",
    tone: "closed",
    subjectMeaning: "This material is not usable for the current pilot corpus. Sanctra retains only enough metadata to explain and audit that decision.",
    reviewerMeaning: "Do not use this item in artifact generation or dataset preparation unless a new submission and review overturns the rejection.",
    riskPosture: "Closed/blocked for use: audit metadata only.",
    allowedNextActions: ["Show the reason to authorized reviewers", "Keep audit metadata", "Invite a corrected resubmission when appropriate"],
    blockedOperations: ["provider calls", "training or fine-tuning", "public delivery", "raw media exposure", "derived dataset release"],
    recoveryPrompt: "Submit a corrected packet with clear provenance, authority, consent, and privacy resolution before reconsideration.",
  },
};

export const REVIEW_STATE_GUIDANCE_LIST = Object.values(REVIEW_STATE_GUIDANCE);

export function getReviewStateGuidance(state: ReviewState): ReviewStateGuidance {
  return REVIEW_STATE_GUIDANCE[state];
}
