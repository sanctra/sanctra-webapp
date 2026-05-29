import Link from "next/link";
import { listPilotManifestReviews, type ManifestReviewSummary } from "@/lib/manifestReviewBrowser";
import styles from "./ManifestReviewPage.module.css";

export const dynamic = "force-dynamic";

function qaFixtureEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.SANCTRA_MANIFEST_REVIEW_QA_FIXTURE === "1";
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

function ReviewStatePills({ states }: { states: Record<string, number> }) {
  const entries = Object.entries(states);
  if (!entries.length) return <span className={styles.pill}>no file states</span>;
  return (
    <div className={styles.pillRow}>
      {entries.map(([state, count]) => <span key={state} className={styles.statePill}>{state}: {count}</span>)}
    </div>
  );
}

function SlotDecisionForm({ manifest, slot }: { manifest: ManifestReviewSummary; slot: ManifestReviewSummary["file_slots"][number] }) {
  const disabled = slot.review_state === "manifest_eligible" || slot.review_state === "rejected";
  return (
    <form className={styles.decisionForm} action="/api/admin/manifest-review" method="post">
      <input type="hidden" name="manifest_object" value={manifest.manifest_object} />
      <input type="hidden" name="slot_id" value={slot.slot_id} />
      <input type="hidden" name="entry_generation" value={manifest.object_generation || ""} />
      <input type="hidden" name="ledger_generation" value={manifest.ledger_generation || ""} />
      <label>
        <span>Decision reason</span>
        <textarea
          name="reason"
          rows={2}
          required
          minLength={6}
          placeholder="Record metadata-only reviewer/admin rationale"
          disabled={disabled}
        />
      </label>
      <div className={styles.actionRow}>
        <button type="submit" name="action" value="reviewer_approve" disabled={disabled}>Approve</button>
        <button type="submit" name="action" value="reviewer_request_changes" disabled={disabled}>Changes</button>
        <button type="submit" name="action" value="reviewer_quarantine" disabled={disabled}>Quarantine</button>
        <button type="submit" name="action" value="reviewer_reject" disabled={disabled}>Reject</button>
        <button type="submit" name="action" value="admin_confirm_manifest_eligible" disabled={disabled || slot.review_state !== "review_approved"}>Admin confirm</button>
      </div>
    </form>
  );
}

