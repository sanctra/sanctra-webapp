"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./CuratePage.module.css";

type Lane = "self" | "family";
type StepKey = "consent" | "text" | "audio" | "image" | "video" | "review";
type PromptStatus = "draft" | "captured" | "submitted" | "approved_with_limits" | "quarantined" | "revoked";
type PromptCard = {
  id: string;
  step: Exclude<StepKey, "consent" | "review">;
  title: string;
  prompt: string;
  guidance: string;
  status: PromptStatus;
  privacy: "private" | "family" | "excluded";
  quality: string;
};
type CaptureResult = {
  id: string;
  promptId: string;
  step: PromptCard["step"];
  reviewStatus: string;
  reviewableLocation: string;
  storageRef: { provider: string; uri: string; objectKey: string; localMirrorPath: string };
  attachmentStorageRef?: { provider: string; uri: string; objectKey: string; localMirrorPath: string } | null;
};

type ConsentControl = { label: string; scope: string; state: "allowed" | "limited" | "blocked" };

const steps: Array<{ key: StepKey; label: string; helper: string }> = [
  { key: "consent", label: "Consent", helper: "Artifact, modality, use-case, revocation" },
  { key: "text", label: "Text", helper: "Values, stories, boundaries, everyday voice" },
  { key: "audio", label: "Audio", helper: "Natural cadence and expressive range" },
  { key: "image", label: "Image", helper: "Reference likeness without destructive edits" },
  { key: "video", label: "Video", helper: "Gestures, eye line, consent reminder" },
  { key: "review", label: "Review", helper: "Coverage, reuse scope, blocked gaps" },
];

const laneCopy: Record<Lane, { title: string; description: string; authority: string; warning: string }> = {
  self: {
    title: "I am creating my own avatar",
    description: "A living subject contributes their own memories, media, consent, and limits before anything enters model preparation.",
    authority: "Subject-authored consent controls every reusable artifact and can be revoked later.",
    warning: "Capture now persists review manifests and media mirrors to configured controlled storage; provider/model generation remains disabled.",
  },
  family: {
    title: "I am submitting family materials",
    description: "A family member or authorized helper inventories archival material while authority, privacy, and family-review limits stay explicit.",
    authority: "Every item needs submitter authority, subject identity confidence, third-party privacy review, and conflict handling.",
    warning: "Archive material now lands as review-bound storage records; sanitation/processor jobs remain separate follow-up gates.",
  },
};

const baseConsent: ConsentControl[] = [
  { label: "Text memories", scope: "private family memorial + evaluation", state: "allowed" },
  { label: "Voice likeness", scope: "private prototype only; no public examples", state: "limited" },
  { label: "Video likeness", scope: "review blocked until explicit approval", state: "blocked" },
  { label: "Training reuse", scope: "disabled until final package review", state: "blocked" },
  { label: "Revocation", scope: "original, derivative, model-prep record, and generated artifacts", state: "allowed" },
];

const selfPrompts: PromptCard[] = [
  { id: "text-values", step: "text", title: "Values and principles", prompt: "What principles did you try to live by, even when it was hard?", guidance: "Write naturally; include phrases or sayings people associate with you.", status: "captured", privacy: "family", quality: "Good style signal; needs review before training reuse." },
  { id: "text-boundaries", step: "text", title: "Non-impersonation boundaries", prompt: "What should this avatar never say, imply, or pretend to know?", guidance: "Include no-current-awareness limits, topics to refuse, and people/situations to avoid.", status: "submitted", privacy: "private", quality: "Required guardrail prompt captured." },
  { id: "audio-reassurance", step: "audio", title: "Comfort in your own voice", prompt: "Speak to someone you love who is grieving, scared, or unsure.", guidance: "Quiet room, no music, 30–90 seconds, natural pauses. Upload the controlled review candidate here.", status: "approved_with_limits", privacy: "family", quality: "Enough for cadence demo; not enough for voice clone threshold." },
  { id: "image-front", step: "image", title: "Everyday front-facing reference", prompt: "Add a clear portrait with normal hairstyle, glasses, and expression.", guidance: "Original is mirrored to review storage; derivative crop/review job stays separate.", status: "draft", privacy: "private", quality: "Image capture waits for human review before reuse." },
  { id: "video-greeting", step: "video", title: "Warm greeting clip", prompt: "Record a short greeting and repeat what uses are allowed.", guidance: "Stable camera, good light, quiet room, no copyrighted background media.", status: "quarantined", privacy: "excluded", quality: "Quarantined until explicit video consent and quality gates exist." },
];

