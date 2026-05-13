"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./DatasetSubmissionPage.module.css";

type Lane = "self" | "family";
type FieldKey = "subjectName" | "submitterName" | "relationship" | "contact" | "authority" | "sourceMaterials" | "contextNotes" | "preferences";
type Draft = Record<FieldKey, string> & { consent: boolean; storage: boolean };
type PacketStep = { title: string; detail: string };
type Submission = {
  id: string;
  lane: Lane;
  createdAt: string;
  fields: Draft;
  persistence: string;
  reviewerHandoff: {
    status: "draft_saved";
    nextAction: string;
    requiredBeforeReview: string[];
  };
};
type ModalityStatus = "ready" | "needs-detail" | "high-risk";

const emptyDraft: Draft = {
  subjectName: "",
  submitterName: "",
  relationship: "",
  contact: "",
  authority: "",
  sourceMaterials: "",
  contextNotes: "",
  preferences: "",
  consent: false,
  storage: false,
};

const laneCopy: Record<Lane, { label: string; subtitle: string; prepare: string[]; authority: string }> = {
  self: {
    label: "I am submitting my own dataset",
    subtitle: "Use this lane when Patrick, or any living subject, is directly contributing their own consented materials.",
    prepare: [
      "A short identity note: legal/preferred name, pronouns, and how Sanctra should refer to you.",
      "Consented source material: voice clips, video clips, writing samples, photos, documents, and memory notes you are comfortable using for testing.",
      "Boundaries: topics, people, phrases, dates, or media modes that must stay unavailable.",
      "A contact preference for follow-up review before any high-presence voice/video artifact is used.",
    ],
    authority: "I am the subject and I consent to submit my own materials for bounded Sanctra testing.",
  },
  family: {
    label: "I am family or an authorized submitter",
    subtitle: "Use this lane when a family member, guardian, executor, or authorized helper is contributing materials about or for the subject.",
    prepare: [
      "Your relationship/authority note: who you are, how you are connected, and why you are allowed to contribute this packet.",
      "Subject identity details: names, dates if appropriate, relationship context, and preferred memorial posture.",
      "Source material inventory: media/docs you can provide now, plus any items that require separate family review.",
      "Family boundaries and contact preferences for review, corrections, takedown, or escalation.",
    ],
    authority: "I confirm I am family or otherwise authorized to submit these materials for review-bound Sanctra testing.",
  },
};

const storageKey = "sanctra-demo-dataset-submissions";

const packetSteps: PacketStep[] = [
  {
    title: "Complete the packet in this local UI",
    detail: "Capture identity, authority, source inventory, context, boundaries, and contact preferences for either self-submission or family/authorized submission.",
  },
  {
    title: "Gather the controlled-storage references",
    detail: "Keep media outside this demo page. The later real-data step needs reviewed storage locations or upload targets rather than direct provider calls from the browser.",
  },
  {
    title: "Hand off for bounded preflight review",
    detail: "Once the packet is complete, the next step is a no-provider preflight/import pass so Sanctra can validate the packet before any live memorial artifact work resumes.",
  },
];

const modalityChecks: Array<{ key: "text" | "audio" | "image" | "video"; label: string; cue: string; privacy: string; terms: string[]; highRisk?: boolean }> = [
  {
    key: "text",
    label: "Text / documents",
    cue: "Stories, letters, prompts, transcripts, journals, PDFs, or notes are inventoried with source/date context.",
    privacy: "Redact third-party names, medical details, addresses, and private family conflict before reviewer handoff.",
    terms: ["text", "writing", "writings", "story", "stories", "letter", "letters", "journal", "pdf", "doc", "document", "transcript", "note"],
  },
  {
    key: "audio",
    label: "Audio / voice",
    cue: "Voice clips identify speaker, recorder/source, date, background speakers/music, and transcript status.",
    privacy: "Voice likeness remains evaluation-only until explicit likeness consent and single-speaker confidence are reviewed.",
    terms: ["audio", "voice", "wav", "mp3", "m4a", "recording", "interview", "speaker", "transcript"],
    highRisk: true,
  },
  {
    key: "image",
    label: "Images / photos",
    cue: "Photos include source/owner, approximate date, visible third parties/minors, and whether derivatives are allowed.",
    privacy: "Keep original images out of this browser draft; derivative crops or avatar references require later review.",
    terms: ["image", "photo", "portrait", "jpg", "jpeg", "png", "webp", "heic", "face", "picture"],
  },
  {
    key: "video",
    label: "Video / presence",
    cue: "Video clips list scene context, speaker confidence, third parties, music, and explicit likeness approval status.",
    privacy: "Video is the highest-risk modality; default to quarantined unless consent, privacy, and quality gates are explicit.",
    terms: ["video", "clip", "mp4", "mov", "webm", "gesture", "greeting", "camera"],
    highRisk: true,
  },
];

