import "../support/helpers.mjs";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { STRONG_PASSWORD, jsonRequest } from "../support/helpers.mjs";
import { addApplication, addUser, db, failNext, resetDb, signInAs } from "../support/fakes/db.mjs";

const { PATCH } = await import("../../app/api/settings/route.js");

const COMPLEXITY_MESSAGE =
  "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.";

describe("settings: invalid current password", () => {
  let alice;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    addApplication({ user: alice });
    signInAs(alice);
  });

  const patch = (body) =>
    PATCH(jsonRequest("/api/settings", { method: "PATCH", body }));

  const passwordBody = (overrides = {}) => ({
    section: "password",
    currentPassword: STRONG_PASSWORD,
    newPassword: "Another-Strong-1!",
    confirmPassword: "Another-Strong-1!",
    ...overrides,
  });

  const emailBody = (overrides = {}) => ({
    section: "email",
    currentPassword: STRONG_PASSWORD,
    email: "new@ucsb.edu",
    ...overrides,
  });

  for (const [label, build] of [["password", passwordBody], ["email", emailBody]]) {
    it(`${label} change: a missing current password is rejected before any lookup`, async () => {
      const response = await patch(build({ currentPassword: undefined }));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, "Enter your current password.");
      assert.equal(db.calls.filter((c) => c.type === "signInWithPassword").length, 0);
    });

    it(`${label} change: a wrong current password returns 401 and changes nothing`, async () => {
      const response = await patch(build({ currentPassword: "Wrong-Password-1!" }));
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error, "Your current password is incorrect.");
      assert.equal(alice.password, STRONG_PASSWORD);
      assert.equal(db.calls.filter((c) => c.type === "admin.updateUserById").length, 0);
      assert.equal(db.emailChanges.length, 0);
    });

    it(`${label} change: non-string and blank current passwords never succeed`, async () => {
      for (const currentPassword of [123, null, {}, ["x"], "", "   "]) {
        const response = await patch(build({ currentPassword }));
        assert.ok([400, 401].includes(response.status), `status ${response.status} for ${JSON.stringify(currentPassword)}`);
      }
      assert.equal(alice.password, STRONG_PASSWORD);
      assert.equal(db.emailChanges.length, 0);
    });

    it(`${label} change: the new value is not even validated until the current password checks out`, async () => {
      const response = await patch(
        build({ currentPassword: "nope", newPassword: "x", confirmPassword: "y", email: "not-an-email" }),
      );
      assert.equal(response.status, 401, "wrong credentials must win over validation errors");
    });
  }

  it("a wrong current password is not an oracle: same message whether or not the new password is valid", async () => {
    const a = await patch(passwordBody({ currentPassword: "bad" }));
    const b = await patch(passwordBody({ currentPassword: "bad", newPassword: "weak", confirmPassword: "weak" }));
    assert.deepEqual(await a.json(), await b.json());
  });

  it("repeated wrong guesses are rate limited per user and the verification is skipped", async () => {
    db.rateLimited.add("passwordVerificationUser");
    const response = await patch(passwordBody({ currentPassword: "guess" }));
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("retry-after")) >= 1);
    assert.equal(db.calls.filter((c) => c.type === "signInWithPassword").length, 0, "no password attempt is made once limited");
  });

  it("repeated wrong guesses are rate limited per IP", async () => {
    db.rateLimited.add("passwordVerificationIp");
    const response = await patch(passwordBody({ currentPassword: "guess" }));
    assert.equal(response.status, 429);
    assert.equal(db.calls.filter((c) => c.type === "signInWithPassword").length, 0);
  });

  it("password and email changes have their own per-user limits", async () => {
    db.rateLimited.add("passwordChangeUser");
    assert.equal((await patch(passwordBody())).status, 429);
    db.rateLimited.clear();
    db.rateLimited.add("emailChangeUser");
    assert.equal((await patch(emailBody())).status, 429);
    assert.equal(alice.password, STRONG_PASSWORD);
    assert.equal(db.emailChanges.length, 0);
  });
});

