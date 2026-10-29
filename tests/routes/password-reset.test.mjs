import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { jsonRequest } from "../support/helpers.mjs";
import { addUser, db, failNext, resetDb } from "../support/fakes/db.mjs";

const { POST } = await import("../../app/api/auth/password-reset/route.js");

const GENERIC_MESSAGE =
  "If an account exists for that email, you'll receive a password reset link shortly.";

describe("password reset request validation", () => {
  beforeEach(() => {
    resetDb();
    addUser({ email: "alice@ucsb.edu" });
  });

  const request = (body, options = {}) =>
    POST(jsonRequest("/api/auth/password-reset", { body, ...options }));

  it("rejects a body that is not JSON", async () => {
    const response = await POST(jsonRequest("/api/auth/password-reset", { raw: "{nope" }));
    assert.equal(response.status, 400);
    assert.equal(db.resetRequests.length, 0);
  });

  it("rejects missing, blank, malformed, non-string, and oversize emails before doing any work", async () => {
    const tooLong = `${"a".repeat(250)}@ucsb.edu`;
    const bad = [undefined, null, "", "   ", "not-an-email", "a@b", "two words@ucsb.edu", 123, {}, ["a@b.co"], tooLong];
    for (const email of bad) {
      const response = await request({ email });
      assert.equal(response.status, 400, JSON.stringify(email));
      assert.equal((await response.json()).error, "Enter a valid email address.");
    }
    assert.equal(db.resetRequests.length, 0, "no reset email is requested for invalid input");
    assert.equal(db.calls.filter((c) => c.type === "rateLimit").length, 0, "invalid input must not burn rate-limit budget");
  });

  it("answers identically for an existing and an unknown account (no account enumeration)", async () => {
    const known = await request({ email: "alice@ucsb.edu" });
    const unknown = await request({ email: "nobody-here@ucsb.edu" });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.deepEqual(await known.json(), { message: GENERIC_MESSAGE });
    assert.deepEqual(await unknown.json(), { message: GENERIC_MESSAGE });
  });

  it("normalizes the email and points the link at the auth callback", async () => {
    const response = await request({ email: "  Alice@UCSB.edu " });
    assert.equal(response.status, 200);
    assert.equal(db.resetRequests.length, 1);
    assert.equal(db.resetRequests[0].email, "alice@ucsb.edu");
    assert.equal(db.resetRequests[0].redirectTo, "http://localhost:3000/auth/callback?next=/auth/reset");
  });

  it("is rate limited per IP, with Retry-After, and sends nothing", async () => {
    db.rateLimited.add("passwordResetIp");
    const response = await request({ email: "alice@ucsb.edu" });
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("retry-after")) >= 1);
    assert.equal(db.resetRequests.length, 0);
  });

  it("is rate limited per email, with Retry-After, and sends nothing", async () => {
    db.rateLimited.add("passwordResetEmail");
    const response = await request({ email: "alice@ucsb.edu" });
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("retry-after")) >= 1);
    assert.equal(db.resetRequests.length, 0);
  });

  it("keys the limiters on the client IP and a HASH of the email, never the raw address", async () => {
    await request({ email: "alice@ucsb.edu" }, { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } });
    const keys = db.calls.filter((c) => c.type === "rateLimit").map((c) => c.key);
    assert.ok(keys.includes("ip:203.0.113.9"), "first forwarded address is the client");
    assert.ok(keys.every((key) => !key.includes("alice@ucsb.edu")), "raw email must not be stored in the limiter");
  });

  it("returns a generic 500 on upstream failure without leaking internals", async () => {
    failNext("auth.resetPasswordForEmail", { message: "SMTP relay smtp.internal.example:25 refused" });
    const response = await request({ email: "alice@ucsb.edu" });
    assert.equal(response.status, 500);
    const text = JSON.stringify(await response.json());
    assert.ok(!text.toLowerCase().includes("smtp"));
  });
});
