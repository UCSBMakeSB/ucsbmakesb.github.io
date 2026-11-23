import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DRAFT_COOKIE, getRequest, redirectPath } from "../support/helpers.mjs";
import { addApplication, addUser, db, failNext, resetDb } from "../support/fakes/db.mjs";

const { GET } = await import("../../app/auth/callback/route.js");

const callback = (query, options) => GET(getRequest(`/auth/callback${query}`, options));
const appOf = (user) => db.tables.applications.find((row) => row.user_id === user.id);

describe("auth callback: email synchronization after confirmation", () => {
  let alice;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    addApplication({ user: alice });
    db.codes.set("good-code", { userId: alice.id });
  });

  // Supabase flips the auth email when the user clicks the confirmation link;
  // simulate that before the callback runs.
  const confirmChangeTo = (email) => {
    alice.email = email;
  };

  it("redirects to /auth/recover when no code is present", async () => {
    const response = await callback("");
    assert.equal(
      redirectPath(response),
      "/auth/recover?notice=incomplete_link",
    );
  });

  it("routes a missing-code callback with otp_expired to expired-link recovery", async () => {
    const response = await callback("?error=missing_code&error_code=otp_expired");
    assert.equal(
      redirectPath(response),
      "/auth/recover?notice=link_expired",
    );
  });

  it("routes Supabase missing-code errors to expired-link recovery", async () => {
    const response = await callback("?error=missing_code");
    assert.equal(
      redirectPath(response),
      "/auth/recover?notice=link_expired",
    );
  });

  it("a code that cannot be exchanged (e.g. opened in a different browser) goes to /login with a notice, not an error", async () => {
    const response = await callback("?code=bogus");
    assert.equal(redirectPath(response), "/login?notice=confirm_link");
    assert.equal(db.currentUserId, null, "no session may be created from a bad code");
  });

  it("an expired-link error from Supabase also goes to the /login notice", async () => {
    db.codes.set("expired", { error: { message: "Email link is invalid or has expired" } });
    const response = await callback("?code=expired");
    assert.equal(redirectPath(response), "/login?notice=confirm_link");
    assert.equal(appOf(alice).email, "alice@ucsb.edu");
  });

  it("copies the newly confirmed email onto the application", async () => {
    confirmChangeTo("alice.new@ucsb.edu");
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth/confirmed");
    assert.equal(appOf(alice).email, "alice.new@ucsb.edu");
  });

  it("leaves the application alone when the email did not change", async () => {
    const before = JSON.stringify(appOf(alice));
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth/confirmed");
    assert.equal(JSON.stringify(appOf(alice)), before);
  });

  it("does not create or touch anything itself for an account with no application yet", async () => {
    const bob = addUser({ email: "bob@ucsb.edu" });
    db.codes.set("bob-code", { userId: bob.id });
    const response = await callback("?code=bob-code");
    assert.equal(redirectPath(response), "/api/apply/claim-draft?next=/auth/confirmed");
    assert.equal(db.tables.applications.length, 1);
  });

  it("a failed password-recovery link goes to the /login reset notice", async () => {
    const response = await callback("?code=bogus&next=/auth/reset");
    assert.equal(redirectPath(response), "/login?notice=reset_link");
  });

  it("only ever syncs the email onto the confirming user's own application", async () => {
    const bob = addUser({ email: "bob@ucsb.edu" });
    addApplication({ user: bob });
    confirmChangeTo("alice.new@ucsb.edu");
    await callback("?code=good-code");
    assert.equal(appOf(bob).email, "bob@ucsb.edu");
  });

  it("surfaces email_sync_failed (and keeps the old application email) when the new address is already on another application", async () => {
    addApplication({ email: "taken@ucsb.edu", user: addUser({ email: "someone-else@ucsb.edu" }) });
    confirmChangeTo("taken@ucsb.edu");
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth?error=email_sync_failed");
    assert.equal(appOf(alice).email, "alice@ucsb.edu");
  });

  it("surfaces email_sync_failed when the application lookup fails", async () => {
    failNext("applications.select");
    const response = await callback("?code=good-code");
    assert.equal(redirectPath(response), "/auth?error=email_sync_failed");
  });

  it("password-recovery links continue to /auth/reset after syncing", async () => {
    const response = await callback("?code=good-code&next=/auth/reset");
    assert.equal(redirectPath(response), "/auth/reset");
  });

  it("ignores any other `next` value (no open redirect)", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/portal", "/api/settings"]) {
      const response = await callback(`?code=good-code&next=${encodeURIComponent(next)}`);
      assert.equal(redirectPath(response), "/auth/confirmed", next);
      db.codes.set("good-code", { userId: alice.id });
    }
  });

  it("hands off to claim-draft for an account without an application, with or without a draft cookie", async () => {
    const bob = addUser({ email: "bob@ucsb.edu" });
    for (const options of [{ cookies: { [DRAFT_COOKIE]: "draft-id" } }, undefined]) {
      db.codes.set("bob-code", { userId: bob.id });
      const response = await callback("?code=bob-code", options);
      const { pathname, searchParams } = new URL(response.headers.get("location"));
      assert.equal(pathname, "/api/apply/claim-draft");
      assert.equal(searchParams.get("next"), "/auth/confirmed");
    }
  });

  it("an account that already has an application goes straight to /auth/confirmed, even with a stale draft cookie", async () => {
    const response = await callback("?code=good-code", { cookies: { [DRAFT_COOKIE]: "draft-id" } });
    assert.equal(redirectPath(response), "/auth/confirmed");
  });
});
