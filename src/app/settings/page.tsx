"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [persona, setPersona] = useState<string>("default");

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <label className="block mb-2 text-sm">Persona</label>
      <select
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="default">Default</option>
        <option value="compassionate">Compassionate</option>
        <option value="concise">Concise</option>
      </select>
      <p className="text-sm text-gray-600 mt-3">
        Persona selection will be sent with session/turn requests in a future step.
      </p>
    </main>
  );
}
