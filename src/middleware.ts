import { NextRequest, NextResponse } from "next/server";
import { getPilotActorFromHeaders, pilotReadRoles } from "@/lib/pilotAccessBoundary";

const protectedPilotRoutes = [
  "/curate",
  "/dataset",
  "/upload",
  "/admin/manifest-review",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPilotRoute = protectedPilotRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!isProtectedPilotRoute) return NextResponse.next();

  const actor = getPilotActorFromHeaders(request.headers);
  if (!actor || !pilotReadRoles.has(actor.role)) {
    return NextResponse.json(
      { ok: false, error: "Pilot admin, reviewer, or operator-readonly access is required." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/curate/:path*", "/dataset/:path*", "/upload/:path*", "/admin/manifest-review/:path*"],
};
