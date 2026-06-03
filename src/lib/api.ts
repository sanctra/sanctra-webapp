import type {
  FeedbackResponse,
  InteractionProfile,
  InteractionSession,
  Modality,
  TurnResponse,
} from "./interaction";
import { defaultPackageId } from "./interaction";

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

const ORCH_HTTP = process.env.NEXT_PUBLIC_ORCHESTRATOR_HTTP;
const SSE_PATH = process.env.NEXT_PUBLIC_SSE_PATH || "/turn/events";
const DEFAULT_PERSON_ID = process.env.NEXT_PUBLIC_PERSON_ID || "default_person";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}

export async function getInteractionProfile(
  packageId: string = defaultPackageId,
): Promise<InteractionProfile> {
  return fetchJson<InteractionProfile>(`/api/packages/${encodeURIComponent(packageId)}/interaction-profile`);
}

export async function startInteractionSession(
  packageId: string = defaultPackageId,
): Promise<InteractionSession> {
  return fetchJson<InteractionSession>("/api/interaction-sessions", {
    method: "POST",
    body: JSON.stringify({ package_id: packageId }),
  });
}

export async function sendInteractionTurn(
  sessionId: string,
  text: string,
  modality: Modality = "text",
): Promise<TurnResponse> {
  return fetchJson<TurnResponse>(`/api/interaction-sessions/${encodeURIComponent(sessionId)}/turns`, {
    method: "POST",
    body: JSON.stringify({ text, modality }),
  });
}

export async function sendInteractionFeedback(
  sessionId: string,
  category: string,
  note: string,
): Promise<FeedbackResponse> {
  return fetchJson<FeedbackResponse>(`/api/interaction-sessions/${encodeURIComponent(sessionId)}/feedback`, {
    method: "POST",
    body: JSON.stringify({ category, note }),
  });
}

export async function startSession(personId: string = DEFAULT_PERSON_ID): Promise<StartSessionResponse> {
  if (!ORCH_HTTP) {
    const session = await startInteractionSession(defaultPackageId);
    return { session_id: session.session_id };
  }
  return fetchJson<StartSessionResponse>(`${ORCH_HTTP}/session/start`, {
    method: "POST",
    body: JSON.stringify({ person_id: personId }),
  });
}

export function sseUrl(sessionId: string) {
  if (!ORCH_HTTP) return `/api/interaction-sessions/${encodeURIComponent(sessionId)}/events`;
  return `${ORCH_HTTP}${SSE_PATH}?session_id=${encodeURIComponent(sessionId)}`;
}

export function openEvents(sessionId: string, onEvent: (event: TurnEvent) => void): EventSource | null {
  if (!ORCH_HTTP) return null;
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
  if (!ORCH_HTTP) return sendInteractionTurn(sessionId, text, "text");
  return fetchJson(`${ORCH_HTTP}/turn`, {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, person_id: personId, text }),
  });
}

export const sendText = sendTextTurn;
export const defaultPersonId = DEFAULT_PERSON_ID;
