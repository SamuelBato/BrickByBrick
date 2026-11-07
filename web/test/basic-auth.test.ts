import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorized, needsPassword } from "../lib/basic-auth.ts";

test("visitors may only read pages", () => {
  assert.equal(needsPassword("GET", "/"), false);
  assert.equal(needsPassword("HEAD", "/stavba/abc"), false);
  assert.equal(needsPassword("GET", "/_next/static/chunk.js"), false);
});

test("every write, the API and the login page need the password", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(needsPassword(method, "/stavba/abc"), true);
  }
  assert.equal(needsPassword("GET", "/api/render"), true);
  assert.equal(needsPassword("GET", "/prihlasenie"), true);
});

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString("base64")}`;

test("accepts the right password with any username", () => {
  assert.equal(isAuthorized(basic("majster:tajné:heslo"), "tajné:heslo"), true);
  assert.equal(isAuthorized(basic(":tajné"), "tajné"), true);
});

test("rejects a wrong or malformed credential", () => {
  assert.equal(isAuthorized(basic("majster:zlé"), "tajné"), false);
  assert.equal(isAuthorized(basic("tajné"), "tajné"), false);
  assert.equal(isAuthorized("Bearer tajné", "tajné"), false);
  assert.equal(isAuthorized(null, "tajné"), false);
});

test("fails closed when DEMO_PASSWORD is missing or empty", () => {
  assert.equal(isAuthorized(basic("majster:"), undefined), false);
  assert.equal(isAuthorized(basic("majster:"), ""), false);
});