const familyPrompts: PromptCard[] = [
  { id: "text-authority", step: "text", title: "Authority and relationship note", prompt: "Who are you to the subject, and what authority or family agreement lets you submit this?", guidance: "Name limitations, dissent, and who can approve or revoke.", status: "captured", privacy: "private", quality: "Authority basis captured; requires reviewer confirmation." },
  { id: "text-relationship", step: "text", title: "Relationship-specific context", prompt: "For each intended person, what would they need to hear and what should never be said to them?", guidance: "Separate private, shared-family, and excluded context.", status: "submitted", privacy: "family", quality: "Good relationship fixture; needs conflict review." },
  { id: "audio-archive", step: "audio", title: "Archive voice inventory", prompt: "Upload or describe clean voice clips, source dates, other speakers, and background noise.", guidance: "Controlled-storage mirror only; no voice provider calls.", status: "draft", privacy: "private", quality: "Waiting for reviewer packet; no provider calls." },
  { id: "image-archive", step: "image", title: "Photo provenance inventory", prompt: "Which images represent the subject clearly and who else appears in them?", guidance: "Flag minors, third parties, private events, and disputed images.", status: "captured", privacy: "family", quality: "Provenance metadata starts here; derivative crop later." },
  { id: "video-archive", step: "video", title: "Video identity confidence", prompt: "Upload or inventory short clips with face, voice, date/context, and speaker confidence.", guidance: "Preserve originals; segments/transcripts are derivative jobs.", status: "draft", privacy: "private", quality: "Insufficient for video readiness without reviewer packet." },
];

function statusLabel(status: PromptStatus) { return status.replaceAll("_", " "); }
function statusClass(status: PromptStatus) {
  if (status === "captured" || status === "submitted") return styles.ready;
  if (status === "approved_with_limits") return styles.limited;
  if (status === "quarantined" || status === "revoked") return styles.blocked;
  return styles.draft;
}

function Toggle({ control }: { control: ConsentControl }) {
  return (
    <div className={styles.consentRow}>
      <span className={`${styles.dot} ${styles[control.state]}`} aria-hidden="true" />
      <div><strong>{control.label}</strong><p>{control.scope}</p></div>
    </div>
  );
}

