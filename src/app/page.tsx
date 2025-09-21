"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MicButton from "@/components/MicButton";
import AudioPlayer from "@/components/AudioPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import { startSession, sendText, openEvents } from "@/lib/api";
import { openMicStream } from "@/lib/webrtc";

type Message = { role: "user" | "agent"; text: string };

export default function HomePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interim, setInterim] = useState<string>("");
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Start session on load
    (async () => {
      const s = await startSession();
      setSessionId(s.session_id);
      // Start SSE for events
      openEvents(s.session_id, (evt) => {
        if (evt.type === "interim") setInterim(evt.text ?? "");
        if (evt.type === "wav_url" && evt.url) setWavUrl(evt.url);
        if (evt.type === "video_url" && evt.url) setMp4Url(evt.url);
        if (evt.type === "agent_text" && evt.text) {
          setMessages((m) => [...m, { role: "agent", text: evt.text }]);
        }
      });
    })();
  }, []);

  const onToggleMic = async (on: boolean) => {
    if (!sessionId) return;
    if (on) {
      wsRef.current = await openMicStream(sessionId);
    } else {
      wsRef.current?.close();
      wsRef.current = null;
    }
  };

  const onSendText = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) return;
    const form = e.currentTarget;
    const input = form.elements.namedItem("text") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    input.value = "";
    await sendText(sessionId, text);
  };

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Sanctra</h1>
        <nav className="text-sm underline text-blue-700">
          <Link href="/settings">Settings</Link>
        </nav>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Chat</h2>
          <div className="space-y-2 h-64 overflow-auto border rounded p-2 bg-white">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span className="inline-block px-2 py-1 rounded bg-gray-100">{m.text}</span>
              </div>
            ))}
            {!!interim && <div className="text-gray-500 italic">{interim}</div>}
          </div>

          <form onSubmit={onSendText} className="mt-3 flex gap-2">
            <input name="text" className="flex-1 border rounded px-2 py-1" placeholder="Type a message..." />
            <button className="px-3 py-1 border rounded bg-blue-600 text-white">Send</button>
          </form>

          <div className="mt-3">
            <MicButton onToggle={onToggleMic} disabled={!sessionId} />
          </div>
          <div className="mt-3">
            <AudioPlayer src={wavUrl ?? undefined} />
          </div>
        </div>

        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Video</h2>
          <VideoPlayer src={mp4Url ?? undefined} />
        </div>
      </section>
    </main>
  );
}
