"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import audioProtocol from "../../../../async-memorial-package-scaffold/examples/guided-curation-audio-prompt-protocol.example.json";
import governanceSummary from "../../../../async-memorial-package-scaffold/examples/curation-governance-prototype-summary.example.json";
import imageProtocol from "../../../../async-memorial-package-scaffold/examples/guided-curation-image-prompt-protocol.example.json";
import prototypeFlow from "../../../../async-memorial-package-scaffold/examples/guided-curation-prototype-flow.example.json";
import textProtocol from "../../../../async-memorial-package-scaffold/examples/guided-curation-text-prompt-protocol.example.json";
import videoProtocol from "../../../../async-memorial-package-scaffold/examples/guided-curation-video-prompt-protocol.example.json";
import styles from "./CuratePage.module.css";

type StepKey = "consent" | "text" | "audio" | "image" | "video" | "review";
type LaneKey = "living_subject_guided" | "family_archive_guided";
type Modality = Exclude<StepKey, "consent" | "review">;
type UiResponseState = "answered" | "skipped" | "private_only" | "excluded_from_training" | "needs_review";

type ProtocolCard = {
  prompt_id: string;
  prompt_text: string;
  target_modality?: Modality;
  expected_response_state?: string;
  elicitation_goal?: string;
  guidance?: string;
  safety_notes?: string;
};

type PromptCard = ProtocolCard & {
  modality: Modality | "review";
  responseState: UiResponseState;
  rawState: string;
  requiresReview: boolean;
};

const protocols = [textProtocol, audioProtocol, imageProtocol, videoProtocol] as const;
const lanes = prototypeFlow.lanes as Array<{ lane: LaneKey; label: string; progress_steps: StepKey[] }>;
const livingSubjectLane = lanes.find((lane) => lane.lane === "living_subject_guided") ?? lanes[0];
const governance = governanceSummary as typeof governanceSummary;

const stepCopy: Record<StepKey, { label: string; helper: string }> = {
  consent: { label: "Consent", helper: "Authority, audience, revocation, stop conditions" },
  text: { label: "Text", helper: "Values, stories, boundaries, ordinary voice" },
  audio: { label: "Audio", helper: "Mocked recordings; high-presence review" },
  image: { label: "Image", helper: "Placeholder references; no raw media" },
  video: { label: "Video", helper: "Consent reminders; quarantine-first" },
  review: { label: "Review", helper: "Readiness gaps, stop conditions, next handoff" },
};

const laneDescriptions: Record<LaneKey, { description: string; authority: string; warning: string }> = {
  living_subject_guided: {
    description: "Patrick-as-living-subject pilot capture starts from subject-self authority, private-review audience, explicit consent, and prompt-card coverage before any ingest.",
    authority: "Subject-self authority, package-level consent, audience profile, revocation acknowledgement, and stop-condition acknowledgement are required before accepted pilot ingest.",
    warning: "Synthetic/local fixture only: no provider calls, no model training, no public delivery, no raw private media in repo.",
  },
  family_archive_guided: {
    description: "Family/archive submission stays visible as a later lane, but this slice prioritizes the living-subject pilot and its stricter privacy gate.",
    authority: "Family materials require submitter authority, subject identity confidence, third-party privacy review, and conflict handling before reuse.",
    warning: "Archive upload and sanitation remain follow-up slices; this route keeps mocked/local state only.",
  },
};

const requiredRecords = ["subject-self authority record", "package-level consent grant", "private-review audience profile", "revocation acknowledgement", "stop-condition acknowledgement"];
const stopConditions = ["no provider calls", "no model training", "no public delivery", "no raw private media in repo"];

function responseState(rawState: string, modality: PromptCard["modality"]): UiResponseState {
  if (rawState === "draft") return "skipped";
  if (["quarantined", "identity_review_needed", "derivative_pending"].includes(rawState)) return "needs_review";
  if (["approved_with_limits", "inventory_only"].includes(rawState)) return "private_only";
  if (["revoked", "rejected"].includes(rawState)) return "excluded_from_training";
  if (["audio", "image", "video"].includes(modality)) return "needs_review";
  return "answered";
}