function ManifestCard({ manifest }: { manifest: ManifestReviewSummary }) {
  return (
    <article className={styles.manifestCard}>
      <div className={styles.manifestHeader}>
        <div>
          <p className={styles.kicker}>{manifest.lane}</p>
          <h2>{manifest.subject_display_name}</h2>
          <p className={styles.subtitle}>{manifest.intake_id}</p>
        </div>
        <div className={styles.pillRow}>
          {manifest.modalities.map((modality) => <span key={modality} className={styles.pill}>{modality}</span>)}
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}><span>Submission state</span><strong>{manifest.pilot_submission_state}</strong></div>
        <div className={styles.metaItem}><span>Submitted</span><strong>{formatDate(manifest.server_received_at || manifest.created_at)}</strong></div>
        <div className={styles.metaItem}><span>Submitter</span><strong>{manifest.submitter_display_name || "Unknown"} · {manifest.submitter_role || "role unknown"}</strong></div>
        <div className={styles.metaItem}><span>Subject ref</span><code>{manifest.subject_ref || "not recorded"}</code></div>
        <div className={styles.metaItem}><span>Storage root</span><code>{manifest.storage_root}</code></div>
        <div className={styles.metaItem}><span>Manifest URI</span><code>{manifest.manifest_uri}</code></div>
        <div className={styles.metaItem}><span>Ledger object</span><code>{manifest.ledger_object}</code></div>
        <div className={styles.metaItem}><span>Ledger generation</span><code>{manifest.ledger_generation || "not created"}</code></div>
      </div>

      <section>
        <p className={styles.kicker}>Review states</p>
        <ReviewStatePills states={manifest.review_states} />
      </section>

      <section className={styles.controlNotice}>
        <strong>Admin confirmation gate</strong>
        <p>High-presence manifest eligibility requires a separate admin from the reviewer decision actor. Two-person control remains enforced before any manifest can become eligible; training, provider calls, publish, release, and derived dataset actions remain disabled.</p>
      </section>

      <section className={styles.slotTable} aria-label={`${manifest.intake_id} file slots`}>
        <table>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Modality</th>
              <th>Review state</th>
              <th>Original file</th>
              <th>Size</th>
              <th>Storage metadata</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {manifest.file_slots.map((slot) => (
              <tr key={`${slot.slot_id}:${slot.storage_uri}`}>
                <td data-label="Slot"><strong>{slot.slot_id}</strong></td>
                <td data-label="Modality">{slot.modality}</td>
                <td data-label="Review state">{slot.review_state}</td>
                <td data-label="Original file">{slot.original_filename || "not recorded"}</td>
                <td data-label="Size">{slot.size_bytes === null ? "not recorded" : `${slot.size_bytes.toLocaleString()} bytes`}</td>
                <td data-label="Storage metadata">
                  <div className={styles.mono}>{slot.storage_uri || slot.gcs_object || "not recorded"}</div>
                  {slot.training_allowed === false && <span className={styles.offPill}>training off</span>}{" "}
                  {slot.derived_dataset_ready === false && <span className={styles.offPill}>derived dataset off</span>}
                  {slot.last_reviewed_by && <div className={styles.mono}>reviewer: {slot.last_reviewed_by}</div>}
                  {slot.last_admin_confirmed_by && <div className={styles.mono}>admin: {slot.last_admin_confirmed_by}</div>}
                </td>
                <td data-label="Decision"><SlotDecisionForm manifest={manifest} slot={slot} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <p className={styles.kicker}>Blocked operations</p>
        <div className={styles.pillRow}>
          {manifest.blocked_operations.map((operation) => <span key={operation} className={styles.blockedPill}>{operation}</span>)}
        </div>
      </section>

      <section className={styles.gateGrid}>
        <div className={styles.metaItem}><span>Audit events</span><strong>{manifest.audit_summary.count}</strong></div>
        <div className={styles.metaItem}><span>Latest event</span><strong>{manifest.audit_summary.latest_event || "none"}</strong></div>
        <div className={styles.metaItem}><span>Latest actor role</span><strong>{manifest.audit_summary.latest_actor_role || "none"}</strong></div>
        <div className={styles.metaItem}><span>Manifest object</span><code>{manifest.manifest_object}</code></div>
      </section>
    </article>
  );
}

export default async function ManifestReviewPage({ searchParams }: { searchParams?: { qa_state?: string } }) {
  let result: Awaited<ReturnType<typeof listPilotManifestReviews>> | null = null;
  let error: string | null = null;
  const showQaConflictState = qaFixtureEnabled() && searchParams?.qa_state === "conflict";
  try {
    result = await listPilotManifestReviews();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Manifest review listing failed.";
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Pilot corpus control</p>
          <h1 className={styles.title}>Manifest review</h1>
          <p className={styles.subtitle}>Metadata-only intake browser for pilot manifests under the private corpus bucket. Raw corpus bodies, media previews, signed URLs, provider calls, training, and publish actions stay outside this console.</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/">Session</Link>
          <Link href="/dataset">Dataset intake</Link>
          <Link href="/curate">Curate</Link>
        </nav>
      </header>

      {error && <section className={styles.error}><strong>Manifest listing unavailable</strong><p>{error}</p></section>}
      {showQaConflictState && (
        <section className={styles.error}>
          <strong>Deterministic QA conflict state</strong>
          <p>Review ledger generation changed; refresh before retrying. This local/dev-only fixture state exercises the same optimistic-concurrency message without touching live GCS data.</p>
        </section>
      )}

      {result && (
        <>
          <section className={styles.summaryGrid} aria-label="Manifest review summary">
            <div className={styles.summaryBox}><span>Manifests</span><strong>{result.manifest_count}</strong></div>
            <div className={styles.summaryBox}><span>Bucket</span><strong>{result.bucket}</strong></div>
            <div className={styles.summaryBox}><span>Prefix</span><strong>{result.prefix}</strong></div>
            <div className={styles.summaryBox}><span>Generated</span><strong>{formatDate(result.generated_at)}</strong></div>
          </section>

          {result.manifests.length === 0 ? (
            <section className={styles.empty}>No pilot intake manifests were found at {result.storage_root}.</section>
          ) : (
            <section className={styles.manifestGrid} aria-label="Pilot intake manifests">
              {result.manifests.map((manifest) => <ManifestCard key={manifest.manifest_uri} manifest={manifest} />)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
