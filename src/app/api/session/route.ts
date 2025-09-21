import { NextResponse } from "next/server";

export async function POST() {
  const base = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP;
  if (!base) return NextResponse.json({ error: "missing orchestrator" }, { status: 500 });
  const res = await fetch(`${base}/session/start`, { method: "POST" });
  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json({ error: t || "failed" }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
