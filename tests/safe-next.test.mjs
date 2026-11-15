// lib/safe-next.js decides where `?next=` may send the browser after sign-in
// (app/login/page.jsx) and after a draft is linked (/api/apply/claim-draft).
// The check it replaced let "/\evil.com" redirect off the site.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safeNextPath } from "../lib/safe-next.js";
import { HOSTILE_NEXT, NOT_STRINGS } from "./support/hostile-next.mjs";

const SITE = "https://makesb.org";

// What the browser (window.location.replace) and the route handler
// (NextResponse.redirect(new URL(path, origin))) both do with the result.
const landsOn = (path) => new URL(path, `${SITE}/api/apply/claim-draft`);

test("the old check really was an open redirect (why this helper exists)", () => {
  const old = (next) => (next?.startsWith("/") && !next.startsWith("//") ? next : null);
  for (const next of ["/\\evil.com", "/\t/evil.com", "/\n/evil.com"]) {
    assert.equal(landsOn(old(next)).origin, "https://evil.com", JSON.stringify(next));
  }
});

test("the real targets pass through unchanged", () => {
  for (const next of [
    "/portal",
    "/portal/",
    "/portal/application",
    "/portal/profile",
    "/portal/settings",
    "/auth/confirmed",
    "/auth/reset",
    "/portal/application?tab=resume",
    "/portal/application#resume",
    "/portal?welcome=1#top",
  ]) {
    assert.equal(safeNextPath(next), next);
    assert.equal(safeNextPath(next, "/portal"), next);
  }
});

test("hostile values are refused, with or without a fallback", () => {
  for (const next of HOSTILE_NEXT) {
    assert.equal(safeNextPath(next), null, JSON.stringify(next));
    assert.equal(safeNextPath(next, "/portal"), "/portal", JSON.stringify(next));
  }
});

test("values that are not strings are refused", () => {
  for (const next of NOT_STRINGS) {
    assert.equal(safeNextPath(next), null, String(next));
    assert.equal(safeNextPath(next, "/portal"), "/portal", String(next));
  }
});

test("whatever it returns stays on the site and on an allowed page", () => {
  const dotted = [
    "/portal/./application",
    "/portal/x/../application",
    "/portal/%2F%2Fevil.com",
    "/portal//evil.com",
    "/portal/@evil.com",
    "/portal/https://evil.com",
    "/portal/application?next=//evil.com",
    "/portal/application?url=https://evil.com#//evil.com",
  ];
  for (const next of [...HOSTILE_NEXT, ...dotted]) {
    const result = safeNextPath(next, "/portal");
    const url = landsOn(result);
    assert.equal(url.origin, SITE, `${JSON.stringify(next)} -> ${result} -> ${url.href}`);
    assert.ok(
      url.pathname === "/portal" || url.pathname.startsWith("/portal/"),
      `${JSON.stringify(next)} -> ${url.pathname}`,
    );
    assert.ok(result.startsWith("/") && !result.startsWith("//"), result);
    assert.ok(!/[\\\u0000-\u001f]/.test(result), JSON.stringify(result));
  }
  // Dot segments are resolved before the allow-list is applied.
  assert.equal(safeNextPath("/portal/x/../application"), "/portal/application");
  assert.equal(safeNextPath("/portal/../apply"), null);
  assert.equal(safeNextPath("/auth/reset/../../apply"), null);
});

test("every percent-encoded form of the exploit is refused once decoded by the query parser", () => {
  for (const raw of [
    "/%5Cevil.com",
    "%2F%5Cevil.com",
    "/%5c%5cevil.com",
    "%2F%2Fevil.com",
    "/%09/evil.com",
    "/%0A/evil.com",
    "/%0D%0A/evil.com",
    "%5C%5Cevil.com",
    "https%3A%2F%2Fevil.com",
    "javascript%3Aalert(1)",
    "%09%2F%2Fevil.com",
    "%20%2F%2Fevil.com",
  ]) {
    const next = new URL(`${SITE}/login?next=${raw}`).searchParams.get("next");
    assert.equal(safeNextPath(next), null, raw);
    assert.equal(landsOn(safeNextPath(next, "/portal")).href, `${SITE}/portal`, raw);
  }
});

test("both callers use the shared helper and neither keeps the old startsWith check", () => {
  for (const file of ["../app/login/page.jsx", "../app/api/apply/claim-draft/route.js"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /from "(\.\.\/)+lib\/safe-next"/, file);
    assert.match(source, /safeNextPath\(/, file);
    assert.ok(!source.includes('startsWith("//")'), `${file} still has its own check`);
  }
});
