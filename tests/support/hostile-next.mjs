// `?next=` values that must never take the browser off the site. Shared by the
// unit test of lib/safe-next.js and the claim-draft route test.
//
// These are the DECODED values (what searchParams.get("next") returns), so
// "/%5Cevil.com" in a link is the "/\\evil.com" entry here.
export const HOSTILE_NEXT = [
  // Backslashes: browsers and the URL parser read "\" as "/".
  "/\\evil.com",
  "/\\\\evil.com",
  "\\\\evil.com",
  "\\/evil.com",
  "/\\/evil.com",
  "/portal\\..\\..\\\\evil.com",
  "/portal/..\\\\evil.com",
  "/portal\\@evil.com",
  // Protocol-relative.
  "//evil.com",
  "///evil.com",
  "////evil.com/portal",
  "//evil.com/portal",
  "//evil.com\\@makesb.org/portal",
  // Tabs and newlines are dropped by the URL parser, so these are "//evil.com".
  "/\t/evil.com",
  "/\n/evil.com",
  "/\r/evil.com",
  "/\r\n/evil.com",
  "\t//evil.com",
  "/\t\\evil.com",
  "/portal\t/../..//evil.com",
  "\u0000//evil.com",
  "/\u0000/evil.com",
  // Leading whitespace is trimmed by the URL parser.
  " //evil.com",
  " /\\evil.com",
  " https://evil.com",
  // Dot segments that normalize to a protocol-relative path.
  "/.//evil.com",
  "/portal/..//evil.com",
  "/portal/../..//evil.com",
  "/portal/%2e%2e//evil.com",
  // Absolute URLs and other schemes.
  "https://evil.com",
  "https://evil.com/portal",
  "http://evil.com",
  "HTTPS://EVIL.COM",
  "https:evil.com",
  "https:/evil.com",
  "https:\\\\evil.com",
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "java\tscript:alert(1)",
  " javascript:alert(1)",
  "/javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "mailto:team@evil.com",
  // Credentials / host confusion.
  "https://makesb.org@evil.com/portal",
  "https://makesb.org.evil.com/portal",
  "//makesb.org@evil.com",
  "/@evil.com",
  "@evil.com",
  // Still-encoded after one decode (a double-encoded link).
  "/%5Cevil.com",
  "/%2F%2Fevil.com",
  "%2F%2Fevil.com",
  "/%09/evil.com",
  "%5C%5Cevil.com",
  // Look-alike slashes.
  "/∕evil.com",
  "／／evil.com",
  "/＼evil.com",
  // Same-site, but not a page a `next` is meant for.
  "/",
  "/apply",
  "/login",
  "/login?next=//evil.com",
  "/api/apply/claim-draft?next=/portal",
  "/api/settings",
  "/portalx",
  "/portal.evil.com",
  "/auth/confirmed/../../apply",
  "/auth",
  // Not paths at all.
  "",
  " ",
  "portal",
  "evil.com",
  "?next=//evil.com",
  "#//evil.com",
  `/portal/${"a".repeat(600)}`,
];

// Not strings: a missing parameter, or a value that was never a query string.
export const NOT_STRINGS = [null, undefined, 0, 42, true, {}, [], ["/portal"], { toString: () => "/portal" }];
