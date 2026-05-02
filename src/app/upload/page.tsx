
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./UploadPage.module.css";

type Lane = "self" | "family";
type Modality = "text" | "audio" | "image" | "video";
type ReviewState = "accepted" | "quarantined" | "rejected";

type UploadItem = {
  id: string;
  modality: Modality;
  label: string;
  cue: string;
  acceptedTypes: string;
  reviewState: ReviewState;
  provenance: string;
  consent: string;
  reviewReason: string;
};

const laneCopy: Record<Lane, { eyebrow: string; title: string; summary: string; authority: string; warnings: string[] }> = {
  self: {
    eyebrow: "Lane A · living subject",
    title: "I am uploading my own memories and media",
    summary: "Use after guided curation has captured consent boundaries, no-current-awareness limits, and review preferences.",
    authority: "Subject-authored consent controls each text, audio, image, and video item before it can become reusable package material.",
    warnings: [
      "Every file remains staged until subject review confirms artifact scope and use-case.",
      "High-presence voice/video stays evaluation-only until explicit likeness approval exists.",
    ],
  },
  family: {
    eyebrow: "Lane B · family archive",
    title: "I am uploading a family-submitted archive",
    summary: "Use when an authorized family member inventories existing materials for reviewer triage before sanitation.",
    authority: "Submitter authority, subject identity confidence, third-party privacy, and family conflict checks stay visible per item.",
    warnings: [
      "Archive items default to human review; disputed or third-party-heavy content is quarantined.",
      "No processor/sanitation behavior runs in this prototype; only metadata handoff is modeled.",
    ],
  },
};

const modalityItems: UploadItem[] = [
  { id: "text-memory", modality: "text", label: "Text memories and writings", cue: "Stories, values, phrases, letters, eulogies, journals, or curated prompt responses.", acceptedTypes: ".txt, .md, .pdf, .docx", reviewState: "accepted", provenance: "Author/date/source note required; private names can be redacted before package reuse.", consent: "Private memorial and relationship-context reuse can proceed only inside stated consent scope.", reviewReason: "Reviewer accepted text for package metadata reuse after consent/provenance check." },
  { id: "audio-voice", modality: "audio", label: "Audio voice samples", cue: "Clean single-speaker voice clips, guided curation recordings, interviews, or archive snippets.", acceptedTypes: ".wav, .mp3, .m4a, .flac", reviewState: "quarantined", provenance: "Recorder, date, speaker identity, background speakers/music, and transcript status required.", consent: "Voice likeness is staged separately from text reuse; no clone/training handoff without reviewer approval.", reviewReason: "Quarantined until explicit likeness consent, single-speaker confidence, and quality notes are reviewed." },
  { id: "image-reference", modality: "image", label: "Image references", cue: "Portraits, everyday appearance, family-approved photos, and likeness references.", acceptedTypes: ".jpg, .jpeg, .png, .webp, .heic", reviewState: "accepted", provenance: "Photographer/source, date/context, visible third parties, minors, and derivative crop intent required.", consent: "Original is preserved; face crop or avatar reference is a later derivative job after privacy review.", reviewReason: "Accepted as metadata-only visual reference; derivative crop stays outside this slice." },
  { id: "video-reference", modality: "video", label: "Video references", cue: "Short clips with gesture, face, voice, eyeline, consent statement, or archive context.", acceptedTypes: ".mp4, .mov, .webm", reviewState: "rejected", provenance: "Scene context, speaker confidence, third parties, music, transcript/extraction status, and clip owner required.", consent: "Video is excluded unless explicit likeness, privacy, and quality gates exist.", reviewReason: "Rejected example shows no package reuse when third-party privacy and video-likeness authority are unresolved." },
];

function stateLabel(state: ReviewState) {
  return state;
}

