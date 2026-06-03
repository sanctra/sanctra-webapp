import { NextRequest, NextResponse } from "next/server";
import { buildInteractionSession, defaultPackageId } from "@/lib/interaction";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const packageId = typeof body.package_id === "string" ? body.package_id : defaultPackageId;
  return NextResponse.json(buildInteractionSession(packageId));
}