describe("settings: password complexity failures", () => {
  let alice;

  beforeEach(() => {
    resetDb();
    alice = addUser({ email: "alice@ucsb.edu" });
    addApplication({ user: alice });
    signInAs(alice);
  });

  const change = (newPassword, confirmPassword = newPassword) =>
    PATCH(
      jsonRequest("/api/settings", {
        method: "PATCH",
        body: { section: "password", currentPassword: STRONG_PASSWORD, newPassword, confirmPassword },
      }),
    );

  const weak = {
    "too short (8 chars)": "Abc1!xyz",
    "11 characters, one short of the minimum": "Abcdefgh1!x",
    "no uppercase letter": "alllowercase12!!",
    "no lowercase letter": "ALLUPPERCASE12!!",
    "no digit": "NoDigitsHere!!!!",
    "no symbol": "NoSymbolsHere1234",
    "empty string": "",
    "only spaces": "            ",
    "digits only": "123456789012",
  };

  for (const [label, password] of Object.entries(weak)) {
    it(`rejects a password that is ${label}`, async () => {
      const response = await change(password);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, COMPLEXITY_MESSAGE);
      assert.equal(alice.password, STRONG_PASSWORD, "the password must not change");
      assert.equal(db.calls.filter((c) => c.type === "admin.updateUserById").length, 0);
    });
  }

  it("rejects a missing or non-string new password", async () => {
    for (const value of [undefined, null, 12345678901234, {}, ["Abcdefgh1!xy"]]) {
      const response = await PATCH(
        jsonRequest("/api/settings", {
          method: "PATCH",
          body: { section: "password", currentPassword: STRONG_PASSWORD, newPassword: value, confirmPassword: value },
        }),
      );
      assert.equal(response.status, 400, JSON.stringify(value));
    }
    assert.equal(alice.password, STRONG_PASSWORD);
  });

  it("rejects mismatched confirmation", async () => {
    const response = await change("Another-Strong-1!", "Another-Strong-2!");
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "Your new passwords don't match.");
    assert.equal(alice.password, STRONG_PASSWORD);
  });

  it("rejects a missing confirmation", async () => {
    const response = await PATCH(
      jsonRequest("/api/settings", {
        method: "PATCH",
        body: { section: "password", currentPassword: STRONG_PASSWORD, newPassword: "Another-Strong-1!" },
      }),
    );
    assert.equal(response.status, 400);
    assert.equal(alice.password, STRONG_PASSWORD);
  });

  it("accepts a password of exactly 12 characters that meets every rule", async () => {
    const response = await change("Abcdefgh1!xy");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(alice.password, "Abcdefgh1!xy");
    assert.deepEqual(db.revalidated, [alice.id]);
  });

  it("accepts long passwords with spaces and unicode symbols", async () => {
    const response = await change("correct horse BATTERY staple 9 §");
    assert.equal(response.status, 200);
  });

  it("an upstream failure returns a generic 500 and leaves the password alone", async () => {
    failNext("auth.admin.updateUserById", { message: "internal: pg connection refused at 10.0.0.5" });
    const response = await change("Another-Strong-1!");
    assert.equal(response.status, 500);
    const text = JSON.stringify(await response.json());
    assert.ok(!text.includes("10.0.0.5") && !text.includes("pg connection"), "internal details must not leak");
    assert.equal(alice.password, STRONG_PASSWORD);
  });

  it("rejects an unknown settings section", async () => {
    const response = await PATCH(
      jsonRequest("/api/settings", { method: "PATCH", body: { section: "role", role: "admin" } }),
    );
    assert.equal(response.status, 400);
  });

  it("rejects a non-JSON body", async () => {
    const response = await PATCH(jsonRequest("/api/settings", { method: "PATCH", raw: "not json" }));
    assert.equal(response.status, 400);
  });
});