function PromptCardView({ card, lane, saved, onSaved }: { card: PromptCard; lane: Lane; saved?: CaptureResult; onSaved: (result: CaptureResult) => void }) {
  const [responseText, setResponseText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = Boolean(responseText.trim() || file);

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const common = { lane, promptId: card.id, step: card.step, title: card.title, prompt: card.prompt, privacy: card.privacy, status: card.status, responseText };
      const init: RequestInit = { method: "POST" };
      if (file) {
        const form = new FormData();
        Object.entries(common).forEach(([key, value]) => form.append(key, String(value ?? "")));
        form.append("file", file);
        init.body = form;
      } else {
        init.headers = { "content-type": "application/json" };
        init.body = JSON.stringify(common);
      }
      const res = await fetch("/api/curation", init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || "Capture failed");
      onSaved(data as CaptureResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={styles.promptCard}>
      <div className={styles.promptTopline}>
        <span className={styles.modality}>{card.step}</span>
        <span className={`${styles.pill} ${statusClass(saved ? "submitted" : card.status)}`}>{saved ? "stored for review" : statusLabel(card.status)}</span>
      </div>
      <h3>{card.title}</h3>
      <p className={styles.prompt}>{card.prompt}</p>
      <p className={styles.guidance}>{card.guidance}</p>
      <div className={styles.mockBox}>
        <span>Storage-bound capture seam</span>
        <strong>{card.privacy === "excluded" ? "Excluded pending review" : `${card.privacy} scope`}</strong>
      </div>
      <label className={styles.captureBox}>
        <span>{card.step === "text" ? "Typed answer" : "Reviewer notes / transcript"}</span>
        <textarea rows={4} value={responseText} onChange={(event) => setResponseText(event.target.value)} placeholder="Capture the response, provenance notes, boundaries, or reviewer context for this prompt." />
      </label>
      {card.step !== "text" && (
        <label className={styles.fileBox}>
          <span>Controlled-storage file candidate</span>
          <input type="file" accept={card.step === "audio" ? "audio/*" : card.step === "image" ? "image/*" : "video/*"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
      )}
      <button type="button" className={styles.captureButton} disabled={!canSubmit || saving} onClick={submit}>{saving ? "Saving…" : "Save capture to review storage"}</button>
      {saved && <p className={styles.saved} role="status"><strong>Stored for human review</strong><br />Manifest: <code>{saved.reviewableLocation}</code>{saved.attachmentStorageRef ? <><br />Media: <code>{saved.attachmentStorageRef.uri}</code></> : null}</p>}
      {error && <p className={styles.error} role="alert"><strong>Capture failed</strong><br />{error}</p>}
      <p className={styles.quality}>{card.quality}</p>
    </article>
  );
}

export default function CuratePage() {
  const [lane, setLane] = useState<Lane>("self");
  const [activeStep, setActiveStep] = useState<StepKey>("consent");
  const [savedCaptures, setSavedCaptures] = useState<Record<string, CaptureResult>>({});
  const prompts = lane === "self" ? selfPrompts : familyPrompts;
  const visiblePrompts = useMemo(() => prompts.filter((card) => card.step === activeStep), [activeStep, prompts]);
  const savedForLane = prompts.filter((prompt) => savedCaptures[prompt.id]).length;
  const counts = useMemo(() => ({
    captured: prompts.filter((p) => ["captured", "submitted", "approved_with_limits"].includes(p.status)).length,
    blocked: prompts.filter((p) => ["quarantined", "revoked"].includes(p.status)).length,
    draft: prompts.filter((p) => p.status === "draft").length,
  }), [prompts]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Guided curation storage flow</p>
          <h1>Build a memorial package with real review storage seams</h1>
          <p className={styles.subtitle}>Sanctra now captures consent, prompt answers, and audio/image/video candidates into backend review records. Storage is controlled and local/GCS-configurable; provider/model generation remains outside this flow.</p>
        </div>
        <nav className={styles.nav}><Link href="/">Session</Link><Link href="/dataset">Dataset packet</Link><Link href="/upload">Bulk upload</Link></nav>
      </header>

      <section className={styles.laneGrid} aria-label="Choose curation lane">
        {(["self", "family"] as Lane[]).map((option) => (
          <button key={option} type="button" className={`${styles.laneCard} ${lane === option ? styles.selected : ""}`} onClick={() => { setLane(option); setActiveStep("consent"); }} aria-pressed={lane === option}>
            <span>{option === "self" ? "Lane A" : "Lane B"}</span><strong>{laneCopy[option].title}</strong><p>{laneCopy[option].description}</p>
          </button>
        ))}
      </section>

      <section className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Curation progress">
          <p className={styles.kicker}>Progress</p>
          {steps.map((step) => (
            <button key={step.key} type="button" className={`${styles.stepButton} ${activeStep === step.key ? styles.active : ""}`} onClick={() => setActiveStep(step.key)}>
              <span>{step.label}</span><small>{step.helper}</small>
            </button>
          ))}
          <div className={styles.summaryBox}>
            <strong>Review package status</strong>
            <p>{counts.captured} fixture-ready · {counts.draft} draft · {counts.blocked} blocked · {savedForLane} saved this session</p>
            <p className={styles.guardrail}>{laneCopy[lane].warning}</p>
          </div>
        </aside>

        <section className={styles.panel}>
          {activeStep === "consent" && <><p className={styles.kicker}>Consent matrix</p><h2>{laneCopy[lane].title}</h2><p className={styles.subtitle}>{laneCopy[lane].authority}</p><div className={styles.consentGrid}>{baseConsent.map((control) => <Toggle key={control.label} control={control} />)}</div><div className={styles.schemaNote}><strong>Governance seam</strong> Consent is artifact-level, modality-level, use-case-level, and revocable. Each saved prompt creates a review-bound manifest and optional media object before any derivative/model-prep job can consume it.</div></>}

          {visiblePrompts.length > 0 && <><p className={styles.kicker}>{activeStep} prompt cards</p><h2>Guided prompts persist as reviewable capture records</h2><div className={styles.promptGrid}>{visiblePrompts.map((card) => <PromptCardView key={card.id} card={card} lane={lane} saved={savedCaptures[card.id]} onSaved={(result) => setSavedCaptures((current) => ({ ...current, [card.id]: result }))} />)}</div></>}

          {activeStep === "review" && <><p className={styles.kicker}>Review and package summary</p><h2>Human review remains the release gate</h2><div className={styles.reviewGrid}>
            <div><strong>Stored this session</strong><p>{savedForLane} prompt capture(s) now have manifest URIs and review status. Reviewers can inspect typed answers, provenance notes, and media storage references.</p></div>
            <div><strong>Approved with limits</strong><p>Audio/video/image references can remain evaluation-only or private-family only until explicit likeness consent and quality thresholds are met.</p></div>
            <div><strong>Blocked gaps</strong><p>Reviewer identity, family authority/conflict decisions, derivative job receipts, and provider-specific thresholds still gate package release.</p></div>
            <div><strong>Storage boundary</strong><p>Local mirrors are used by default; setting the configured GCS bucket returns `gs://` review URIs without enabling provider generation.</p></div>
          </div><div className={styles.schemaNote}><strong>Non-impersonation lock</strong> Prompt fixtures must train the product to say it is a memorial echo, never claim current awareness, never invent memories, and never speak as literal presence.</div></>}
        </section>
      </section>
    </main>
  );
}
