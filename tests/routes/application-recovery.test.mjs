import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DRAFT_COOKIE, jsonRequest } from "../support/helpers.mjs";
import {
  addApplication,
  addDraft,
  addUser,
  db,
  resetDb,
  signInAs,
} from "../support/fakes/db.mjs";

const { POST } = await import("../../app/api/auth/recover/route.js");

const recover = (email, options = {}) =>
  POST(jsonRequest("/api/auth/recover", { body: { email }, ...options }));

describe("application recovery", () => {
  beforeEach(resetDb);

  it("validates the email and does not perform lookups for invalid input", async () => {
    for (const email of [undefined, null, "", " ", "not-an-email", 42]) {
      const response = await recover(email);
      assert.equal(response.status, 400);
    }
    assert.equal(db.calls.filter((call) => call.type === "rateLimit").length, 0);
  });

  it("redirects a signed-in user to the portal", async () => {
    signInAs(addUser({ email: "gaucho@ucsb.edu" }));
    const response = await recover("gaucho@ucsb.edu");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      code: "logged_in",
      redirectTo: "/portal",
    });
  });

  it("returns not_found for an email with no account or draft", async () => {
    const response = await recover("nobody@ucsb.edu");
    assert.deepEqual(await response.json(), {
      code: "not_found",
      redirectTo: "/apply",
    });
  });

  it("returns account_found for an email with a normal application", async () => {
    addApplication({ user: addUser({ email: "gaucho@ucsb.edu" }) });
    const response = await recover("gaucho@ucsb.edu");
    assert.deepEqual(await response.json(), {
      code: "account_found",
      redirectTo: "/login",
    });
  });

  it("sends a signup resend for an active draft and unconfirmed account", async () => {
    addUser({ email: "gaucho@ucsb.edu", confirmed: false });
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: 60 * 60 * 1000 });

    const response = await recover("  Gaucho@UCSB.edu ");
    const body = await response.json();
    assert.equal(body.code, "draft_active");
    assert.ok(body.expiresAt);
    assert.equal(db.confirmationRequests.length, 1);
    assert.equal(db.confirmationRequests[0].email, "gaucho@ucsb.edu");
    assert.equal(db.confirmationRequests[0].type, "signup");
    assert.equal(
      db.confirmationRequests[0].redirectTo,
      "http://localhost:3000/auth/callback",
    );
    assert.ok(response.cookies.get(DRAFT_COOKIE)?.httpOnly);
  });

  it("redirects a draft-only user without an auth account to create an account", async () => {
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: -60_000 });

    const before = Date.now();
    const response = await recover("gaucho@ucsb.edu");
    const body = await response.json();

    assert.equal(body.code, "create_account");
    assert.equal(body.redirectTo, "/auth?email=gaucho%40ucsb.edu&recovery=1");
    const expiresAt = new Date(body.expiresAt).getTime();
    assert.ok(expiresAt >= before + 29 * 60 * 1000);
    assert.ok(expiresAt <= Date.now() + 30 * 60 * 1000 + 1000);
    assert.equal(db.tables.application_drafts[0].expires_at, body.expiresAt);
    assert.equal(db.confirmationRequests.length, 0);
    assert.equal(db.otpRequests.length, 0);
    assert.equal(response.cookies.get(DRAFT_COOKIE)?.maxAge, 30 * 60);
  });

  it("refreshes an active draft before redirecting a draft-only user to create an account", async () => {
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: 24 * 60 * 60 * 1000 });

    const before = Date.now();
    const response = await recover("gaucho@ucsb.edu");
    const body = await response.json();

    assert.equal(body.code, "create_account");
    const expiresAt = new Date(body.expiresAt).getTime();
    assert.ok(expiresAt >= before + 29 * 60 * 1000);
    assert.ok(expiresAt <= Date.now() + 30 * 60 * 1000 + 1000);
    assert.equal(db.confirmationRequests.length, 0);
    assert.equal(db.otpRequests.length, 0);
  });

  it("rate limits recovery per IP and email", async () => {
    for (const name of ["recoveryIp", "recoveryEmail"]) {
      db.rateLimited.clear();
      db.rateLimited.add(name);
      const response = await recover("gaucho@ucsb.edu");
      assert.equal(response.status, 429);
      assert.ok(Number(response.headers.get("retry-after")) >= 1);
    }
  });

  it("returns a specific retry message for Supabase confirmation rate limits", async () => {
    addUser({ email: "gaucho@ucsb.edu", confirmed: false });
    addDraft({ email: "gaucho@ucsb.edu", expiresInMs: 60 * 60 * 1000 });
    db.failures.set("auth.resend", {
      status: 429,
      code: "over_email_send_rate_limit",
      message: "For security purposes, you can only request this after 38 seconds.",
    });

    const response = await recover("gaucho@ucsb.edu");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "38");
    assert.deepEqual(await response.json(), {
      code: "auth_rate_limited",
      error: "Too many requests. Try again in 38 seconds.",
      retryAfterSeconds: 38,
    });
  });
});
