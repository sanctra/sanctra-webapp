import { NextRequest, NextResponse } from "next/server";
import { persistSanctraRecord, storageRoot } from "../../../lib/sanctraStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lane = "self" | "family";
const requiredFields = ["subjectName", "submitterName", "relationship", "contact", "authority", "sourceMaterials", "contextNotes", "preferences"] as const;

function validate(body: Record<string, unknown>) {
  const fields = body.fields;
  if (body.lane !== "self" && body.lane !== "family") return "lane must be self or family";
  if (!fields || typeof fields !== "object") return "fields object is required";
  const packet = fields as Record<string, unknown>;
  for (const field of requiredFields) {
    if (typeof packet[field] !== "string" || !packet[field].trim()) return `${field} is required`;
  }
  if (packet.consent !== true) return "consent acknowledgement is required";
  if (packet.storage !== true) return "storage acknowledgement is required";
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  const validationError = validate(body);
  if (validationError) return NextResponse.json({ error: "invalid_dataset_submission", detail: validationError }, { status: 400 });

  const lane = body.lane as Lane;
  const fields = body.fields as Record<string, unknown>;
  const record = await persistSanctraRecord({
    kind: "dataset-submission",
    lane,
    prefix: `dataset-${lane}`,
    payload: {
      lane,
      fields,
      consent: {
        submitterAcknowledgedConsent: true,
        submitterAcknowledgedControlledStorage: true,
        authorityText: fields.authority,
      },
      provenance: {
        capturedBy: "sanctra-webapp/dataset",
        capturedAt: new Date().toISOString(),
        sourceMaterialsInventory: fields.sourceMaterials,
        relationship: fields.relationship,
        contact: fields.contact,
      },
      review: { status: "submitted_for_review", reviewerRequired: true },
    },
  });

  return NextResponse.json({
    id: record.id,
    kind: record.kind,
    lane: record.lane,
    createdAt: record.createdAt,
    storageRef: record.storageRef,
    reviewStatus: "submitted_for_review",
    reviewableLocation: record.storageRef.uri,
    storageRoot: storageRoot(),
  }, { status: 201 });
}
