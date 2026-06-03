import { NextRequest, NextResponse } from "next/server";
import { buildLocalTurnResponse, type Modality } from "@/lib/interaction";

const modalities = new Set<Modality>(["text", "image", "voice", "video"]);

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const modality = modalities.has(body.modality) ? body.modality : "text";

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP;
  if (base && modality === "text") {
    const res = await fetch(`${base}/turn`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: params.sessionId,
        person_id: body.person_id ?? process.env.NEXT_PUBLIC_PERSON_ID ?? "default_person",
        text,
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        turn_id: data.turn_id ?? `turn_${Date.now().toString(36)}`,
        interaction_session_id: params.sessionId,
        type: "agent_text",
        text: data.text ?? data.message ?? "Turn accepted by orchestrator.",
        requested_modality: "text",
        available_modalities: ["text", "image"],
        deferred_modalities: ["voice", "video"],
      });
    }
  }

  return NextResponse.json(buildLocalTurnResponse(params.sessionId, text, modality));
}
