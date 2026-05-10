"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { blockedOperations, buildClientManifest, laneConfigs, type IntakeLane } from "@/lib/corpusIntake";
import styles from "./DatasetSubmissionPage.module.css";

type UploadSelection = Record<string, File[]>;
type AnswerMap = Record<string, string>;

type SubmitResult = {
  ok: boolean;
  error?: string;
  storage_root?: string;
  manifest_uri?: string;
  uploaded_files?: Array<{ slot_id: string; original_filename: string; storage_uri: string; size_bytes: number }>;
  gates?: Record<string, unknown>;
};

function flattenFiles(files: UploadSelection) {
  return Object.entries(files).flatMap(([slotId, list]) => list.map((file) => ({ slotId, file })));
}

export default function IntakeLanePage({ lane }: { lane: IntakeLane }) {
  const config = laneConfigs[lane];
  const [subjectName, setSubjectName] = useState(lane === "live_subject" ? "Patrick" : "Patrick archive simulation");
  const [submitterName, setSubmitterName] = useState("Patrick");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [operatorNotes, setOperatorNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<UploadSelection>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const flatFiles = useMemo(() => flattenFiles(files), [files]);
  const selectedFiles = flatFiles.map(({ slotId, file }) => ({ slotId, name: file.name, type: file.type, size: file.size }));
  const manifest = useMemo(() => buildClientManifest({ lane, subjectName, submitterName, relationshipAnswers: answers, operatorNotes, selectedFiles }), [lane, subjectName, submitterName, answers, operatorNotes, selectedFiles]);
  const requiredSlotsReady = config.slots.filter((slot) => slot.required).every((slot) => (files[slot.id]?.length || 0) > 0);
  const questionsReady = config.relationshipQuestions.every((question) => (answers[question] || "").trim().length > 0);
  const canSubmit = consent && requiredSlotsReady && questionsReady && !submitting;

  async function submitCorpus() {
    setSubmitting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("manifest", JSON.stringify(manifest));
      flatFiles.forEach(({ slotId, file }, index) => {
        form.append("files", file, file.name);
        form.append(`slotId:${index}`, slotId);
      });
      const response = await fetch("/api/corpus-intake/submit", { method: "POST", body: form });
      const payload = await response.json();
      setResult(payload);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Unknown submission error" });
    } finally {
      setSubmitting(false);
    }
  }

  function downloadManifest() {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sanctra-${lane}-corpus-intake-manifest.draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{config.eyebrow}</p>
          <h1 className={styles.title}>{config.title}</h1>
          <p className={styles.subtitle}>{config.subtitle}</p>
        </div>
        <nav className={styles.nav} aria-label="Dataset intake navigation">
          <Link className={styles.link} href="/dataset">Dataset hub</Link>
          <Link className={styles.link} href={lane === "live_subject" ? "/dataset/posthumous" : "/dataset/live"}>{lane === "live_subject" ? "Posthumous lane" : "Live lane"}</Link>
          <Link className={styles.link} href="/">Session</Link>
        </nav>
      </header>

      <section className={`${styles.card} ${styles.consent}`}>
        <h2>1. Consent and authority</h2>
        <p className={styles.subtitle}>{config.consentText}</p>
        <div className={styles.gridTwo}>
          <label className={styles.field}><span className={styles.kicker}>Subject display name</span><input className={styles.input} value={subjectName} onChange={(event) => setSubjectName(event.target.value)} /></label>
          <label className={styles.field}><span className={styles.kicker}>Submitter display name</span><input className={styles.input} value={submitterName} onChange={(event) => setSubmitterName(event.target.value)} /></label>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>I acknowledge this consent/authority statement. Corpus upload is allowed; model training, provider fine-tuning, public delivery, and avatar runtime deployment remain blocked until later explicit gates.</span>
        </label>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <h2>2. Guided questions</h2>
          <p className={styles.subtitle}>These answers travel with the corpus and help shape review, schema evaluation, and dataset construction.</p>
          {config.relationshipQuestions.map((question) => (
            <label className={styles.field} key={question}>
              <span className={styles.kicker}>{question}</span>
              <textarea className={styles.input} rows={4} value={answers[question] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question]: event.target.value }))} />
            </label>
          ))}

          <h2>3. Upload corpus files</h2>
          <p className={styles.subtitle}>Files are uploaded to the configured Sanctra GCS corpus bucket. They become raw corpus objects, not training datasets yet.</p>
          <div className={styles.slotGrid}>
            {config.slots.map((slot) => (
              <article key={slot.id} className={styles.slotCard}>
                <div className={styles.slotHeader}>
                  <div><p className={styles.kicker}>{slot.modality}</p><h3>{slot.title}</h3></div>
                  <span className={`${styles.chip} ${slot.reviewState === "corpus_staged" ? styles.ready : styles.paused}`}>{slot.reviewState}</span>
                </div>
                <p className={styles.subtitle}>{slot.prompt}</p>
                <ul className={styles.prepareList}>{slot.guidance.map((item) => <li key={item}>{item}</li>)}</ul>
                <label className={styles.field}>
                  <span className={styles.kicker}>Select files · {slot.accepts}</span>
                  <input className={styles.input} type="file" multiple accept={slot.accepts} onChange={(event) => setFiles((current) => ({ ...current, [slot.id]: Array.from(event.target.files || []) }))} />
                </label>
                {!!files[slot.id]?.length && <p className={styles.slotMeta}>{files[slot.id].map((file) => `${file.name} (${file.size.toLocaleString()} bytes)`).join(" · ")}</p>}
              </article>
            ))}
          </div>

          <label className={styles.field}>
            <span className={styles.kicker}>Additional review notes</span>
            <textarea className={styles.input} rows={5} value={operatorNotes} onChange={(event) => setOperatorNotes(event.target.value)} placeholder="Dataset-shape ideas, corpus concerns, exclusions, priority modalities, or reviewer notes." />
          </label>
        </div>

        <aside className={styles.card}>
          <h2>4. Submit corpus intake</h2>
          <div className={styles.chipRow}>
            <span className={`${styles.chip} ${consent ? styles.ready : styles.paused}`}>{consent ? "consent ready" : "consent required"}</span>
            <span className={`${styles.chip} ${questionsReady ? styles.ready : styles.paused}`}>{questionsReady ? "questions answered" : "questions required"}</span>
            <span className={`${styles.chip} ${requiredSlotsReady ? styles.ready : styles.paused}`}>{flatFiles.length} files selected</span>
          </div>
          <div className={styles.notice}><strong>Still blocked after upload</strong>{blockedOperations.join(", ")}. We will add corpus/schema/dataset reviews before any training or tuning.</div>
          <div className={styles.controls}>
            <button className={styles.button} type="button" disabled={!canSubmit} onClick={submitCorpus}>{submitting ? "Submitting…" : "Submit corpus to GCS"}</button>
            <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={downloadManifest}>Download draft manifest</button>
          </div>

          {result && (
            <div className={result.ok ? styles.successBox : styles.errorBox} role="status">
              <strong>{result.ok ? "Corpus intake submitted" : "Submission blocked"}</strong>
              {result.error && <p>{result.error}</p>}
              {result.storage_root && <p><code>{result.storage_root}</code></p>}
              {result.manifest_uri && <p>Manifest: <code>{result.manifest_uri}</code></p>}
              {!!result.uploaded_files?.length && <ul>{result.uploaded_files.map((file) => <li key={`${file.slot_id}-${file.original_filename}`}>{file.slot_id}: <code>{file.storage_uri}</code></li>)}</ul>}
            </div>
          )}

          <h3>Draft manifest preview</h3>
          <pre className={styles.preview}>{JSON.stringify(manifest, null, 2)}</pre>
        </aside>
      </section>
    </main>
  );
}
