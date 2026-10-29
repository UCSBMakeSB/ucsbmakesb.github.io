// LIVE row-level-security and storage-policy checks.
//
// The app's contract is: the browser (anon key, or a signed-in user's key) can
// NOT read or write applications, application drafts, or resumes directly.
// Everything goes through server routes that use the service-role key and
// derive identity from the session. These tests try to break that contract
// with real client keys and then confirm, using the admin key, that nothing
// changed. Read docs/auth-testing.md before running.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  admin,
  anonClient,
  checkLiveEnvironment,
  cleanupTestData,
  createApplication,
  createDraft,
  createUser,
  pdfFile,
  signedInClient,
  uniqueEmail,
} from "./support/live.mjs";

const gate = checkLiveEnvironment();
const skip = gate.ok ? false : gate.reason;

// A result "denies" access when it errors OR returns/affects nothing.
const returnedRows = (result) => (Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0);

describe("live: Row Level Security and storage policies", { skip }, () => {
  let alice;
  let bob;
  let aliceApplication;
  let bobApplication;
  let draft;
  let aliceClient;
  const anon = () => anonClient();
  const alicePath = () => `applications/${alice.id}.pdf`;
  const bobPath = () => `applications/${bob.id}.pdf`;

  before(async () => {
    await cleanupTestData();
    alice = await createUser(uniqueEmail("rls-alice"));
    bob = await createUser(uniqueEmail("rls-bob"));
    aliceApplication = await createApplication(alice, { resume_path: `applications/${alice.id}.pdf` });
    bobApplication = await createApplication(bob, { resume_path: `applications/${bob.id}.pdf` });
    draft = await createDraft(uniqueEmail("rls-draft"));
    for (const path of [`applications/${alice.id}.pdf`, `applications/${bob.id}.pdf`]) {
      const { error } = await admin().storage.from("resumes").upload(path, new Uint8Array(64), { contentType: "application/pdf", upsert: true });
      assert.ifError(error);
    }
    aliceClient = await signedInClient(alice.email);
  });
  after(cleanupTestData);

  const tables = () => [
    ["applications", bobApplication.id],
    ["application_drafts", draft.id],
  ];

  for (const who of ["anon", "signed-in user"]) {
    const client = () => (who === "anon" ? anon() : aliceClient);

    describe(`tables, as ${who}`, () => {
      it("cannot read any rows (not even their own application)", async () => {
        for (const [table] of tables()) {
          const result = await client().from(table).select("*");
          assert.equal(returnedRows(result), 0, `${table} leaked rows to ${who}`);
        }
        const own = await client().from("applications").select("*").eq("user_id", alice.id);
        assert.equal(returnedRows(own), 0, "direct reads of one's own application are intentionally blocked");
      });

      it("cannot read another user's application by id", async () => {
        const result = await client().from("applications").select("*").eq("id", bobApplication.id);
        assert.equal(returnedRows(result), 0);
      });

      it("cannot insert rows", async () => {
        const attempts = [
          client().from("applications").insert({ ...aliceApplication, id: undefined, email: uniqueEmail("rls-forged"), user_id: alice.id }),
          client().from("application_drafts").insert({ email: uniqueEmail("rls-forged-draft"), payload: {} }),
        ];
        for (const result of await Promise.all(attempts)) assert.ok(result.error, `insert must be denied for ${who}`);
        const { data: leaked } = await admin().from("applications").select("id").ilike("email", "e2e-rls-forged%");
        assert.equal(leaked.length, 0);
      });

      it("cannot update rows, including their own", async () => {
        await client().from("applications").update({ last_name: "HACKED" }).eq("id", bobApplication.id);
        await client().from("applications").update({ last_name: "HACKED" }).eq("id", aliceApplication.id);
        await client().from("application_drafts").update({ claimed_at: new Date().toISOString() }).eq("id", draft.id);

        const { data: rows } = await admin().from("applications").select("id, last_name").in("id", [aliceApplication.id, bobApplication.id]);
        assert.ok(rows.every((row) => row.last_name === "Student"), "no application may be modified from the client");
        const { data: unchanged } = await admin().from("application_drafts").select("claimed_at").eq("id", draft.id).single();
        assert.equal(unchanged.claimed_at, null);
      });

      it("cannot delete rows", async () => {
        await client().from("applications").delete().eq("id", bobApplication.id);
        await client().from("application_drafts").delete().eq("id", draft.id);
        const { data: app } = await admin().from("applications").select("id").eq("id", bobApplication.id);
        const { data: drafts } = await admin().from("application_drafts").select("id").eq("id", draft.id);
        assert.equal(app.length, 1);
        assert.equal(drafts.length, 1);
      });
    });

    describe(`resume storage, as ${who}`, () => {
      it("cannot list the bucket", async () => {
        for (const folder of ["", "applications", "drafts"]) {
          const result = await client().storage.from("resumes").list(folder);
          assert.equal(returnedRows(result), 0, `listing '${folder}' leaked file names`);
        }
      });

      it("cannot download another user's (or their own) resume directly", async () => {
        for (const path of [bobPath(), alicePath()]) {
          const { data, error } = await client().storage.from("resumes").download(path);
          assert.ok(error || !data, `${path} must not be downloadable directly`);
        }
      });

      it("cannot create signed URLs", async () => {
        const result = await client().storage.from("resumes").createSignedUrl(bobPath(), 60);
        assert.ok(result.error || !result.data?.signedUrl);
      });

      it("cannot upload, overwrite or delete files", async () => {
        const evil = `applications/${alice.id}-evil.pdf`;
        const upload = await client().storage.from("resumes").upload(evil, pdfFile(), { upsert: true });
        assert.ok(upload.error, "uploads must be denied");

        await client().storage.from("resumes").upload(bobPath(), pdfFile(), { upsert: true });
        await client().storage.from("resumes").remove([bobPath(), alicePath()]);

        const { data: files } = await admin().storage.from("resumes").list("applications");
        const names = files.map((file) => file.name);
        assert.ok(names.includes(`${bob.id}.pdf`) && names.includes(`${alice.id}.pdf`), "files were deleted by a client");
        assert.ok(!names.includes(`${alice.id}-evil.pdf`));
      });
    });
  }

  describe("the resumes bucket itself", () => {
    it("is private, size-limited and restricted to PDF/DOC/DOCX", async () => {
      const { data, error } = await admin().storage.getBucket("resumes");
      assert.ifError(error);
      assert.equal(data.public, false, "a public bucket would expose every resume by URL");
      assert.equal(data.file_size_limit, 4194304);
      assert.deepEqual([...data.allowed_mime_types].sort(), [
        "application/msword",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]);
    });

    it("is not reachable through a public URL", async () => {
      const { data } = anon().storage.from("resumes").getPublicUrl(bobPath());
      const response = await fetch(data.publicUrl);
      assert.notEqual(response.status, 200);
    });
  });
});