function stateLabel(state: string) {
  return state.replaceAll("_", " ");
}

function stateClass(state: UiResponseState) {
  if (state === "answered") return styles.ready;
  if (state === "private_only") return styles.limited;
  if (state === "needs_review" || state === "excluded_from_training") return styles.blocked;
  return styles.draft;
}

function titleFromId(id: string) {
  return id.replace(/^prompt:/, "").replace(/_\d+$/, "").replaceAll("_", " ");
}

function protocolCards(): PromptCard[] {
  const modalityCards = protocols.flatMap((protocol) => protocol.prompt_protocol.cards.map((card) => {
    const typedCard = card as ProtocolCard;
    const modality = typedCard.target_modality as Modality;
    const rawState = typedCard.expected_response_state ?? "draft";
    return {
      ...typedCard,
      modality,
      rawState,
      responseState: responseState(rawState, modality),
      requiresReview: ["audio", "image", "video"].includes(modality),
    } satisfies PromptCard;
  }));

  const reviewCards = prototypeFlow.prompt_cards.map((card) => ({
    ...card,
    modality: "review" as const,
    rawState: "needs_review",
    responseState: "needs_review" as const,
    guidance: card.elicitation_goal,
    safety_notes: card.safety_notes,
    requiresReview: true,
  } satisfies PromptCard));

  return [...modalityCards, ...reviewCards];
}

function ConsentRow({ label, scope, state }: { label: string; scope: string; state: "allowed" | "limited" | "blocked" }) {
  return (
    <div className={`${styles.consentRow} ${state === "limited" ? styles.limited : state === "blocked" ? styles.blocked : ""}`}>
      <span className={`${styles.dot} ${styles[state]}`} aria-hidden="true" />
      <div><strong>{label}</strong><p>{scope}</p></div>
    </div>
  );
}

function PromptCardView({ card }: { card: PromptCard }) {
  return (
    <article className={styles.promptCard}>
      <div className={styles.promptTopline}>
        <span className={styles.modality}>{card.modality}</span>
        <span className={`${styles.pill} ${stateClass(card.responseState)}`}>{stateLabel(card.responseState)}</span>
      </div>
      <h3>{titleFromId(card.prompt_id)}</h3>
      <p className={styles.prompt}>{card.prompt_text}</p>
      <p className={styles.guidance}>{card.guidance ?? card.elicitation_goal}</p>
      <div className={styles.mockBox}><span>Fixture response state</span><strong>{stateLabel(card.rawState)}</strong></div>
      {card.requiresReview && <p className={styles.quality}>Requires review before training/provider/model eligibility.</p>}
      {card.safety_notes && <p className={styles.quality}>{card.safety_notes}</p>}
    </article>
  );
}

