// In-memory stand-in for Supabase: tables, storage, auth users, and the
// scripted behaviour (rate limits, one-shot failures) the tests need.
//
// It enforces the same rules the real database does for the parts these
// routes rely on: unique constraints (lower(email), user_id), `ilike` wildcard
// semantics, and `maybeSingle()` erroring when more than one row matches.
import { randomUUID } from "node:crypto";

export const db = {
  tables: { applications: [], application_drafts: [] },
  storage: new Map(), // "bucket/path" -> { contentType, size }
  users: new Map(), // id -> { id, email, password, email_confirmed_at }
  currentUserId: null,
  codes: new Map(), // auth code -> { userId } | { error }
  rateLimited: new Set(), // limiter names that currently deny
  failures: new Map(), // "table.op" -> error (consumed once)
  calls: [], // log of side effects worth asserting on
  emailChanges: [],
  resetRequests: [],
  revalidated: [],
};

export function resetDb() {
  db.tables.applications.length = 0;
  db.tables.application_drafts.length = 0;
  db.storage.clear();
  db.users.clear();
  db.currentUserId = null;
  db.codes.clear();
  db.rateLimited.clear();
  db.failures.clear();
  db.calls.length = 0;
  db.emailChanges.length = 0;
  db.resetRequests.length = 0;
  db.revalidated.length = 0;
}

export function failNext(key, error = { message: "injected failure", code: "XX000" }) {
  db.failures.set(key, error);
}

function takeFailure(key) {
  const error = db.failures.get(key);
  if (error) db.failures.delete(key);
  return error ?? null;
}

// ---------------------------------------------------------------- seeding

export function addUser({
  email,
  password = "Correct-Horse-9!",
  confirmed = true,
  id = randomUUID(),
} = {}) {
  const user = {
    id,
    email: email.toLowerCase(),
    password,
    email_confirmed_at: confirmed ? new Date().toISOString() : null,
  };
  db.users.set(id, user);
  return user;
}

export function signInAs(user) {
  db.currentUserId = user ? user.id : null;
}

export function applicationRow(overrides = {}) {
  return {
    preferred_first_name: "Gaucho",
    last_name: "Student",
    email: "gaucho@ucsb.edu",
    mobile_number: "805-555-0100",
    emergency_contact_name: "Parent Student",
    emergency_contact_mobile_number: "805-555-0101",
    major: "computer-engineering",
    year: "junior",
    age: "20",
    country: "united-states",
    school: "ucsb",
    food_allergies: null,
    waiver_accepted: true,
    prior_hackathon_experience: false,
    resume_path: null,
    ...overrides,
  };
}

export function addApplication({ user, ...overrides } = {}) {
  const row = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    user_id: user ? user.id : null,
    ...applicationRow(user ? { email: user.email } : {}),
    ...overrides,
  };
  db.tables.applications.push(row);
  return row;
}

export function addDraft({
  email = "gaucho@ucsb.edu",
  expiresInMs = 30 * 60 * 1000,
  claimed = false,
  resumePath = null,
  payload,
  id = randomUUID(),
} = {}) {
  const row = {
    id,
    email: email.toLowerCase(),
    payload: payload ?? applicationRow({ email: email.toLowerCase() }),
    resume_path: resumePath,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    claimed_at: claimed ? new Date().toISOString() : null,
  };
  db.tables.application_drafts.push(row);
  if (resumePath) db.storage.set(`resumes/${resumePath}`, { contentType: "application/pdf", size: 1 });
  return row;
}

// ------------------------------------------------------------ query builder

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Postgres LIKE semantics: % = any run, _ = any one char, backslash escapes.
function likeToRegExp(pattern) {
  let source = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "\\" && i + 1 < pattern.length) {
      source += escapeRegExp(pattern[(i += 1)]);
    } else if (char === "%") {
      source += ".*";
    } else if (char === "_") {
      source += ".";
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`${source}$`, "is");
}

const UNIQUE_VIOLATION = {
  code: "23505",
  message: "duplicate key value violates unique constraint",
};

function violatesUnique(table, candidate, ignoreRow) {
  if (table !== "applications") return false;
  return db.tables.applications.some((row) => {
    if (row === ignoreRow) return false;
    if (row.email?.toLowerCase() === candidate.email?.toLowerCase()) return true;
    if (candidate.user_id && row.user_id === candidate.user_id) return true;
    return false;
  });
}

