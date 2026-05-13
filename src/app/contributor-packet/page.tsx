"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./ContributorPacketPage.module.css";

type FieldKey =
  | "subjectIdentity"
  | "contributorIdentity"
  | "relationship"
  | "authorityBasis"
  | "identityConfidence"
  | "thirdPartyPrivacy"
  | "materialInventory"
  | "conflictNotes"
  | "reviewPreference";

type PacketDraft = Record<FieldKey, string> & {
  mockBoundary: boolean;
  noVerifiedAuthority: boolean;
  privacyReview: boolean;
};

type ChecklistItem = {
  key: FieldKey;
  label: string;
  prompt: string;
  rows?: number;
  reviewerNote: string;
};

const storageKey = "sanctra-demo-family-contributor-packets";

const initialDraft: PacketDraft = {
  subjectIdentity: "",
  contributorIdentity: "",
  relationship: "",
  authorityBasis: "",
  identityConfidence: "",
  thirdPartyPrivacy: "",
  materialInventory: "",
  conflictNotes: "",
  reviewPreference: "",
  mockBoundary: false,
  noVerifiedAuthority: false,
  privacyReview: false,
};

const checklist: ChecklistItem[] = [
  {
    key: "subjectIdentity",
    label: "Subject identity and memorial posture",
    prompt: "Preferred/legal names, relevant dates if appropriate, how the subject should be referred to, and whether this is posthumous/archive-only.",
    rows: 3,
    reviewerNote: "Reviewer queue receives identity metadata only; no raw media preview is exposed from this mock page.",
  },
  {
    key: "contributorIdentity",
    label: "Contributor identity",
    prompt: "Contributor name, contact path, and whether they are family, executor, guardian, caregiver, or another authorized helper.",
    rows: 3,
    reviewerNote: "Contact is preparation metadata for review routing; this route does not send email, SMS, or invite links.",
  },
  {
    key: "relationship",
    label: "Relationship and proximity",
    prompt: "Relationship to the subject, how close/recent the relationship was, and who else may need notice before use.",
    rows: 3,
    reviewerNote: "Relationship context is first-class because authority and conflict risk depend on it.",
  },
  {
    key: "authorityBasis",
    label: "Authority basis",
    prompt: "Plain-language basis for contributing: executor role, family consensus, subject prior consent, guardianship, estate permission, or unknown/pending.",
    rows: 4,
    reviewerNote: "Sanctra cannot treat this as verified authority until a later custody/authority review exists.",
  },
  {
    key: "identityConfidence",
    label: "Subject identity confidence",
    prompt: "Why the contributor believes the materials belong to the subject: filenames, dates, context, witnesses, known voice/face, document provenance, or uncertainty.",
    rows: 4,
    reviewerNote: "Low confidence should quarantine downstream likeness, voice, and training actions.",
  },
  {
    key: "thirdPartyPrivacy",
    label: "Third-party and private-person flags",
    prompt: "Names, faces, voices, minors, medical/financial/legal details, other family members, or bystanders appearing in the materials.",
    rows: 4,
    reviewerNote: "Third-party privacy review remains visible before readiness, import, or artifact generation.",
  },
  {
    key: "materialInventory",
    label: "Material inventory checklist",
    prompt: "List text, audio, images, video, documents, dates, approximate volume, custody/source, and anything excluded from use.",
    rows: 5,
    reviewerNote: "This is inventory only. There are no file inputs, uploads, previews, storage writes, or provider calls.",
  },
  {
    key: "conflictNotes",
    label: "Known conflicts, restrictions, or takedown concerns",
    prompt: "Family disagreement, disputed estate authority, sensitive relationships, cultural/religious boundaries, revocation paths, or unresolved consent questions.",
    rows: 4,
    reviewerNote: "Any conflict should hold the packet in needs-review/quarantine until resolved by humans.",
  },
  {
    key: "reviewPreference",
    label: "Family review contact preference",
    prompt: "Preferred reviewer contact cadence, who can approve corrections, who can request takedown, and who should not receive materials.",
    rows: 3,
    reviewerNote: "This prepares a reviewer handoff only; contributor-specific permissions are out of scope here.",
  },
];

function completeFields(draft: PacketDraft) {
  return checklist.filter((item) => draft[item.key].trim()).length;
}

function PacketField({ item, value, onChange }: { item: ChecklistItem; value: string; onChange: (key: FieldKey, value: string) => void }) {
  return (
    <label className={styles.field} htmlFor={item.key}>
      <span className={styles.fieldLabel}>{item.label}</span>
      <textarea
        id={item.key}
        className={styles.input}
        rows={item.rows ?? 3}
        value={value}
        onChange={(event) => onChange(item.key, event.target.value)}
        placeholder={item.prompt}
      />
      <span className={styles.reviewerNote}>{item.reviewerNote}</span>
    </label>
  );
}

