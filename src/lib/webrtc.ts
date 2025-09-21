export async function openMicStream(sessionId: string): Promise<WebSocket> {
  const wsBase = process.env.NEXT_PUBLIC_ORCHESTRATOR_WS;
  if (!wsBase) throw new Error("Missing NEXT_PUBLIC_ORCHESTRATOR_WS");
  const ws = new WebSocket(`${wsBase}/turn/stream?session_id=${encodeURIComponent(sessionId)}`);

  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 48000 }, video: false });
  const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 128000 });

  mediaRecorder.ondataavailable = async (e) => {
    if (e.data && e.data.size > 0 && ws.readyState === ws.OPEN) {
      const buf = await e.data.arrayBuffer();
      ws.send(buf); // server must accept binary frames
    }
  };
  mediaRecorder.start(250); // chunk every 250ms

  ws.addEventListener("close", () => {
    if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    stream.getTracks().forEach(t => t.stop());
  });

  return ws;
}
