// LIVE end-to-end tests for the auth and application flows.
//
// These run against a real Supabase TEST project and a running copy of the
// site, so they only run when you opt in. See docs/auth-testing.md.
//
// Budget note: the site rate-limits password checks per user (5 / 15 min) and
// per IP (30 / 15 min). Every test below uses a fresh user and a small number
// of password-verifying requests so one run stays under those limits. Wait 15
// minutes (or flush the TEST Redis) between runs.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  STRONG_PASSWORD,
  admin,
  anonClient,
  api,
  applicationForm,
  assertServerReachable,
  checkLiveEnvironment,
  cleanupTestData,
  createApplication,
  createDraft,
  createUser,
  findApplication,
  projectRef,
  sendsEmails,
  sessionCookie,
  signedInClient,
  uniqueEmail,
} from "./support/live.mjs";

const gate = checkLiveEnvironment();
const skip = gate.ok ? false : gate.reason;
const DRAFT_COOKIE = "makesb_application_draft";

async function freshAccount(tag, { withApplication = true } = {}) {
  const email = uniqueEmail(tag);
  const user = await createUser(email);
  if (withApplication) await createApplication(user, { preferred_first_name: tag });
  return { user, email, cookie: await sessionCookie(email) };
}

function draftCookieFrom(response) {
  const header = response.setCookie.find((line) => line.startsWith(`${DRAFT_COOKIE}=`));
  assert.ok(header, "expected a draft cookie to be set");
  return { value: header.split(";")[0].split("=")[1], header };
}