export default function ContributorPacketPage() {
  const [draft, setDraft] = useState<PacketDraft>(initialDraft);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fieldCount = useMemo(() => completeFields(draft), [draft]);
  const complete = fieldCount === checklist.length && draft.mockBoundary && draft.noVerifiedAuthority && draft.privacyReview;

  const update = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSavedId(null);
  };

  const toggle = (key: "mockBoundary" | "noVerifiedAuthority" | "privacyReview", value: boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSavedId(null);
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete) return;

    const packet = {
      id: `family-packet-${Date.now()}`,
      lane: "posthumous_archive_family_contributor_mock",
      createdAt: new Date().toISOString(),
      reviewState: "needs_review",
      readiness: {
        identity: Boolean(draft.subjectIdentity.trim() && draft.identityConfidence.trim()),
        authority: "unverified_mock_only",
        privacy: "third_party_review_required",
        materials: "inventory_only_no_upload",
      },
      fields: draft,
      persistence: "localStorage mock only; no invite, upload, account, message, storage, or provider call was made",
    };

    const existing = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as unknown[];
    window.localStorage.setItem(storageKey, JSON.stringify([packet, ...existing].slice(0, 10), null, 2));
    setSavedId(packet.id);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Mock family contributor seam</p>
          <h1>Prepare a posthumous archive packet for review</h1>
          <p className={styles.subtitle}>
            This local-only page shows what Sanctra needs from a family member or authorized contributor before a packet can enter reviewer readiness. It does not verify authority, invite users, upload files, preview media, create accounts, or call providers.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Contributor packet navigation">
          <Link href="/dataset">Dataset intake</Link>
          <Link href="/admin/manifest-review">Reviewer queue concept</Link>
          <Link href="/">Session</Link>
        </nav>
      </header>

      <section className={styles.boundary} aria-labelledby="boundary-title">
        <div>
          <p className={styles.kicker}>Preparation boundary</p>
          <h2 id="boundary-title">Mock/local state only</h2>
          <p>
            The packet below creates structured browser-local preparation metadata under <code>{storageKey}</code>. Real contributor invitations, messaging, custody verification, storage uploads, contributor-specific permissions, and external sharing links require Axiom/privacy review first.
          </p>
        </div>
        <div className={styles.statusStack} aria-label="Packet readiness summary">
          <span className={`${styles.chip} ${fieldCount === checklist.length ? styles.ready : styles.warn}`}>{fieldCount}/{checklist.length} packet fields</span>
          <span className={`${styles.chip} ${draft.mockBoundary ? styles.ready : styles.warn}`}>mock boundary acknowledged</span>
          <span className={`${styles.chip} ${draft.privacyReview ? styles.ready : styles.danger}`}>third-party privacy visible</span>
        </div>
      </section>

      <section className={styles.grid}>
        <form className={styles.card} onSubmit={save}>
          <h2>Contributor packet checklist</h2>
          <p className={styles.subtitle}>
            Authority, conflict, privacy, and inventory details are required fields rather than freeform afterthoughts so reviewer readiness can be evaluated before any raw data work.
          </p>

          {checklist.map((item) => (
            <PacketField key={item.key} item={item} value={draft[item.key]} onChange={update} />
          ))}

          <div className={styles.confirmations}>
            <label>
              <input type="checkbox" checked={draft.mockBoundary} onChange={(event) => toggle("mockBoundary", event.target.checked)} />
              <span>I understand this is a mocked local preparation seam only, not an invite or upload flow.</span>
            </label>
            <label>
              <input type="checkbox" checked={draft.noVerifiedAuthority} onChange={(event) => toggle("noVerifiedAuthority", event.target.checked)} />
              <span>I understand Sanctra has not verified contributor authority or custody from this packet.</span>
            </label>
            <label>
              <input type="checkbox" checked={draft.privacyReview} onChange={(event) => toggle("privacyReview", event.target.checked)} />
              <span>I understand third-party privacy review is required before import, training, or artifact generation.</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" disabled={!complete}>Save mock contributor packet</button>
            <span className={`${styles.chip} ${complete ? styles.ready : styles.warn}`}>{complete ? "Ready for reviewer handoff" : "Preparation incomplete"}</span>
          </div>

          {savedId && (
            <p className={styles.notice} role="status">
              <strong>Mock packet saved:</strong> {savedId}. The packet is localStorage-only and should be treated as <em>needs_review</em> until a human reviewer resolves authority, identity confidence, and third-party privacy concerns.
            </p>
          )}
        </form>

        <aside className={styles.card}>
          <h2>Reviewer handoff concepts</h2>
          <p className={styles.subtitle}>
            The saved packet is designed to line up with the private manifest reviewer queue without exposing raw data.
          </p>
          <div className={styles.handoffGrid}>
            <article>
              <h3>Readiness gates</h3>
              <ul>
                <li>Identity confidence is explicit and can hold the packet in review.</li>
                <li>Authority basis is recorded but remains unverified.</li>
                <li>Third-party privacy and private-person flags stay visible.</li>
                <li>Materials are inventory-only until controlled storage exists.</li>
              </ul>
            </article>
            <article>
              <h3>Blocked operations</h3>
              <ul>
                <li>No training or derived model work from this mock packet.</li>
                <li>No voice/video/avatar generation from unresolved materials.</li>
                <li>No external sharing or contributor-specific permission grants.</li>
                <li>No raw media download, preview, signed URL, or provider call.</li>
              </ul>
            </article>
            <article>
              <h3>Safe next action</h3>
              <p>
                A reviewer can use this packet to decide whether the future manifest should be staged, quarantined, approved with limits, or rejected before any controlled-storage import is considered.
              </p>
            </article>
          </div>
        </aside>
      </section>
    </main>
  );
}
