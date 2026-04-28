import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP;
  if (!base) return NextResponse.json({ error: "missing orchestrator" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const personId = body.person_id ?? body.personId ?? "default_person";

  const res = await fetch(`${base}/session/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ person_id: personId }),
  });
  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json({ error: t || "failed" }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
