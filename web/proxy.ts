import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, needsPassword } from "@/lib/basic-auth";

// No matcher on purpose: every request passes here, so a write can never skip the password.
export function proxy(request: NextRequest) {
  if (
    !needsPassword(request.method, request.nextUrl.pathname) ||
    isAuthorized(request.headers.get("authorization"), process.env.DEMO_PASSWORD)
  ) {
    return NextResponse.next();
  }

  return new NextResponse("Vyžaduje sa heslo.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BrickByBrick", charset="UTF-8"' },
  });
}
