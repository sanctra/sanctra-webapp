import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP;
  if (!base) return NextResponse.json({ error: "missing orchestrator" }, { status: 500 });
  const body = await req.json();
  const res = await fetch(`${base}/turn/text`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ raw: text }, { status: res.status });
  }
}
