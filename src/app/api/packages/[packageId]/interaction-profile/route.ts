import { NextResponse } from "next/server";
import { demoInteractionProfile } from "@/lib/interaction";

export async function GET(_req: Request, { params }: { params: { packageId: string } }) {
  return NextResponse.json({
    ...demoInteractionProfile,
    package_id: params.packageId || demoInteractionProfile.package_id,
  });
}
