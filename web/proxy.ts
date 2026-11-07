import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/basic-auth";

// No matcher on purpose: the whole app, static files included, stays behind the password.
export function proxy(request: NextRequest) {
  if (isAuthorized(request.headers.get("authorization"), process.env.DEMO_PASSWORD)) {
    return NextResponse.next();
  }

  return new NextResponse("Vyžaduje sa heslo.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BrickByBrick", charset="UTF-8"' },
  });
}
