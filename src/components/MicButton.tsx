"use client";

import { useState } from "react";

export default function MicButton({ onToggle, disabled }: { onToggle: (on: boolean) => void; disabled?: boolean }) {
  const [active, setActive] = useState(false);
  return (
    <button
      disabled={disabled}
      onClick={() => { const next = !active; setActive(next); onToggle(next); }}
      className={`px-3 py-1 border rounded ${active ? "bg-red-600 text-white" : "bg-gray-100"}`}
      aria-pressed={active}
    >
      {active ? "Stop Mic" : "Start Mic"}
    </button>
  );
}
