export type StartSessionResponse = {
  session_id: string;
  live_api_token?: string;
  orchestrator_ws?: string;
};

export type TurnEvent = {
  type?: string;
  event?: string;
  text?: string;
  data?: string;
  url?: string;
};

const ORCH_HTTP = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP!;
const SSE_PATH = process.env.NEXT_PUBLIC_SSE_PATH || "/turn/events";
const DEFAULT_PERSON_ID = process.env.NEXT_PUBLIC_PERSON_ID || "default_person";

export async function startSession(personId: string = DEFAULT_PERSON_ID): Promise<StartSessionResponse> {
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

export function openEvents(sessionId: string, onEvent: (event: TurnEvent) => void): EventSource {
  const source = new EventSource(sseUrl(sessionId));
  const handle = (event: MessageEvent) => {
    onEvent({ type: event.type, event: event.type, data: event.data, text: event.data, url: event.data });
  };
  source.addEventListener("interim", handle);
  source.addEventListener("agent_text", handle);
  source.addEventListener("wav_url", handle);
  source.addEventListener("video_url", handle);
  source.addEventListener("error", handle);
  return source;
}

export async function sendTextTurn(
  sessionId: string,
  text: string,
  personId: string = DEFAULT_PERSON_ID,
) {
  const res = await fetch(`${ORCH_HTTP}/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, person_id: personId, text }),
  });
  if (!res.ok) throw new Error(`turn failed: ${res.status}`);
  return res.json();
}

export const sendText = sendTextTurn;
export const defaultPersonId = DEFAULT_PERSON_ID;