const reviewRequirements = [
  "Controlled-storage references or approved upload targets for each real source item.",
  "Reviewer-visible authority/consent basis and revocation contact.",
  "Modality-by-modality privacy notes, especially voice/video likeness and third-party exposure.",
  "A human reviewer decision before package import, training, generated artifacts, or public examples.",
];

function requiredComplete(draft: Draft) {
  return Boolean(
    draft.subjectName.trim() &&
      draft.submitterName.trim() &&
      draft.relationship.trim() &&
      draft.contact.trim() &&
      draft.authority.trim() &&
      draft.sourceMaterials.trim() &&
      draft.contextNotes.trim() &&
      draft.preferences.trim() &&
      draft.consent &&
      draft.storage,
  );
}

function modalityStatus(draft: Draft, check: (typeof modalityChecks)[number]): ModalityStatus {
  const inventory = draft.sourceMaterials.toLowerCase();
  const context = `${draft.contextNotes} ${draft.preferences}`.toLowerCase();
  const mentioned = check.terms.some((term) => inventory.includes(term));
  if (!mentioned) return "needs-detail";
  if (check.highRisk && !/(consent|likeness|single-speaker|single speaker|third-part|privacy|review|quarantine|exclude)/.test(context)) return "high-risk";
  return "ready";
}