describe("live: auth and application flows", { skip }, () => {
  before(async () => {
    await assertServerReachable();
    await cleanupTestData();
  });
  after(cleanupTestData);

  // ------------------------------------------------------------------ 1
  describe("unauthenticated API requests", () => {
    const calls = {
      "PATCH /api/settings": () => api("/api/settings", { method: "PATCH", json: { section: "profile", firstName: "X", lastName: "Y" } }),
      "PATCH /api/profile": () => api("/api/profile", { method: "PATCH", json: { preferredFirstName: "X" } }),
      "GET /api/application": () => api("/api/application"),
      "PATCH /api/application": () => {
        const form = new FormData();
        form.set("application_question_1", "x");
        return api("/api/application", { method: "PATCH", form });
      },
      "POST /api/apply/claim-draft": () => api("/api/apply/claim-draft", { method: "POST" }),
    };

    for (const [name, call] of Object.entries(calls)) {
      it(`${name} -> 401 with no session`, async () => {
        const response = await call();
        assert.equal(response.status, 401);
      });
    }

    it("a forged session cookie is rejected", async () => {
      const forged = Buffer.from(
        JSON.stringify({
          access_token: `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from('{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}').toString("base64url")}.forged`,
          refresh_token: "forged",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
        }),
      ).toString("base64url");
      const response = await api("/api/application", { cookie: `sb-${projectRef()}-auth-token=base64-${forged}` });
      assert.equal(response.status, 401);
    });

    it("the portal pages redirect to /login", async () => {
      const response = await api("/portal");
      assert.ok([302, 307, 308].includes(response.status), `status ${response.status}`);
      assert.match(response.location ?? "", /\/login/);
    });
  });

  // ------------------------------------------------------------------ 2
  describe("cross-user application access", () => {
    let alice;
    let bob;

    before(async () => {
      alice = await freshAccount("alice");
      bob = await freshAccount("bob");
    });

    it("each user sees only their own application", async () => {
      const a = await api("/api/application", { cookie: alice.cookie });
      const b = await api("/api/application", { cookie: bob.cookie });
      assert.equal(a.body.account.firstName, "alice");
      assert.equal(b.body.account.firstName, "bob");
      assert.equal(a.body.account.email, alice.email);
    });

    it("ignores identity fields in the request and edits only the caller's row", async () => {
      const before = await findApplication(bob.user.id);
      const response = await api("/api/profile", {
        method: "PATCH",
        cookie: alice.cookie,
        json: { preferredFirstName: "Mallory", user_id: bob.user.id, id: before.id, email: bob.email },
      });
      assert.equal(response.status, 200);
      const aliceRow = await findApplication(alice.user.id);
      const bobRow = await findApplication(bob.user.id);
      assert.equal(aliceRow.preferred_first_name, "Mallory");
      assert.equal(aliceRow.user_id, alice.user.id);
      assert.equal(bobRow.preferred_first_name, "bob");
      assert.equal(bobRow.email, bob.email);
    });

    it("a user cannot claim a draft that belongs to another email", async () => {
      const draft = await createDraft(uniqueEmail("someone-else"));
      const response = await api("/api/apply/claim-draft", {
        method: "POST",
        cookie: `${alice.cookie}; ${DRAFT_COOKIE}=${draft.id}`,
      });
      assert.equal(response.status, 403);
      const { data } = await admin().from("application_drafts").select("claimed_at").eq("id", draft.id).single();
      assert.equal(data.claimed_at, null);
    });
  });

  // ------------------------------------------------- 3 + 4  (passwords)
  describe("invalid current passwords and password complexity", () => {
    it("rejects a missing or wrong current password and leaves the password alone", async () => {
      const account = await freshAccount("pw-wrong");
      const missing = await api("/api/settings", {
        method: "PATCH",
        cookie: account.cookie,
        json: { section: "password", newPassword: "Another-Strong-1!", confirmPassword: "Another-Strong-1!" },
      });
      assert.equal(missing.status, 400);

      const wrong = await api("/api/settings", {
        method: "PATCH",
        cookie: account.cookie,
        json: { section: "password", currentPassword: "Wrong-Password-1!", newPassword: "Another-Strong-1!", confirmPassword: "Another-Strong-1!" },
      });
      assert.equal(wrong.status, 401);
      await signedInClient(account.email, STRONG_PASSWORD); // old password still works
    });

    const weak = {
      "too short": "Abc1!xyz",
      "no uppercase": "alllowercase12!!",
      "no lowercase": "ALLUPPERCASE12!!",
      "no digit": "NoDigitsHere!!!!",
      "no symbol": "NoSymbolsHere1234",
    };
    for (const [label, password] of Object.entries(weak)) {
      it(`rejects a new password with ${label}`, async () => {
        const account = await freshAccount("pw-weak");
        const response = await api("/api/settings", {
          method: "PATCH",
          cookie: account.cookie,
          json: { section: "password", currentPassword: STRONG_PASSWORD, newPassword: password, confirmPassword: password },
        });
        assert.equal(response.status, 400);
        await signedInClient(account.email, STRONG_PASSWORD);
      });
    }

    it("rejects mismatched confirmation, then accepts a strong password and switches credentials", async () => {
      const account = await freshAccount("pw-ok");
      const mismatch = await api("/api/settings", {
        method: "PATCH",
        cookie: account.cookie,
        json: { section: "password", currentPassword: STRONG_PASSWORD, newPassword: "Another-Strong-1!", confirmPassword: "Another-Strong-2!" },
      });
      assert.equal(mismatch.status, 400);

      const ok = await api("/api/settings", {
        method: "PATCH",
        cookie: account.cookie,
        json: { section: "password", currentPassword: STRONG_PASSWORD, newPassword: "Another-Strong-1!", confirmPassword: "Another-Strong-1!" },
      });
      assert.equal(ok.status, 200);
      await signedInClient(account.email, "Another-Strong-1!");
      await assert.rejects(signedInClient(account.email, STRONG_PASSWORD), /sign-in failed/);
    });
  });

  // ------------------------------------------------------------------ 5
  describe("password reset validation", () => {
    it("rejects malformed emails with 400", async () => {
      for (const email of ["", "not-an-email", "a@b", `${"a".repeat(250)}@example.com`]) {
        const response = await api("/api/auth/password-reset", { method: "POST", json: { email } });
        assert.equal(response.status, 400, email);
      }
    });

    it("rejects a non-JSON body", async () => {
      const response = await fetch(`${process.env.E2E_BASE_URL || "http://localhost:3000"}/api/auth/password-reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{nope",
      });
      assert.equal(response.status, 400);
    });

    it("answers an unknown address with the generic message and then rate limits repeats", async () => {
      const email = uniqueEmail("reset-unknown");
      const first = await api("/api/auth/password-reset", { method: "POST", json: { email } });
      assert.equal(first.status, 200);
      assert.match(first.body.message, /If an account exists/);

      // passwordResetEmail allows 3 per 15 minutes per address.
      let limited;
      for (let i = 0; i < 4 && !limited; i += 1) {
        const next = await api("/api/auth/password-reset", { method: "POST", json: { email } });
        if (next.status === 429) limited = next;
      }
      assert.ok(limited, "expected a 429 after repeated requests");
      assert.ok(Number(limited.headers.get("retry-after")) >= 1);
    });

    it("answers a known and an unknown address identically", { skip: sendsEmails() ? false : "set E2E_SEND_EMAILS=yes (this sends a real email)" }, async () => {
      const account = await freshAccount("reset-known");
      const known = await api("/api/auth/password-reset", { method: "POST", json: { email: account.email } });
      const unknown = await api("/api/auth/password-reset", { method: "POST", json: { email: uniqueEmail("reset-none") } });
      assert.equal(known.status, 200);
      assert.deepEqual(known.body, unknown.body);
    });
  });

  // ------------------------------------------------------------------ 6
  describe("duplicate and invalid email changes", () => {
    let bob;
    let carol;

    before(async () => {
      bob = await freshAccount("dup-bob");
      carol = await freshAccount("dup-carol", { withApplication: false });
    });

    // Email changes are limited to 3 per user per hour, so every case gets
    // its own fresh user.
    const change = async (email) => {
      const alice = await freshAccount("dup-alice");
      const result = await api("/api/settings", {
        method: "PATCH",
        cookie: alice.cookie,
        json: { section: "email", currentPassword: STRONG_PASSWORD, email: email ?? alice.email.toUpperCase() },
      });
      return result;
    };

    it("rejects the address the account already has", async () => {
      assert.equal((await change()).status, 400);
    });

    it("rejects a malformed address", async () => {
      assert.equal((await change("not-an-email")).status, 400);
    });

    it("409s when another user's application holds the address", async () => {
      assert.equal((await change(bob.email)).status, 409);
    });

    it("409s when another account (without an application) uses the address", async () => {
      assert.equal((await change(carol.email)).status, 409);
    });
  });

  // ------------------------------------------------------------------ 7
  describe("signup preflight states", () => {
    const preflight = (email) => api("/api/auth/prepare-signup", { method: "POST", json: { email } });

    it("no_application", async () => {
      const response = await preflight(uniqueEmail("pre-none"));
      assert.equal(response.body.code, "no_application");
    });

    it("application_exists", async () => {
      const email = uniqueEmail("pre-exists");
      await createApplication(await createUser(email));
      assert.equal((await preflight(email)).body.code, "application_exists");
    });

    it("draft_ready sets an httpOnly draft cookie", async () => {
      const email = uniqueEmail("pre-draft");
      const draft = await createDraft(email);
      const response = await preflight(email);
      assert.equal(response.body.code, "draft_ready");
      const { value, header } = draftCookieFrom(response);
      assert.equal(value, draft.id);
      assert.match(header, /HttpOnly/i);
    });

    it("an expired draft is treated as no application and cleaned up", async () => {
      const email = uniqueEmail("pre-expired");
      const draft = await createDraft(email, { expiresInMs: -60_000 });
      assert.equal((await preflight(email)).body.code, "no_application");
      const { data } = await admin().from("application_drafts").select("id").eq("id", draft.id);
      assert.equal(data.length, 0);
    });

    it("an already-claimed draft is never offered", async () => {
      const email = uniqueEmail("pre-claimed");
      await createDraft(email, { claimed: true });
      assert.equal((await preflight(email)).body.code, "no_application");
    });

    it("wildcard characters do not match other people's addresses", async () => {
      const email = uniqueEmail("pre-wild");
      await createApplication(await createUser(email));
      for (const probe of ["%@example.com", "e2e-pre-wil_%", "%"]) {
        const response = await preflight(probe);
        assert.equal(response.body.code, "no_application", probe);
      }
    });

    it("is rate limited per email with Retry-After", async () => {
      const email = uniqueEmail("pre-limit");
      let limited;
      for (let i = 0; i < 5 && !limited; i += 1) {
        const response = await preflight(email);
        if (response.status === 429) limited = response;
      }
      assert.ok(limited, "expected a 429 after repeated lookups of one address");
      assert.ok(Number(limited.headers.get("retry-after")) >= 1);
    });
  });

  // ------------------------------------------------------------------ 8
  describe("expired, missing and already-claimed drafts", () => {
    it("no cookie -> 404; unknown id -> 410", async () => {
      assert.equal((await api("/api/apply/draft")).status, 404);
      const unknown = await api("/api/apply/draft", { cookie: `${DRAFT_COOKIE}=00000000-0000-0000-0000-000000000000` });
      assert.equal(unknown.status, 410);
    });

    it("an expired draft -> 410", async () => {
      const draft = await createDraft(uniqueEmail("d-expired"), { expiresInMs: -1000 });
      assert.equal((await api("/api/apply/draft", { cookie: `${DRAFT_COOKIE}=${draft.id}` })).status, 410);
    });

    it("an already-claimed draft -> 410 saying it is linked", async () => {
      const draft = await createDraft(uniqueEmail("d-claimed"), { claimed: true });
      const response = await api("/api/apply/draft", { cookie: `${DRAFT_COOKIE}=${draft.id}` });
      assert.equal(response.status, 410);
      assert.match(response.body.error, /already been linked/i);
    });

    it("creates a draft through the form, then it expires", async () => {
      const email = uniqueEmail("d-create");
      const created = await api("/api/apply/draft", { method: "POST", form: applicationForm(email) });
      assert.equal(created.status, 201);
      const { value } = draftCookieFrom(created);

      const lookup = await api("/api/apply/draft", { cookie: `${DRAFT_COOKIE}=${value}` });
      assert.equal(lookup.status, 200);
      assert.equal(lookup.body.email, email);

      await admin().from("application_drafts").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", value);
      assert.equal((await api("/api/apply/draft", { cookie: `${DRAFT_COOKIE}=${value}` })).status, 410);
    });

    it("rejects creating a draft for an address that already has an application", async () => {
      const email = uniqueEmail("d-dupe");
      await createApplication(await createUser(email));
      const response = await api("/api/apply/draft", { method: "POST", form: applicationForm(email) });
      assert.equal(response.status, 409);
      assert.equal(response.body.code, "application_exists");
    });

    it("claiming links the application, moves the resume and consumes the draft exactly once", async () => {
      const email = uniqueEmail("d-claim");
      const user = await createUser(email);
      const created = await api("/api/apply/draft", { method: "POST", form: applicationForm(email) });
      const { value: draftId } = draftCookieFrom(created);
      const cookie = `${await sessionCookie(email)}; ${DRAFT_COOKIE}=${draftId}`;

      const claimed = await api("/api/apply/claim-draft", { method: "POST", cookie });
      assert.equal(claimed.status, 200);

      const application = await findApplication(user.id);
      assert.ok(application, "application is linked to the account");
      assert.equal(application.email, email);
      assert.equal(application.resume_path, `applications/${user.id}.pdf`);
      const { data: files } = await admin().storage.from("resumes").list("applications", { search: user.id });
      assert.ok(files.some((file) => file.name === `${user.id}.pdf`), "resume was moved to the account's folder");
      const { data: drafts } = await admin().from("application_drafts").select("id").eq("id", draftId);
      assert.equal(drafts.length, 0, "the draft is consumed");

      const replay = await api("/api/apply/claim-draft", { method: "POST", cookie });
      assert.equal(replay.status, 410);
    });
  });

  // ------------------------------------------------------------------ 9
  describe("email synchronization after confirmation", () => {
    it("the callback rejects a missing or invalid code", async () => {
      const missing = await api("/auth/callback");
      assert.match(missing.location ?? "", /error=missing_code/);
      const bogus = await api("/auth/callback?code=not-a-real-code");
      assert.match(bogus.location ?? "", /error=confirmation_failed/);
    });

    it(
      "copies a confirmed new email onto the application",
      { todo: "needs a real emailed confirmation link; covered by tests/routes/email-sync.test.mjs and the manual checklist in docs/auth-testing.md" },
      () => {},
    );
  });

  // ------------------------------------------- Supabase configuration
  describe("Supabase project configuration the site depends on", () => {
    it("requires email confirmation (autoconfirm is OFF)", async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      });
      const settings = await response.json();
      assert.equal(
        settings.mailer_autoconfirm,
        false,
        "Dashboard -> Authentication -> Sign In / Providers -> Email -> turn ON 'Confirm email'. Without it anyone can sign up with an address they don't own.",
      );
    });

    it("enforces the 12-character password policy itself (not just the website's forms)", async () => {
      const account = await freshAccount("policy");
      const client = await signedInClient(account.email);
      const { error } = await client.auth.updateUser({ password: "Abc1!xyz" });
      assert.ok(
        error,
        "Supabase accepted an 8-character password. Dashboard -> Authentication -> Sign In / Providers -> Email -> Password requirements: set minimum length 12 and require lowercase, uppercase, digits and symbols. The reset page changes passwords straight from the browser, so only Supabase can enforce this.",
      );
    });

    it(
      "refuses direct sign-ups that have no pending application (Before User Created hook)",
      { skip: process.env.E2E_EXPECT_SIGNUP_HOOK === "yes" ? false : "set E2E_EXPECT_SIGNUP_HOOK=yes after enabling supabase/auth-hook-before-user-created.sql" },
      async () => {
        const email = uniqueEmail("hook");
        const { data, error } = await anonClient().auth.signUp({ email, password: STRONG_PASSWORD });
        assert.ok(error, "sign-up without an application must be rejected server-side");
        assert.ok(!data?.user, "no account may be created");
      },
    );
  });
});
