import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./ManifestReviewPage.module.css";
import {
  HARD_LOCKS,
  REVIEW_STATES,
  countByModality,
  countByReviewState,
  getPrivateManifestReviewAccess,
  loadPrivateManifestQueue,
  manifestStorageSummary,
  unresolvedFlags,
  type IntakeManifest,
  type ReviewState,
} from "@/lib/privateManifestReview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Private manifest review queue · Sanctra",
  robots: { index: false, follow: false },
};

function formatLane(lane: IntakeManifest["lane"]) {
  return lane === "live_subject" ? "Live subject" : "Posthumous archive";
}

function stateTone(state: ReviewState) {
  if (state === "approved" || state === "approved_with_limits") return styles.safe;
  if (state === "quarantined" || state === "rejected") return styles.danger;
  return styles.warn;
}

function QueueCard({ manifest }: { manifest: IntakeManifest }) {
  const modalityCounts = countByModality(manifest);
  const reviewCounts = countByReviewState(manifest);
  const flags = unresolvedFlags(manifest);
  return (
    <article className={styles.queueCard} aria-labelledby={`${manifest.intakeId}-title`}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.kicker}>{formatLane(manifest.lane)}</p>
          <h2 id={`${manifest.intakeId}-title`}>{manifest.intakeId}</h2>
          <p className={styles.subtitle}>Submitted {manifest.submittedAt} by {manifest.submitterDisplayName}</p>
        </div>
        <span className={`${styles.chip} ${manifest.authorityStatus.includes("review") || manifest.authorityStatus === "disputed" ? styles.danger : styles.safe}`}>{manifest.authorityStatus}</span>
      </div>

      <div className={styles.grid} aria-label={`${manifest.intakeId} file counts`}>
        {Object.entries(modalityCounts).map(([modality, count]) => <div key={modality} className={styles.stat}><strong>{count}</strong>{modality} files</div>)}
      </div>

      <div className={styles.chipRow} aria-label={`${manifest.intakeId} review-state counts`}>
        {REVIEW_STATES.map((state) => <span key={state} className={`${styles.chip} ${stateTone(state)}`}>{state}: {reviewCounts[state]}</span>)}
      </div>

      <dl className={styles.metaList}>
        <dt>Subject</dt><dd>{manifest.subjectDisplayName}</dd>
        <dt>Manifest ref</dt><dd>{manifestStorageSummary(manifest)}</dd>
        <dt>Unresolved flags</dt><dd>{flags.length ? flags.join(", ") : "none"}</dd>
        <dt>Blocked operations</dt><dd>{manifest.blockedOperations.join(", ")}</dd>
      </dl>
    </article>
  );
}

function DetailCard({ manifest }: { manifest: IntakeManifest }) {
  return (
    <section className={styles.detailCard} aria-labelledby={`${manifest.intakeId}-detail`}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.kicker}>Metadata-only detail</p>
          <h3 id={`${manifest.intakeId}-detail`}>{manifest.intakeId} review detail</h3>
          <p className={styles.subtitle}>Raw object names and media download links are intentionally withheld in this private view.</p>
        </div>
        <span className={styles.chip}>{manifest.items.length} review items</span>
      </div>

      <dl className={styles.metaList}>
        <dt>Manifest URI</dt><dd>{manifest.manifestUri}</dd>
        <dt>Storage root</dt><dd>{manifest.storageRoot} · raw browser listing disabled</dd>
        <dt>Manifest hash</dt><dd>{manifest.manifestHash}</dd>
        <dt>Authority status</dt><dd>{manifest.authorityStatus}</dd>
        <dt>Top-level flags</dt><dd>{manifest.privacyFlags.join(", ")}</dd>
      </dl>

      <div className={styles.itemGrid}>
        {manifest.items.map((item) => (
          <article key={item.id} className={styles.itemCard}>
            <div className={styles.itemTopline}>
              <div>
                <p className={styles.kicker}>{item.modality} · {item.id}</p>
                <h4>{item.label}</h4>
              </div>
              <span className={`${styles.chip} ${stateTone(item.reviewState)}`}>{item.reviewState}</span>
            </div>
            <p><strong>Provenance:</strong> {item.provenanceNote}</p>
            <p><strong>Consent:</strong> {item.consentNote}</p>
            <p><strong>Authority:</strong> {item.authorityStatus} · <strong>Identity:</strong> {item.identityConfidence} · <strong>Likeness risk:</strong> {item.likenessRisk}</p>
            <p><strong>Recommendation:</strong> {item.reviewerRecommendation}</p>
            <ul className={styles.list} aria-label={`${item.id} privacy and operation flags`}>
              {item.privacyFlags.map((flag) => <li key={flag}>Privacy flag: {flag}</li>)}
              {item.blockedOperations.map((operation) => <li key={operation}>Blocked: {operation}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ManifestReviewPage() {
  const access = getPrivateManifestReviewAccess();
  if (!access.allowed) notFound();

  const queue = loadPrivateManifestQueue();
  const isFixtureOnly = queue.source === "fixture_only";

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Private admin · pilot corpus</p>
          <h1>Manifest reviewer queue</h1>
          <p className={styles.subtitle}>Server-side, authenticated review of staged manifest metadata under gs://sanctra-corpus-intake/pilot-corpus. This view summarizes intake state, authority/privacy risk, and reviewer recommendations without rendering or linking raw corpus media.</p>
        </div>
        <nav className={styles.nav} aria-label="Sanctra admin navigation">
          <Link href="/dataset">Dataset intake</Link>
          <Link href="/upload">Upload handoff</Link>
          <Link href="/">Session</Link>
        </nav>
      </header>

      <section className={styles.banner} aria-labelledby="source-title">
        <div>
          <p className={styles.kicker}>{isFixtureOnly ? "Fixture-only gate" : "Server-side manifest source"}</p>
          <h2 id="source-title">{isFixtureOnly ? "Fixture-only review mode is explicitly enabled." : "Queue data is loaded from a configured server-side GCS metadata export."}</h2>
          <p className={styles.subtitle}>{queue.sourceLabel}. {isFixtureOnly ? "This deployment must not be represented as live GCS manifest-read coverage." : "The page does not import fixture data on the production review path."}</p>
        </div>
      </section>

      <section className={styles.banner} aria-labelledby="lock-title">
        <div>
          <p className={styles.kicker}>Pilot hard locks</p>
          <h2 id="lock-title">Review metadata only; raw corpus exposure stays blocked.</h2>
          <p className={styles.subtitle}>The implementation reads server-side manifest metadata only. It does not fetch GCS media from the browser, expose signed URLs, call providers, or start training/derived-dataset transitions.</p>
        </div>
        <div className={styles.lockGrid}>
          {HARD_LOCKS.map((lock) => <div key={lock} className={styles.lockCard}>{lock}</div>)}
        </div>
      </section>

      <section className={styles.queue} aria-label="Private reviewer queue list">
        {queue.manifests.map((manifest) => <QueueCard key={manifest.intakeId} manifest={manifest} />)}
      </section>

      <section className={styles.details} aria-label="Private reviewer detail views">
        {queue.manifests.map((manifest) => <DetailCard key={manifest.intakeId} manifest={manifest} />)}
      </section>
    </main>
  );
}