function packetCompleteness(draft: Draft) {
  const required: Array<keyof Draft> = ["subjectName", "submitterName", "relationship", "contact", "authority", "sourceMaterials", "contextNotes", "preferences", "consent", "storage"];
  const complete = required.filter((key) => typeof draft[key] === "boolean" ? draft[key] : String(draft[key]).trim()).length;
  return Math.round((complete / required.length) * 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function TextField({ id, label, value, placeholder, rows, onChange }: { id: FieldKey; label: string; value: string; placeholder: string; rows?: number; onChange: (key: FieldKey, value: string) => void }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.kicker}>{label}</span>
      {rows ? (
        <textarea id={id} className={styles.input} rows={rows} value={value} onChange={(event) => onChange(id, event.target.value)} placeholder={placeholder} />
      ) : (
        <input id={id} className={styles.input} value={value} onChange={(event) => onChange(id, event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

export default function DatasetSubmissionPage() {
  const [lane, setLane] = useState<Lane>("self");
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft, authority: laneCopy.self.authority });
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const copy = laneCopy[lane];
  const complete = useMemo(() => requiredComplete(draft), [draft]);
  const currentModality = useMemo(() => modalityChecks.map((check) => ({ ...check, status: modalityStatus(draft, check) })), [draft]);
  const currentScore = useMemo(() => packetCompleteness(draft), [draft]);

  useEffect(() => {
    const existing = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as Submission[];
    setSubmissions(existing);
  }, []);

  const update = (key: keyof Draft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSubmitted(null);
  };

  const switchLane = (next: Lane) => {
    setLane(next);
    setDraft({ ...emptyDraft, authority: laneCopy[next].authority });
    setSubmitted(null);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete) return;

    const submission = {
      id: `demo-${Date.now()}`,
      lane,
      createdAt: new Date().toISOString(),
      fields: draft,
      persistence: "localStorage demo boundary only; no production provider call and no external storage upload performed",
      reviewerHandoff: {
        status: "draft_saved" as const,
        nextAction: "Collect controlled-storage references, then route the packet to human preflight review before any import, training, or artifact generation.",
        requiredBeforeReview: reviewRequirements,
      },
    };

    const nextSubmissions = [submission, ...submissions].slice(0, 10);
    window.localStorage.setItem(storageKey, JSON.stringify(nextSubmissions, null, 2));
    setSubmissions(nextSubmissions);
    setSubmitted(submission.id);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Consented dataset intake</p>
          <h1 className={styles.title}>Prepare a Sanctra test packet</h1>
          <p className={styles.subtitle}>
            Choose whether the subject is submitting directly or a family/authorized person is submitting. This page is a safe local/demo intake boundary: it makes the required contents explicit without calling production providers or external storage.
          </p>
        </div>
        <Link className={styles.link} href="/">Back to session</Link>
      </header>

      <section className={`${styles.card} ${styles.consent}`} aria-labelledby="lane-title">
        <h2 id="lane-title">1. Choose the submission lane</h2>
        <p className={styles.subtitle}>The lane controls authority language and what Patrick should prepare before uploading real test material.</p>
        <div className={styles.controls} role="group" aria-label="Dataset submission lane">
          {(["self", "family"] as Lane[]).map((option) => (
            <button key={option} type="button" className={`${styles.button} ${lane === option ? "" : styles.secondary}`} onClick={() => switchLane(option)} aria-pressed={lane === option}>
              {laneCopy[option].label}
            </button>
          ))}
        </div>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </section>

      <section className={styles.grid}>
        <form className={styles.card} onSubmit={submit}>
          <h2>2. Packet details</h2>
          <p className={styles.subtitle}>All fields are required so the future backend contract can separate identity, authority, materials, context, contact, and storage review.</p>
          <div className={styles.notice}>
            <strong>Submission boundary</strong>
            This page intentionally stops before any production upload or provider call. Saving here creates a local browser draft only, so Patrick can prepare a complete packet without needing secrets or live storage access during intake.
          </div>

          <div className={styles.dashboard} aria-label="Current packet readiness">
            <div>
              <span className={styles.kicker}>Current packet status</span>
              <strong>{currentScore}% complete</strong>
              <p>{complete ? "Ready for local demo save; reviewer handoff still requires controlled-storage references." : "Complete every field and acknowledgement before a reviewer can triage this packet."}</p>
            </div>
            <div>
              <span className={`${styles.chip} ${complete ? styles.ready : styles.paused}`}>{complete ? "Draft saved-ready" : "Intake incomplete"}</span>
            </div>
          </div>

          <div className={styles.stepList} aria-label="Submission packet steps">
            {packetSteps.map((step, index) => (
              <div key={step.title} className={styles.stepItem}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <div>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepDetail}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <TextField id="subjectName" label="Subject identity" value={draft.subjectName} onChange={update} placeholder="Preferred/legal name and any identifiers for the test packet" />
          <TextField id="submitterName" label="Submitter identity" value={draft.submitterName} onChange={update} placeholder="Who is preparing this packet" />
          <TextField id="relationship" label="Relationship / lane context" value={draft.relationship} onChange={update} placeholder={lane === "self" ? "Self / subject" : "e.g., spouse, sibling, adult child, executor"} />
          <TextField id="contact" label="Contact and review preference" value={draft.contact} onChange={update} placeholder="Email/phone plus preferred review cadence or escalation contact" />
          <TextField id="authority" label="Consent / authority acknowledgement" rows={3} value={draft.authority} onChange={update} placeholder={copy.authority} />
          <TextField id="sourceMaterials" label="Source media and documents" rows={4} value={draft.sourceMaterials} onChange={update} placeholder="Inventory voice clips, videos, photos, writings, documents, links, dates, and anything that must remain excluded." />
          <TextField id="contextNotes" label="Notes and context" rows={4} value={draft.contextNotes} onChange={update} placeholder="Important memories, tone, pronunciation notes, family context, review concerns, or red lines." />
          <TextField id="preferences" label="Contact, mode, and artifact preferences" rows={3} value={draft.preferences} onChange={update} placeholder="Text/voice/video preferences, artifact review requirements, storage limits, and who can approve changes." />

          <label className={styles.check}>
            <input type="checkbox" checked={draft.consent} onChange={(event) => update("consent", event.target.checked)} />
            <span>I understand this is consented test-packet intake, not permission for unrestricted memorial generation.</span>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={draft.storage} onChange={(event) => update("storage", event.target.checked)} />
            <span>I understand upload/storage is mocked locally here; real controlled storage review is still required.</span>
          </label>

          <div className={styles.controls}>
            <button className={styles.button} type="submit" disabled={!complete}>Save local demo submission</button>
            <span className={`${styles.chip} ${complete ? styles.ready : styles.paused}`}>{complete ? "Ready to save" : "Required fields pending"}</span>
          </div>
          {submitted && (
            <p className={styles.notice} role="status">
              <strong>Local demo submission saved</strong>
              Submission {submitted} was saved to this browser&apos;s localStorage only. No external upload or production provider call was made.
            </p>
          )}
        </form>

        <aside className={styles.card}>
          <h2>Packet dashboard</h2>
          <p className={styles.subtitle}>Use this dashboard to see what is ready, what needs more detail, and what must be routed to human review before Sanctra imports anything.</p>
          <div className={styles.notice}>
            <strong>What remains after this page</strong>
            After Patrick saves a complete packet, the remaining real-data step is controlled-storage review plus the bounded local preflight/import sequence. No realtime, live-avatar, or uncontrolled external upload is part of this intake lane.
          </div>
          <div className={styles.statusPanel} aria-label="Modality completeness and privacy warnings">
            {currentModality.map((item) => (
              <div key={item.key} className={styles.statusItem}>
                <div className={styles.statusTopline}>
                  <strong>{item.label}</strong>
                  <span className={`${styles.chip} ${item.status === "ready" ? styles.ready : item.status === "high-risk" ? styles.danger : styles.paused}`}>{item.status === "ready" ? "Ready note" : item.status === "high-risk" ? "Privacy review" : "Needs detail"}</span>
                </div>
                <p>{item.cue}</p>
                <p className={styles.privacy}>{item.privacy}</p>
              </div>
            ))}
          </div>
          <h3>Reviewer handoff requirements</h3>
          <ol className={styles.prepareList}>
            {reviewRequirements.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <h3>Recent local demo submissions</h3>
          <div className={styles.historyList} aria-live="polite">
            {submissions.length === 0 ? (
              <p className={styles.subtitle}>No local submissions saved in this browser yet.</p>
            ) : submissions.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <strong>{item.fields.subjectName || "Unnamed packet"}</strong>
                <span>{laneCopy[item.lane].label} · {formatDate(item.createdAt)}</span>
                <p>{item.reviewerHandoff?.nextAction || "Route to human preflight review before import."}</p>
              </div>
            ))}
          </div>

          <h2>What Patrick should prepare</h2>
          <p className={styles.subtitle}>Use this checklist before submitting himself or a family-authorized packet through the intended flow.</p>
          <div className={styles.chipRow}>
            <span className={`${styles.chip} ${styles.ready}`}>Identity</span>
            <span className={`${styles.chip} ${styles.ready}`}>Consent / authority</span>
            <span className={`${styles.chip} ${styles.ready}`}>Source materials</span>
            <span className={`${styles.chip} ${styles.ready}`}>Context</span>
            <span className={`${styles.chip} ${styles.ready}`}>Contact / preferences</span>
            <span className={`${styles.chip} ${styles.paused}`}>Controlled storage placeholder</span>
          </div>
          <ol className={styles.prepareList}>
            {copy.prepare.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <div className={styles.notice}>
            <strong>Mock persistence boundary</strong>
            The current implementation stores only structured demo data in localStorage under <code>{storageKey}</code>. File upload controls are intentionally represented as source-material inventory fields until controlled storage is wired.
          </div>
        </aside>
      </section>
    </main>
  );
}
