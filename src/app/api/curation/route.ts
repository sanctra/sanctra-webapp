import { NextRequest, NextResponse } from "next/server";
import { persistSanctraCapture } from "../../../lib/sanctraStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSteps = new Set(["text", "audio", "image", "video"]);

type CaptureBody = {
  lane?: unknown;
  promptId?: unknown;
  step?: unknown;
  title?: unknown;
  prompt?: unknown;
  responseText?: unknown;
  privacy?: unknown;
  status?: unknown;
  file?: { fileName: string; contentType: string; bytes: Buffer };
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function parseBody(req: NextRequest): Promise<CaptureBody | null> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    const file = form.get("file");
    let attachment: CaptureBody["file"];
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const upload = file as File;
      const bytes = Buffer.from(await upload.arrayBuffer());
      if (bytes.byteLength > 0) {
        attachment = {
          fileName: upload.name || "curation-capture.bin",
          contentType: upload.type || "application/octet-stream",
          bytes,
        };
      }
    }
    return {
      lane: form.get("lane"),
      promptId: form.get("promptId"),
      step: form.get("step"),
      title: form.get("title"),
      prompt: form.get("prompt"),
      responseText: form.get("responseText"),
      privacy: form.get("privacy"),
      status: form.get("status"),
      file: attachment,
    };
  }
  return await req.json().catch(() => null) as CaptureBody | null;
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const lane = body.lane;
  const promptId = stringValue(body.promptId);
  const step = stringValue(body.step);
  const responseText = stringValue(body.responseText);
  if (lane !== "self" && lane !== "family") return NextResponse.json({ error: "invalid_curation_capture", detail: "lane must be self or family" }, { status: 400 });
  if (!promptId) return NextResponse.json({ error: "invalid_curation_capture", detail: "promptId is required" }, { status: 400 });
  if (!allowedSteps.has(step)) return NextResponse.json({ error: "invalid_curation_capture", detail: "step must be text/audio/image/video" }, { status: 400 });
  if (!responseText && !body.file) return NextResponse.json({ error: "invalid_curation_capture", detail: "responseText or file is required" }, { status: 400 });

  const record = await persistSanctraCapture({
    lane,
    promptId,
    step: step as "text" | "audio" | "image" | "video",
    attachment: body.file,
    payload: {
      lane,
      promptId,
      step,
      title: body.title,
      prompt: body.prompt,
      responseText,
      media: body.file ? {
        fileName: body.file.fileName,
        contentType: body.file.contentType,
        sizeBytes: body.file.bytes.byteLength,
      } : null,
      consent: {
        capturedUnderGuidedCuration: true,
        authorityLane: lane,
        reuseScope: body.privacy || "private",
      },
      provenance: {
        capturedBy: "sanctra-webapp/curate",
        capturedAt: new Date().toISOString(),
        promptStatusAtCapture: body.status,
      },
      review: { status: "submitted_for_review", reviewerRequired: true },
    },
  });

  return NextResponse.json({
    id: record.id,
    kind: record.kind,
    lane: record.lane,
    promptId,
    step,
    createdAt: record.createdAt,
    storageRef: record.storageRef,
    attachmentStorageRef: record.attachment?.storageRef ?? null,
    reviewStatus: "submitted_for_review",
    reviewableLocation: record.storageRef.uri,
  }, { status: 201 });
}
