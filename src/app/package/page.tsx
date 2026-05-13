import Link from "next/link";
import styles from "./PackageDashboardPage.module.css";
import {
  HARD_LOCKS,
  REVIEW_STATES,
  loadPackageDashboardData,
  type AuthorityStatus,
  type ManifestLane,
  type Modality,
  type ReviewState,
} from "@/lib/privateManifestReview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Package dashboard · Sanctra",
  robots: { index: false, follow: false },
};

const modalities: Modality[] = ["text", "audio", "image", "video"];

function laneLabel(lane: ManifestLane) {
  return lane === "live_subject" ? "Living subject" : "Family archive";
}

function authorityTone(status: AuthorityStatus) {
  if (status === "self_attested" || status === "family_authorized") return styles.safe;
  if (status === "disputed") return styles.danger;
  return styles.warn;
}

function reviewTone(state: ReviewState) {
  if (state === "approved" || state === "approved_with_limits") return styles.safe;
  if (state === "quarantined" || state === "rejected") return styles.danger;
  return styles.warn;
}

function formatOperation(operation: string) {
  return operation.replaceAll("_", " ");
}

export default function PackageDashboardPage() {
  const dashboard = loadPackageDashboardData();
  const totals = dashboard.summaries.reduce(
    (acc, item) => {
      acc.packages += 1;
      acc.pending += item.reviewCounts.corpus_staged + item.reviewCounts.needs_review;
      acc.accepted += item.reviewCounts.approved + item.reviewCounts.approved_with_limits;
      acc.blocked += item.reviewCounts.quarantined + item.reviewCounts.rejected;
      return acc;
    },
    { packages: 0, pending: 0, accepted: 0, blocked: 0 },
  );

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Metadata-only package dashboard</p>
          <h1>Understand package readiness without exposing raw media</h1>
          <p className={styles.subtitle}>
            This read-only view summarizes subject packets from fixture or server-side local manifest metadata. It shows lane, consent, modality coverage, reviewer posture, and blocked operations before any next action can happen.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Package dashboard navigation">
          <Link href="/dataset">Dataset intake</Link>
          <Link href="/curate">Curation</Link>
          <Link href="/admin/manifest-review">Manifest review</Link>
          <Link href="/">Session</Link>
        </nav>
      </header>

      <section className={styles.banner} aria-labelledby="source-title">
        <div>
          <p className={styles.kicker}>{dashboard.source === "fixture_only" ? "Fixture/local metadata" : "Server metadata export"}</p>
          <h2 id="source-title">Dashboard source: {dashboard.sourceLabel}</h2>
          <p className={styles.subtitle}>No browser storage listing, signed URL exposure, raw corpus render, provider call, training control, or public delivery path is available from this page.</p>
        </div>
        <div className={styles.metrics} aria-label="Package dashboard totals">
          <div><strong>{totals.packages}</strong><span>packages</span></div>
          <div><strong>{totals.accepted}</strong><span>accepted/limited</span></div>
          <div><strong>{totals.pending}</strong><span>pending review</span></div>
          <div><strong>{totals.blocked}</strong><span>blocked items</span></div>
        </div>
      </section>

      <section className={styles.lockPanel} aria-labelledby="locks-title">
        <div>
          <p className={styles.kicker}>Non-negotiable locks</p>
          <h2 id="locks-title">Metadata can move; raw corpus and model operations cannot.</h2>
        </div>
        <div className={styles.lockGrid}>{HARD_LOCKS.map((lock) => <span key={lock}>{lock}</span>)}</div>
      </section>

      <section className={styles.packageGrid} aria-label="Subject package summaries">
        {dashboard.summaries.map((summary) => (
          <article key={summary.intakeId} className={styles.packageCard} aria-labelledby={`${summary.intakeId}-title`}>
            <div className={styles.cardHead}>
              <div>
                <p className={styles.kicker}>{laneLabel(summary.lane)}</p>
                <h2 id={`${summary.intakeId}-title`}>{summary.subjectLabel}</h2>
                <p className={styles.subtitle}>Submitted by {summary.submitterLabel} · {summary.submittedAt}</p>
              </div>
              <span className={`${styles.chip} ${authorityTone(summary.authorityStatus)}`}>{formatOperation(summary.authorityStatus)}</span>
            </div>

            <div className={styles.refBox} aria-label={`${summary.intakeId} redacted metadata references`}>
              <div><span>Manifest summary ref</span><strong>{summary.manifestRef}</strong></div>
              <div><span>Storage summary ref</span><strong>{summary.storageRef}</strong></div>
            </div>

            <div className={styles.modalityGrid} aria-label={`${summary.intakeId} modality coverage`}>
              {modalities.map((modality) => (
                <div key={modality} className={`${styles.modalityCard} ${summary.modalityCounts[modality] > 0 ? styles.hasCoverage : styles.missingCoverage}`}>
                  <strong>{summary.modalityCounts[modality]}</strong>
                  <span>{modality}</span>
                </div>
              ))}
            </div>

            <div className={styles.reviewBlock}>
              <h3>Reviewer posture</h3>
              <p>{summary.reviewerState}</p>
              <div className={styles.chipRow} aria-label={`${summary.intakeId} review states`}>
                {REVIEW_STATES.map((state) => <span key={state} className={`${styles.chip} ${reviewTone(state)}`}>{formatOperation(state)}: {summary.reviewCounts[state]}</span>)}
              </div>
            </div>

            <div className={styles.splitGrid}>
              <section aria-labelledby={`${summary.intakeId}-gaps`}>
                <h3 id={`${summary.intakeId}-gaps`}>Readiness gaps</h3>
                <ul className={styles.list}>{summary.readinessGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
              </section>
              <section aria-labelledby={`${summary.intakeId}-blocked`}>
                <h3 id={`${summary.intakeId}-blocked`}>Blocked operations</h3>
                <ul className={styles.list}>{summary.blockedOperations.map((operation) => <li key={operation}>{formatOperation(operation)}</li>)}</ul>
              </section>
            </div>

            <div className={styles.privacyStrip}>
              <span>Privacy/authority flags</span>
              <strong>{summary.privacyFlags.length ? summary.privacyFlags.map(formatOperation).join(" · ") : "none unresolved in metadata"}</strong>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