export default function CuratePage() {
  const [laneKey, setLaneKey] = useState<LaneKey>(livingSubjectLane.lane);
  const [activeStep, setActiveStep] = useState<StepKey>("consent");
  const lane = lanes.find((candidate) => candidate.lane === laneKey) ?? livingSubjectLane;
  const cards = useMemo(protocolCards, []);
  const visiblePrompts = cards.filter((card) => card.modality === activeStep);
  const counts = useMemo(() => ({
    answered: cards.filter((card) => card.responseState === "answered").length,
    privateOnly: cards.filter((card) => card.responseState === "private_only").length,
    needsReview: cards.filter((card) => card.responseState === "needs_review").length,
    excluded: cards.filter((card) => card.responseState === "excluded_from_training").length,
  }), [cards]);
  const consentRows = governance.consent_matrix.map((row) => ({
    label: `${row.modality} · ${row.use_case.replaceAll("_", " ")}`,
    scope: `${row.allowed === "yes" ? "Allowed" : row.allowed === "limited" ? "Limited" : "Blocked"}: ${row.revocation_behavior}`,
    state: row.allowed === "yes" ? "allowed" as const : row.allowed === "limited" ? "limited" as const : "blocked" as const,
  }));

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Guided curation prototype</p>
          <h1>Patrick-as-living-subject capture starts with prompt cards</h1>
          <p className={styles.subtitle}>The /curate stub now renders its stages and cards from Sanctra fixture JSON. It remains mocked/local only until the privacy gate, manifest, and reviewer decisions approve real submission.</p>
        </div>
        <nav className={styles.nav}><Link href="/">Session</Link><Link href="/dataset">Dataset packet</Link><Link href="/upload">Bulk upload</Link></nav>
      </header>

      <section className={styles.laneGrid} aria-label="Choose curation lane">
        {lanes.map((option) => (
          <button key={option.lane} type="button" className={`${styles.laneCard} ${laneKey === option.lane ? styles.selected : ""}`} onClick={() => { setLaneKey(option.lane); setActiveStep("consent"); }} aria-pressed={laneKey === option.lane}>
            <span>{option.lane === "living_subject_guided" ? "Lane A · pilot first" : "Lane B · later"}</span>
            <strong>{option.label}</strong>
            <p>{laneDescriptions[option.lane].description}</p>
          </button>
        ))}
      </section>

      <section className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Curation progress">
          <p className={styles.kicker}>Fixture progress</p>
          {lane.progress_steps.map((key) => (
            <button key={key} type="button" className={`${styles.stepButton} ${activeStep === key ? styles.active : ""}`} onClick={() => setActiveStep(key)}>
              <span>{stepCopy[key].label}</span><small>{stepCopy[key].helper}</small>
            </button>
          ))}
          <div className={styles.summaryBox}>
            <strong>Mock package status</strong>
            <p>{counts.answered} answered · {counts.privateOnly} private-only · {counts.needsReview} needs review · {counts.excluded} excluded</p>
            <p className={styles.guardrail}>{laneDescriptions[laneKey].warning}</p>
          </div>
        </aside>

        <section className={styles.panel}>
          {activeStep === "consent" && (<>
            <p className={styles.kicker}>Consent and boundary gate</p>
            <h2>{lane.label}</h2>
            <p className={styles.subtitle}>{laneDescriptions[laneKey].authority}</p>
            <div className={styles.consentGrid}>{consentRows.map((control) => <ConsentRow key={control.label} {...control} />)}</div>
            <div className={styles.schemaNote}><strong>Required before pilot capture</strong><ul>{requiredRecords.map((record) => <li key={record}>{record}</li>)}</ul></div>
            <div className={styles.schemaNote}><strong>Stop conditions shown before upload/training</strong><ul>{stopConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></div>
          </>)}

          {visiblePrompts.length > 0 && (<>
            <p className={styles.kicker}>{activeStep} prompt cards</p>
            <h2>Guided prompts from protocol fixtures</h2>
            <div className={styles.promptGrid}>{visiblePrompts.map((card) => <PromptCardView key={card.prompt_id} card={card} />)}</div>
          </>)}

          {activeStep === "review" && (<>
            <p className={styles.kicker}>Review and readiness summary</p>
            <h2>Human review remains the release gate</h2>
            <div className={styles.reviewGrid}>
              <div><strong>Accepted placeholders</strong><p>Answered text prompt cards may be review candidates; all media remain placeholder/ref-only in this slice.</p></div>
              <div><strong>Quarantined or missing</strong><p>Audio, image, video, likeness, direct-address, low-quality, disputed, or third-party material stays needs-review/quarantined.</p></div>
              <div><strong>Required records</strong><p>{requiredRecords.join(" · ")}.</p></div>
              <div><strong>Modality gaps</strong><p>{governance.quality_gates.map((gate) => `${gate.modality}: ${gate.minimum}`).join(" ")}</p></div>
            </div>
            <div className={styles.schemaNote}><strong>Pilot packet handoff</strong> Patrick can submit the first real packet only after storage policy approval by preparing a manifest with external/redacted refs, subject-self authority, package consent, private-review audience, revocation acknowledgement, provenance, hashes/placeholders, and high-presence review queue coverage.</div>
            <div className={styles.schemaNote}><strong>Non-impersonation lock</strong> The protocol fixtures require Sanctra to disclose a memorial echo, never claim current awareness, never invent memories, and never speak as literal presence.</div>
          </>)}
        </section>
      </section>
    </main>
  );
}
