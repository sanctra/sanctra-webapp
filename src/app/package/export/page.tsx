import Link from "next/link";
import styles from "../PackageDashboardPage.module.css";
import { HARD_LOCKS, loadPackageExportPreviewData, type ManifestLane, type PackagePreviewSection } from "@/lib/privateManifestReview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Package export preview · Sanctra",
  robots: { index: false, follow: false },
};

function laneLabel(lane: ManifestLane) {
  return lane === "live_subject" ? "Living subject" : "Family archive";
}

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}

function sectionTone(status: PackagePreviewSection["status"]) {
  if (status === "included") return styles.safe;
  if (status === "limited") return styles.warn;
  return styles.danger;
}

export default function PackageExportPreviewPage() {
  const data = loadPackageExportPreviewData();
  const previewOnly = data.previews.filter((preview) => preview.readiness === "preview_only").length;
  const blocked = data.previews.filter((preview) => preview.readiness === "blocked").length;
  const reviewReady = data.previews.filter((preview) => preview.readiness === "review_ready").length;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Read-only package/export preview</p>
          <h1>Preview the handoff package without generating one</h1>
          <p className={styles.subtitle}>
            This seam shows what a future consultant, family, or provider package would contain from fixture/local manifest metadata only. Every export action is disabled until review gates and architecture/privacy approval exist.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Package export preview navigation">
          <Link href="/package">Package dashboard</Link>
          <Link href="/dataset">Dataset intake</Link>
          <Link href="/admin/manifest-review">Manifest review</Link>
          <Link href="/">Session</Link>
        </nav>
      </header>

      <section className={styles.banner} aria-labelledby="preview-source-title">
        <div>
          <p className={styles.kicker}>{data.source === "fixture_only" ? "Fixture/local metadata" : "Server metadata export"}</p>
          <h2 id="preview-source-title">Preview source: {data.sourceLabel}</h2>
          <p className={styles.subtitle}>No zip, download, signed URL, storage object listing, raw media link, provider payload, training job, or reviewer-state mutation is created by this route.</p>
        </div>
        <div className={styles.metrics} aria-label="Export preview totals">
          <div><strong>{data.previews.length}</strong><span>preview packages</span></div>
          <div><strong>{reviewReady}</strong><span>review-ready metadata</span></div>
          <div><strong>{previewOnly}</strong><span>preview-only</span></div>
          <div><strong>{blocked}</strong><span>blocked</span></div>
        </div>
      </section>

      <section className={styles.lockPanel} aria-labelledby="export-locks-title">
        <div>
          <p className={styles.kicker}>Disabled by design</p>
          <h2 id="export-locks-title">The preview explains the package; it does not create it.</h2>
        </div>
        <div className={styles.lockGrid}>{HARD_LOCKS.map((lock) => <span key={lock}>{lock}</span>)}</div>
      </section>

      <section className={styles.packageGrid} aria-label="Package export previews">
        {data.previews.map((preview) => {
          const sections = [preview.consultantHandoff, preview.familyReviewSummary, preview.providerHandoffReadiness];
          return (
            <article key={preview.intakeId} className={styles.packageCard} aria-labelledby={`${preview.intakeId}-preview-title`}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.kicker}>{laneLabel(preview.lane)}</p>
                  <h2 id={`${preview.intakeId}-preview-title`}>{preview.subjectLabel}</h2>
                  <p className={styles.subtitle}>Export posture: {formatValue(preview.readiness)} · intake {preview.intakeId}</p>
                </div>
                <span className={`${styles.chip} ${preview.readiness === "review_ready" ? styles.safe : preview.readiness === "preview_only" ? styles.warn : styles.danger}`}>{formatValue(preview.readiness)}</span>
              </div>

              <div className={styles.previewSections}>
                {sections.map((section) => (
                  <section key={section.title} className={styles.previewSection} aria-labelledby={`${preview.intakeId}-${section.title.replaceAll(" ", "-")}`}>
                    <div className={styles.sectionHead}>
                      <h3 id={`${preview.intakeId}-${section.title.replaceAll(" ", "-")}`}>{section.title}</h3>
                      <span className={`${styles.chip} ${sectionTone(section.status)}`}>{formatValue(section.status)}</span>
                    </div>
                    <p>{section.summary}</p>
                    <div className={styles.splitGrid}>
                      <div>
                        <h4>Preview evidence</h4>
                        <ul className={styles.list}>{section.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <h4>Blocked until</h4>
                        <ul className={styles.list}>{section.blockedUntil.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              <div className={styles.exportGrid}>
                <section className={styles.exportPanel} aria-labelledby={`${preview.intakeId}-artifacts`}>
                  <h3 id={`${preview.intakeId}-artifacts`}>Blocked/withheld artifacts</h3>
                  <ul className={styles.artifactList}>
                    {preview.blockedArtifacts.map((artifact) => (
                      <li key={`${artifact.label}-${artifact.reason}`}>
                        <strong>{artifact.label}</strong>
                        <span>{formatValue(artifact.status)} · {artifact.reason}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className={styles.exportPanel} aria-labelledby={`${preview.intakeId}-ctas`}>
                  <h3 id={`${preview.intakeId}-ctas`}>Disabled actions</h3>
                  <div className={styles.disabledActions}>
                    {preview.disabledCtas.map((cta) => <button key={cta} type="button" disabled>{cta}</button>)}
                  </div>
                  <p className={styles.reviewGate}>{preview.reviewGate}</p>
                </section>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
