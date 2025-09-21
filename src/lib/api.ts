export type StartSessionResponse = {
  session_id: string;
  live_api_token?: string;
  orchestrator_ws?: string;
};

const ORCH_HTTP = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP!;
const SSE_PATH = process.env.NEXT_PUBLIC_SSE_PATH || "/turn/events";

export async function startSession(personId: string): Promise<StartSessionResponse> {
  const res = await fetch(`${ORCH_HTTP}/session/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ person_id: personId }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.status}`);
  return res.json();
}

export function sseUrl(sessionId: string) {
  return `${ORCH_HTTP}${SSE_PATH}?session_id=${encodeURIComponent(sessionId)}`;
}

export async function sendTextTurn(sessionId: string, text: string) {
  const res = await fetch(`${ORCH_HTTP}/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, text }),
  });
  if (!res.ok) throw new Error(`turn failed: ${res.status}`);
  return res.json();
}
