import assert from "node:assert/strict";
import { test } from "node:test";
import { isOwnBlobUrl } from "../lib/blob-url.ts";

const token = "vercel_blob_rw_AbC123_secret";
const own = "https://abc123.public.blob.vercel-storage.com/klipy/a.mp4";

test("accepts a file from our own store", () => {
  assert.equal(isOwnBlobUrl(own, token), true);
});

test("rejects every other address", () => {
  for (const url of [
    "https://other.public.blob.vercel-storage.com/klipy/a.mp4",
    "http://abc123.public.blob.vercel-storage.com/klipy/a.mp4",
    "https://abc123.public.blob.vercel-storage.com@evil.example/a.mp4",
    "https://abc123.public.blob.vercel-storage.com.evil.example/a.mp4",
    "https://abc123.public.blob.vercel-storage.com/reely/reel.mp4",
    "https://abc123.public.blob.vercel-storage.com/klipy/../reely/reel.mp4",
    "file:///etc/passwd",
    "nie je adresa",
    null,
    42,
  ]) {
    assert.equal(isOwnBlobUrl(url, token), false, String(url));
  }
});

test("rejects everything when the token is missing", () => {
  assert.equal(isOwnBlobUrl(own, undefined), false);
});
