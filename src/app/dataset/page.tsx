import Link from "next/link";
import styles from "./DatasetSubmissionPage.module.css";

export default function DatasetHubPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Sanctra corpus intake</p>
          <h1 className={styles.title}>Choose the pilot submission lane</h1>
          <p className={styles.subtitle}>These are production-shaped upload UIs for building the raw corpus in Google Cloud Storage. Training/tuning remains gated behind corpus schema and dataset-shape review.</p>
        </div>
        <Link className={styles.link} href="/">Back to session</Link>
      </header>
      <section className={styles.laneGrid}>
        <Link className={styles.laneLinkCard} href="/dataset/live">
          <span className={styles.kicker}>Live submission UI</span>
          <strong>Patrick submits his own living-subject corpus</strong>
          <p>Guided consent, self-subject prompts, text/audio/image/video upload, and GCS corpus manifest.</p>
        </Link>
        <Link className={styles.laneLinkCard} href="/dataset/posthumous">
          <span className={styles.kicker}>Posthumous/archive UI</span>
          <strong>Family or professional archive submission</strong>
          <p>Authority, conflicts, provenance, privacy risk, and archive upload flow. Patrick can simulate this lane with his own data.</p>
        </Link>
      </section>
      <section className={`${styles.card} ${styles.consent}`}>
        <h2>Current gates</h2>
        <p className={styles.subtitle}>Upload creates private raw corpus objects and intake manifests only. Before training we still review corpus JSON schema, canonical dataset shape, derived dataset manifests, modality-specific tuning plans, and deployment/consent boundaries.</p>
      </section>
    </main>
  );
}
