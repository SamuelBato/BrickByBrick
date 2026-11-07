import { NextResponse } from "next/server";

// proxy.ts asks for the password on this address; the browser then sends it with every later request.
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/", request.url));
}
