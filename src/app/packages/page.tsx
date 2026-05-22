import Link from "next/link";
import { consultantPackage, packagePhases, privateSurfaceRules } from "@/lib/packageControl";
import styles from "./PackageControlPage.module.css";

function stateClass(state: string) {
  if (state === "ready") return styles.ready;
  if (state === "blocked") return styles.blocked;
  if (state === "future") return styles.future;
  return styles.waiting;
}

export default function PackageControlPage() {
  const currentPhaseIndex = packagePhases.findIndex((phase) => phase.phase === consultantPackage.phase);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>White-glove package control</p>
          <h1>Consultant-led memorial package operations</h1>
          <p className={styles.subtitle}>
            A product-shaped control surface for selling and operating a consultant-led package while media generation remains represented by manifest refs, review gates, and future tier placeholders.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Sanctra package navigation">
          <Link href="/curate">Curation</Link>
          <Link href="/upload">Upload</Link>
          <Link href="/dataset">Dataset</Link>
          <Link href="/">Session</Link>
        </nav>
      </header>

      <section className={styles.workspace}>
        <section className={styles.panel} aria-label="Consultant package dashboard">
          <div className={styles.toolbar}>
            <div>
              <p className={styles.kicker}>{consultantPackage.tierCode}</p>
              <h2>{consultantPackage.title}</h2>
            </div>
            <span className={styles.statusPill}>{consultantPackage.consultant}</span>
          </div>

          <div className={styles.gateGrid}>
            {consultantPackage.gates.map((gate) => (
              <article className={styles.gate} key={gate.id}>
                <span className={`${styles.state} ${stateClass(gate.state)}`}>{gate.state}</span>
                <div>
                  <h3>{gate.label}</h3>
                  <p>{gate.adminDetail}</p>
                  <div className={styles.action}>Next human action: {gate.nextHumanAction}</div>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.artifactGrid} aria-label="Artifact expectations">
            {consultantPackage.artifactExpectations.map((artifact) => (
              <article className={styles.card} key={artifact.artifactClass}>
                <div className={styles.cardTopline}>
                  <span className={styles.modality}>{artifact.artifactClass}</span>
                  <span className={artifact.enabledNow ? styles.enabled : styles.disabled}>{artifact.enabledNow ? "modeled now" : "placeholder"}</span>
                </div>
                <h3>{artifact.label}</h3>
                <p>{artifact.tierCopy}</p>
                <p><strong>Expected output:</strong> {artifact.expectedFormat}</p>
                <p className={styles.ref}>{artifact.statusRef}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.clientPanel} aria-label="Client family status view">
          <p className={styles.kicker}>{consultantPackage.familyLabel}</p>
          <h2>Your memorial package status</h2>
          <p className={styles.subtitle}>
            Families see package progress, requested materials, review status, and approved artifact readiness without private corpus names, storage paths, provider receipts, or internal processing detail.
          </p>

          <div className={styles.phaseList}>
            {packagePhases.map((phase, index) => (
              <div className={styles.phase} key={phase.phase}>
                <strong>{index < currentPhaseIndex ? "Complete" : index === currentPhaseIndex ? "Current" : "Waiting"}</strong>
                <p>{phase.label}: {phase.description}</p>
              </div>
            ))}
          </div>

          <div className={styles.clientStatus}>
            {consultantPackage.gates.map((gate) => (
              <div key={gate.id}>
                <strong>{gate.safeLabel}</strong>
                <p>{gate.state === "blocked" ? "A consultant is resolving a review item before anything is released." : "No action is needed from the family on this item right now."}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.ruleBox} aria-label="Access and privacy rules">
          <h2>Surface rules</h2>
          <ul>
            {privateSurfaceRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </section>
      </section>
    </main>
  );
}
