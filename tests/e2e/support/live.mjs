// Helpers for the LIVE end-to-end suite. These talk to a real Supabase project
// and a running copy of the site, and they create and delete real users, rows
// and files. Read docs/auth-testing.md before running them.
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const BASE_URL = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const STRONG_PASSWORD = "Correct-Horse-9!";
export const EMAIL_PREFIX = "e2e-";
export const EMAIL_DOMAIN = "@example.com";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function projectRef() {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return null;
  }
}

/**
 * Decide whether the live suite may run. Returns { ok: true } or
 * { ok: false, reason } where reason is shown as the reason for skipping.
 *
 * The suite creates and deletes users, so it refuses to run unless you have
 * typed the project ref of the TEST project yourself. Never use the MakeSB
 * production project here.
 */
export function checkLiveEnvironment() {
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", PUBLISHABLE_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    return { ok: false, reason: `live suite skipped: set ${missing.join(", ")} (see docs/auth-testing.md)` };
  }
  if (process.env.E2E_ALLOW_DESTRUCTIVE !== "yes") {
    return { ok: false, reason: "live suite skipped: set E2E_ALLOW_DESTRUCTIVE=yes to allow it to create and delete test data" };
  }
  const ref = projectRef();
  if (!ref || process.env.E2E_CONFIRM_PROJECT_REF !== ref) {
    return {
      ok: false,
      reason: `live suite skipped: set E2E_CONFIRM_PROJECT_REF=${ref ?? "<project ref>"} to confirm this is a disposable TEST project`,
    };
  }
  return { ok: true };
}

export const sendsEmails = () => process.env.E2E_SEND_EMAILS === "yes";

// --------------------------------------------------------------- clients

let adminClient;
export function admin() {
  adminClient ??= createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function anonClient() {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A supabase-js client signed in as the given user (RLS applies to it). */
export async function signedInClient(email, password = STRONG_PASSWORD) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

/** Cookie header, in the exact format the site's server code reads. */
export async function sessionCookie(email, password = STRONG_PASSWORD) {
  const jar = new Map();
  const client = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll(list) {
        for (const { name, value, options } of list) {
          if (!value || options?.maxAge === 0) jar.delete(name);
          else jar.set(name, value);
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

// ------------------------------------------------------------- HTTP helper

export async function api(path, { method = "GET", cookie, json, form, headers = {} } = {}) {
  const init = { method, redirect: "manual", headers: { ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (json !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(json);
  } else if (form) {
    init.body = form;
  }
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON (a redirect or HTML page)
  }
  return {
    status: response.status,
    body,
    location: response.headers.get("location"),
    setCookie: response.headers.getSetCookie?.() ?? [],
    headers: response.headers,
  };
}

export async function assertServerReachable() {
  try {
    await fetch(`${BASE_URL}/api/application`, { redirect: "manual" });
  } catch (error) {
    throw new Error(
      `Can't reach the site at ${BASE_URL}. Start it with "npm run dev" (using the TEST project's .env.local) or set E2E_BASE_URL. (${error.message})`,
    );
  }
}

// ----------------------------------------------------------- data builders

export function uniqueEmail(tag = "user") {
  return `${EMAIL_PREFIX}${tag}-${randomUUID().slice(0, 8)}${EMAIL_DOMAIN}`;
}

export async function createUser(email, { password = STRONG_PASSWORD, confirmed = true } = {}) {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: confirmed,
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  return data.user;
}

export function applicationRow(overrides = {}) {
  return {
    preferred_first_name: "Gaucho",
    last_name: "Student",
    email: uniqueEmail("app"),
    mobile_number: "805-555-0100",
    emergency_contact_name: "Parent Student",
    emergency_contact_mobile_number: "805-555-0101",
    major: "computer-engineering",
    year: "junior",
    age: "20",
    country: "united-states",
    school: "ucsb",
    waiver_accepted: true,
    prior_hackathon_experience: false,
    ...overrides,
  };
}

export async function createApplication(user, overrides = {}) {
  const row = { id: randomUUID(), user_id: user.id, ...applicationRow({ email: user.email }), ...overrides };
  const { error } = await admin().from("applications").insert(row);
  if (error) throw new Error(`createApplication failed: ${error.message}`);
  return row;
}

export async function createDraft(email, { expiresInMs = 30 * 60 * 1000, claimed = false, resumePath = null } = {}) {
  const row = {
    id: randomUUID(),
    email: email.toLowerCase(),
    payload: applicationRow({ email: email.toLowerCase() }),
    resume_path: resumePath,
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    claimed_at: claimed ? new Date().toISOString() : null,
  };
  const { error } = await admin().from("application_drafts").insert(row);
  if (error) throw new Error(`createDraft failed: ${error.message}`);
  return row;
}

export function pdfFile(name = "resume.pdf") {
  return new File([new Uint8Array(512)], name, { type: "application/pdf" });
}

export function applicationForm(email, overrides = {}) {
  const fields = {
    preferredFirstName: "Gaucho",
    lastName: "Student",
    email,
    mobileNumber: "805-555-0100",
    emergencyContactName: "Parent Student",
    emergencyContactMobileNumber: "805-555-0101",
    major: "computer-engineering",
    year: "junior",
    age: "20",
    country: "united-states",
    school: "ucsb",
    "food-allergies": "None",
    waiver: "on",
    experience: "no",
    resume: pdfFile(),
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.set(key, value);
  }
  return form;
}

// ------------------------------------------------------------------ cleanup

/** Remove everything the suite created (anything whose email starts with e2e-). */
export async function cleanupTestData() {
  const supabase = admin();
  const like = `${EMAIL_PREFIX}%${EMAIL_DOMAIN}`;

  const { data: apps } = await supabase.from("applications").select("id, resume_path").ilike("email", like);
  const { data: drafts } = await supabase.from("application_drafts").select("id, resume_path").ilike("email", like);
  const paths = [...(apps ?? []), ...(drafts ?? [])].map((row) => row.resume_path).filter(Boolean);

  // Files named after the user id (applications/<uid>-<uuid>.pdf) are found below.
  const users = [];
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    users.push(...data.users.filter((user) => user.email?.startsWith(EMAIL_PREFIX) && user.email.endsWith(EMAIL_DOMAIN)));
    if (data.users.length < 200) break;
  }
  for (const user of users) {
    const { data: files } = await supabase.storage.from("resumes").list("applications", { search: user.id });
    for (const file of files ?? []) paths.push(`applications/${file.name}`);
  }

  if (paths.length > 0) await supabase.storage.from("resumes").remove([...new Set(paths)]);
  await supabase.from("application_drafts").delete().ilike("email", like);
  await supabase.from("applications").delete().ilike("email", like);
  for (const user of users) await supabase.auth.admin.deleteUser(user.id);
}

export async function findApplication(userId) {
  const { data, error } = await admin().from("applications").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