export default function UploadPage() {
  const [lane, setLane] = useState<Lane>("self");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const copy = laneCopy[lane];
  const stagedCount = useMemo(() => Object.values(selected).reduce((sum, count) => sum + count, 0), [selected]);
  const reviewCounts = useMemo(() => ({
    accepted: modalityItems.filter((item) => item.reviewState === "accepted").length,
    quarantined: modalityItems.filter((item) => item.reviewState === "quarantined").length,
    rejected: modalityItems.filter((item) => item.reviewState === "rejected").length,
  }), []);

  const saveManifest = () => {
    const manifest = {
      schema_version: "sanctra.bulk_upload_handoff.v0",
      handoff_id: `bulk_upload:${lane}_prototype_${Date.now()}`,
      lane: lane === "self" ? "living_subject_bulk_upload" : "family_archive_bulk_upload",
      created_at: new Date().toISOString(),
      storage_boundary: "prototype-local metadata only; no provider call, raw media persistence, or sanitation pipeline execution",
      uploader_authority: {
        basis: lane === "self" ? "subject_self" : "family_authorized",
        review_required: true,
        conflict_policy: lane === "self" ? "Subject revocation pauses reuse immediately." : "Family conflict pauses release and routes to human review.",
      },
      review_contract: {
        allowed_states: ["accepted", "quarantined", "rejected"],
        default_state: "quarantined",
        processor_boundary: "Upload handoff records metadata and reviewer disposition only; processor/sanitation internals are not started in this slice.",
        state_definitions: [
          { state: "accepted", meaning: "Authority, provenance, consent scope, and privacy checks are sufficient for package metadata reuse.", reusable_for_package: true, next_action: "May enter package metadata; derivative work still requires later scoped jobs." },
          { state: "quarantined", meaning: "Preserve external reference but block reuse until missing review evidence is resolved.", reusable_for_package: false, next_action: "Collect authority, identity, privacy, or quality evidence without processing raw media." },
          { state: "rejected", meaning: "Exclude from package reuse because consent/provenance/privacy/quality requirements failed.", reusable_for_package: false, next_action: "Keep only audit metadata required for accountability and revocation history." },
        ],
      },
      staged_items: modalityItems.map((item) => ({
        modality: item.modality,
        upload_slot_id: item.id,
        selected_file_count: selected[item.id] || 0,
        review_state: item.reviewState,
        provenance_requirement: item.provenance,
        consent_requirement: item.consent,
        review_reason: item.reviewReason,
        sanitation_status: "not_started_follow_up_slice",
        operator_note: notes[item.id] || "",
      })),
    };
    window.localStorage.setItem("sanctra-demo-bulk-upload-handoff", JSON.stringify(manifest, null, 2));
    setSaved(manifest.created_at);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Bulk uploader prototype</p>
          <h1>Stage media after guided curation</h1>
          <p className={styles.subtitle}>This screen models the handoff from guided curation into upload metadata for text, audio, image, and video. It does not persist raw media, call providers, or run sanitation.</p>
        </div>
        <nav className={styles.nav} aria-label="Sanctra prototype navigation">
          <Link href="/curate">Guided curation</Link>
          <Link href="/dataset">Dataset packet</Link>
          <Link href="/">Session</Link>
        </nav>
      </header>

      <section className={styles.lanes} aria-label="Bulk upload lane">
        {(["self", "family"] as Lane[]).map((option) => (
          <button key={option} type="button" className={`${styles.laneCard} ${lane === option ? styles.selected : ""}`} onClick={() => { setLane(option); setSaved(null); }} aria-pressed={lane === option}>
            <span>{laneCopy[option].eyebrow}</span>
            <strong>{laneCopy[option].title}</strong>
            <p>{laneCopy[option].summary}</p>
          </button>
        ))}
      </section>

      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <p className={styles.kicker}>{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.authority}</p>
          <div className={styles.stats}>
            <span><strong>{stagedCount}</strong> files selected locally</span>
            <span><strong>{reviewCounts.accepted}</strong> accepted slots</span>
            <span><strong>{reviewCounts.quarantined}</strong> quarantined slot</span>
            <span><strong>{reviewCounts.rejected}</strong> rejected slot</span>
          </div>
          <div className={styles.notice}>
            <strong>Consent/provenance cues</strong>
            <ul>{copy.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
          <button className={styles.primary} type="button" onClick={saveManifest}>Save mocked handoff manifest</button>
          {saved && <p className={styles.saved} role="status">Saved metadata handoff at {saved}. Browser localStorage only.</p>}
        </aside>

        <section className={styles.grid} aria-label="Upload staging slots">
          {modalityItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardTopline}>
                <span className={styles.modality}>{item.modality}</span>
                <span className={`${styles.pill} ${styles[item.reviewState]}`}>{stateLabel(item.reviewState)}</span>
              </div>
              <h3>{item.label}</h3>
              <p className={styles.subtitle}>{item.cue}</p>
              <label className={styles.dropZone}>
                <span>Choose files for metadata staging</span>
                <input type="file" multiple accept={item.acceptedTypes} onChange={(event) => { setSelected((current) => ({ ...current, [item.id]: event.target.files?.length || 0 })); setSaved(null); }} />
                <strong>{selected[item.id] ? `${selected[item.id]} selected` : item.acceptedTypes}</strong>
              </label>
              <label className={styles.field}>
                <span>Provenance / consent note</span>
                <textarea value={notes[item.id] || ""} onChange={(event) => { setNotes((current) => ({ ...current, [item.id]: event.target.value })); setSaved(null); }} placeholder="Source, date, owner/authority, excluded people/topics, and review concerns" rows={3} />
              </label>
              <div className={styles.metaBlock}><strong>Provenance</strong><p>{item.provenance}</p></div>
              <div className={styles.metaBlock}><strong>Consent</strong><p>{item.consent}</p></div>
              <div className={styles.metaBlock}><strong>Review reason</strong><p>{item.reviewReason}</p></div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
