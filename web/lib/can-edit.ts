import { headers } from "next/headers";
import { isAuthorized } from "./basic-auth";

// Only decides what a page shows; proxy.ts is what actually blocks writes.
export async function canEdit() {
  return isAuthorized((await headers()).get("authorization"), process.env.DEMO_PASSWORD);
}
