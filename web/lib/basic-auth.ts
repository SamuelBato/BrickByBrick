import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Visitors may look at pages; every write, the API and the login page need the password.
export function needsPassword(method: string, pathname: string) {
  const reading = method === "GET" || method === "HEAD";
  return !reading || pathname.startsWith("/api/") || pathname === "/prihlasenie";
}

// Fails closed: without a configured password nobody gets in.
export function isAuthorized(header: string | null, password: string | undefined) {
  if (!password || !header?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;

  // Hashing gives equal lengths, which timingSafeEqual requires. The username is ignored.
  return timingSafeEqual(sha256(decoded.slice(colon + 1)), sha256(password));
}