class Query {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.cols = "*";
    this.sort = null;
    this.max = null;
    this.mode = "many";
    this.returning = false;
  }

  select(cols = "*") {
    this.cols = cols;
    if (this.op !== "select") this.returning = true;
    return this;
  }
  insert(payload) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column, value) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  is(column, value) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  gt(column, value) {
    this.filters.push((row) => row[column] != null && new Date(row[column]) > new Date(value));
    return this;
  }
  ilike(column, pattern) {
    const regex = likeToRegExp(pattern);
    this.filters.push((row) => typeof row[column] === "string" && regex.test(row[column]));
    return this;
  }
  order(column, { ascending = true } = {}) {
    this.sort = { column, ascending };
    return this;
  }
  limit(count) {
    this.max = count;
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }

  then(resolve, reject) {
    // Yield once so concurrent requests interleave like real network calls.
    return new Promise((done) => setImmediate(done))
      .then(() => this.execute())
      .then(resolve, reject);
  }

  project(row) {
    if (this.cols === "*" || !this.cols) return { ...row };
    const picked = {};
    for (const name of this.cols.split(",").map((part) => part.trim())) {
      picked[name] = row[name];
    }
    return picked;
  }

  execute() {
    const failure = takeFailure(`${this.table}.${this.op}`);
    if (failure) return { data: null, error: failure };

    const rows = db.tables[this.table];
    const matches = () => rows.filter((row) => this.filters.every((test) => test(row)));
    let affected;

    if (this.op === "insert") {
      affected = [];
      for (const input of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        const row = {
          id: randomUUID(),
          created_at: new Date().toISOString(),
          ...(this.table === "application_drafts"
            ? {
                expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                claimed_at: null,
              }
            : { user_id: null }),
          ...structuredClone(input),
        };
        if (violatesUnique(this.table, row, null)) {
          return { data: null, error: { ...UNIQUE_VIOLATION } };
        }
        rows.push(row);
        affected.push(row);
      }
    } else if (this.op === "update") {
      affected = matches();
      for (const row of affected) {
        const next = { ...row, ...structuredClone(this.payload) };
        if (violatesUnique(this.table, next, row)) {
          return { data: null, error: { ...UNIQUE_VIOLATION } };
        }
      }
      for (const row of affected) Object.assign(row, structuredClone(this.payload));
    } else if (this.op === "delete") {
      affected = matches();
      for (const row of affected) rows.splice(rows.indexOf(row), 1);
    } else {
      affected = matches();
    }

    if (this.sort) {
      const { column, ascending } = this.sort;
      affected = [...affected].sort((a, b) =>
        a[column] < b[column] ? (ascending ? -1 : 1) : a[column] > b[column] ? (ascending ? 1 : -1) : 0,
      );
    }
    if (this.max != null) affected = affected.slice(0, this.max);

    const wantsRows = this.op === "select" || this.returning;
    if (!wantsRows) return { data: null, error: null };

    const projected = affected.map((row) => this.project(row));
    if (this.mode === "maybe") {
      if (projected.length > 1) {
        return { data: null, error: { code: "PGRST116", message: "multiple rows returned" } };
      }
      return { data: projected[0] ?? null, error: null };
    }
    if (this.mode === "single") {
      if (projected.length !== 1) {
        return { data: null, error: { code: "PGRST116", message: "expected one row" } };
      }
      return { data: projected[0], error: null };
    }
    return { data: projected, error: null };
  }
}

// ------------------------------------------------------------------ storage

function storageBucket(bucket) {
  return {
    async upload(path, body, options = {}) {
      const failure = takeFailure("storage.upload");
      if (failure) return { data: null, error: failure };
      const key = `${bucket}/${path}`;
      if (db.storage.has(key) && !options.upsert) {
        return { data: null, error: { message: "The resource already exists" } };
      }
      db.storage.set(key, { contentType: options.contentType, size: body?.byteLength ?? 0 });
      return { data: { path }, error: null };
    },
    async move(from, to) {
      const failure = takeFailure("storage.move");
      if (failure) return { data: null, error: failure };
      const source = `${bucket}/${from}`;
      if (!db.storage.has(source)) {
        return { data: null, error: { message: "Object not found" } };
      }
      db.storage.set(`${bucket}/${to}`, db.storage.get(source));
      db.storage.delete(source);
      return { data: { message: "Successfully moved" }, error: null };
    },
    async remove(paths) {
      const failure = takeFailure("storage.remove");
      if (failure) return { data: null, error: failure };
      for (const path of paths) db.storage.delete(`${bucket}/${path}`);
      return { data: paths.map((name) => ({ name })), error: null };
    },
  };
}

// ------------------------------------------------------------- admin client

export function createAdminClient() {
  return {
    from: (table) => new Query(table),
    storage: { from: storageBucket },
    auth: {
      admin: {
        async updateUserById(id, attributes) {
          const failure = takeFailure("auth.admin.updateUserById");
          if (failure) return { data: null, error: failure };
          const user = db.users.get(id);
          if (!user) return { data: null, error: { message: "User not found" } };
          if (attributes.password) user.password = attributes.password;
          db.calls.push({ type: "admin.updateUserById", id, fields: Object.keys(attributes) });
          return { data: { user }, error: null };
        },
      },
    },
  };
}

export function publicUser(user) {
  return user
    ? { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at }
    : null;
}
