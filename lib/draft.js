// Shared settings for pending application drafts (public.application_drafts).
//
// A draft is the saved /apply form before it is linked to an account. It used
// to live for only 30 minutes, and could only be claimed from the browser
// holding the draft cookie. Applicants who confirmed their email later, or on
// another device (laptop form, phone inbox), lost their application. Now:
//   - drafts live for DRAFT_TTL_DAYS, set explicitly on insert (the database
//     default of 30 minutes is no longer relied on), and
//   - a draft is claimed by the account whose CONFIRMED email matches it, so
//     the cookie is only a convenience (it pre-fills the email on /auth).
export const DRAFT_COOKIE = "makesb_application_draft";
export const DRAFT_TTL_DAYS = 30;
export const DRAFT_TTL_MS = DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
// The cookie holds only a random draft id. A week is long enough to come back
// and create the account from the same browser.
export const DRAFT_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export function draftCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_COOKIE_MAX_AGE,
  };
}

export function draftExpiresAt(now = Date.now()) {
  return new Date(now + DRAFT_TTL_MS).toISOString();
}
