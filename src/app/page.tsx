"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getInteractionProfile,
  sendInteractionFeedback,
  sendInteractionTurn,
  startInteractionSession,
} from "@/lib/api";
import { defaultPackageId, type InteractionProfile, type Modality } from "@/lib/interaction";
import styles from "./InteractionShell.module.css";

type Message = { role: "user" | "agent"; text: string };

const initialMessages: Message[] = [
  {
    role: "agent",
    text: "This private interaction is approved for text and static imagery. Voice and video are reserved for later adapter readiness.",
  },
];

export default function HomePage() {
  const [profile, setProfile] = useState<InteractionProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("Preparing approved package profile");
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const nextProfile = await getInteractionProfile(defaultPackageId);
      const session = await startInteractionSession(nextProfile.package_id);
      setProfile(nextProfile);
      setSessionId(session.session_id);
      setStatus("Private text session ready");
      setEvents([
        "session_started",
        `allowed_modalities:${nextProfile.allowed_modalities.join(",")}`,
        `deferred_modalities:${nextProfile.deferred_modalities.join(",")}`,
      ]);
    })().catch((error) => {
      setStatus(`Session setup failed: ${error instanceof Error ? error.message : "unknown error"}`);
    });
  }, []);

  const sendTurn = async (modality: Modality = "text") => {
    if (!sessionId || !input.trim()) return;
    const text = input.trim();
    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    const response = await sendInteractionTurn(sessionId, text, modality);
    setMessages((current) => [...current, { role: "agent", text: response.text }]);
    setEvents((current) => [
      response.type,
      `requested_modality:${response.requested_modality}`,
      ...current,
    ].slice(0, 6));
  };

  const submitFeedback = async () => {
    if (!sessionId || !feedback.trim()) return;
    await sendInteractionFeedback(sessionId, "family_review", feedback.trim());
    setFeedback("");
    setEvents((current) => ["feedback_requested", "family_review_recorded", ...current].slice(0, 6));
  };

  const title = profile?.subject_display_name ?? "Approved avatar package";

  return (
    <main className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Completed-avatar interaction app</p>
            <h1>Private session with {title}</h1>
            <p className={styles.muted}>{status}</p>
          </div>
          <nav className={styles.nav} aria-label="Sanctra surfaces">
            <Link href="/curate">Guided curation</Link>
            <Link href="/dataset">Dataset intake</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </header>

        <section className={styles.grid}>
          <div>
            <section className={styles.profilePanel} aria-label="Package profile">
              <div>
                <p className={styles.label}>Package readiness</p>
                <h2>{profile?.status.replaceAll("_", " ") ?? "Loading"}</h2>
              </div>
              <div className={styles.statusRow}>
                {profile?.disclosure_labels.map((label) => <span className={styles.pill} key={label}>{label}</span>)}
              </div>
              <div className={styles.modalityRow}>
                {profile?.allowed_modalities.map((mode) => <span className={styles.pill} key={mode}>{mode} enabled</span>)}
                {profile?.deferred_modalities.map((mode) => <span className={styles.deferred} key={mode}>{mode} deferred</span>)}
              </div>
            </section>

            <section className={styles.workspace}>
              <div className={styles.panel}>
                <h2>Text interaction</h2>
                <p className={styles.muted}>
                  Turns use the interaction-session contract and stay clear of raw corpus ingestion.
                </p>
                <div className={styles.conversation} aria-live="polite">
                  {messages.map((message, index) => (
                    <div
                      className={`${styles.message} ${message.role === "user" ? styles.user : styles.agent}`}
                      key={`${message.role}-${index}`}
                    >
                      {message.text}
                    </div>
                  ))}
                </div>
                <form
                  className={styles.composer}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendTurn("text");
                  }}
                >
                  <input
                    aria-label="Message"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask a private, family-reviewed question"
                  />
                  <button type="submit" disabled={!sessionId}>Send</button>
                </form>
              </div>

              <aside className={styles.avatarPanel}>
                <h2>Avatar presentation</h2>
                <div className={styles.avatarBox} aria-label="Approved static avatar presentation">
                  <div className={styles.avatarInitials}>EG</div>
                </div>
                <p className={styles.note}>
                  Static presentation is available now. Speech-to-speech and full-motion video remain adapter seams.
                </p>
                <div className={styles.modalityRow}>
                  <button className={styles.modeButton} type="button" disabled>Mic capture reserved</button>
                  <button className={styles.modeButton} type="button" disabled>Video output reserved</button>
                </div>
              </aside>
            </section>
          </div>

          <aside>
            <section className={styles.panel}>
              <h2>Event boundary</h2>
              <p className={styles.muted}>Normalized turn-service events for the current session.</p>
              {events.map((event) => <div className={styles.eventLine} key={event}>{event}</div>)}
            </section>

            <section className={styles.reviewPanel}>
              <h2>Family review feedback</h2>
              <p className={styles.muted}>
                Corrections and discomfort flags are recorded as review feedback, not new corpus intake.
              </p>
              <div className={styles.feedbackForm}>
                <textarea
                  aria-label="Review feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Flag a correction or family review note"
                />
                <button type="button" onClick={() => void submitFeedback()} disabled={!sessionId}>
                  Record
                </button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
