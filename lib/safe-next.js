// Where a `?next=` value is allowed to send the browser. Used by the sign-in
// page and by /api/apply/claim-draft, which both redirect to it.
//
// The old check (`startsWith("/") && !startsWith("//")`) was an open redirect:
// browsers and the URL parser treat a backslash as a slash and drop tabs and
// newlines, so "/\evil.com" and "/<tab>/evil.com" both resolve to
// https://evil.com/.
//
// This follows two real implementations (read, not recalled):
//  - Django's url_has_allowed_host_and_scheme, django/utils/http.py: reject
//    control characters, and treat "\" as "/" because browsers do.
//  - cal.com's getSafeRedirectUrl, packages/lib/getSafeRedirectUrl.ts: parse
//    the value with `new URL` and compare origins instead of pattern-matching
//    the string.
// On top of the same-origin check there is an allow-list, because the only
// real targets are the portal and two auth pages. No pure module, React or
// Node API is used here, so the browser bundle and `node --test` share it.

const BASE = "http://next.invalid";
const MAX_LENGTH = 512;
const ALLOWED_PATHS = new Set(["/portal", "/auth/confirmed", "/auth/reset"]);
const ALLOWED_PREFIXES = ["/portal/"];
// C0 controls (tab, newline, ...), DEL, and backslash.
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f\\]/;

/**
 * Returns a same-site path (path + query + hash) that is safe to redirect to,
 * or `fallback` when `value` is missing, malformed, off-site, or not one of
 * the pages a `next` is meant for.
 */
export function safeNextPath(value, fallback = null) {
  if (typeof value !== "string" || !value || value.length > MAX_LENGTH) {
    return fallback;
  }
  if (UNSAFE_CHARACTERS.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  let url;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;

  // `url.pathname` is normalized ("/portal/../x" is "/x" by now), so the
  // allow-list cannot be stepped out of with dot segments.
  const path = url.pathname;
  const allowed =
    ALLOWED_PATHS.has(path) ||
    ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!allowed) return fallback;

  return `${path}${url.search}${url.hash}`;
}
