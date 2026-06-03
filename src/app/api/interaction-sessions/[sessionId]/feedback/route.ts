import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const body = await req.json().catch(() => ({}));
  const category = typeof body.category === "string" ? body.category : "family_review";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!note) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  return NextResponse.json({
    feedback_id: `feedback_${Date.now().toString(36)}`,
    interaction_session_id: params.sessionId,
    category,
    status: "recorded_for_review",
  });
}
