"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { safeNextPath } from "../../lib/safe-next";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

// Same-site, allow-listed pages only: see lib/safe-next.js for why the old
// startsWith("/") check let "/\evil.com" through.
function getSafeNextPath() {
  if (typeof window === "undefined") return "/portal";

  const next = new URLSearchParams(window.location.search).get("next");
  return safeNextPath(next, "/portal");
}

// Why someone was sent here from an emailed link (see lib/auth-callback.js).
const NOTICES = {
  confirm_link:
    "Sign in below to finish your application. If you just clicked the link in our email, your email is most likely confirmed already; the link simply couldn't sign you in here (it was opened in a different browser or device than the one you applied on, or it was already used). If sign-in says your email isn't confirmed, we'll offer to send a new link.",
  reset_link:
    "That password reset link couldn't be used here. It may have expired, or it was opened in a different browser than the one you requested it from. Use \"Forgot your password?\" below to get a new link, and open it in this browser.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  // Set when sign-in fails only because the email isn't confirmed yet.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("notice");
    setNotice(NOTICES[code] ?? "");
  }, []);

  async function handleResendConfirmation() {
    setStatus("submitting");
    try {
      const { error } = await getSupabaseBrowser().auth.resend({
        type: "signup",
        email: unconfirmedEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setStatus(error ? "error" : "success");
      setMessage(
        error
          ? "We couldn't send the email just now. Please wait a minute and try again."
          : `Sent. Check ${unconfirmedEmail} (and spam or junk) for the confirmation link.`,
      );
      if (!error) setUnconfirmedEmail("");
    } catch (error) {
      console.error("Resending the confirmation email failed:", error);
      setStatus("error");
      setMessage("We couldn't send the email just now. Please wait a minute and try again.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    setUnconfirmedEmail("");

    try {
      const { error } = await getSupabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus("error");
        // This used to say "Email or password is incorrect" for every error,
        // which sent applicants who simply hadn't clicked the confirmation
        // link yet off to reset a password that was fine.
        if (error.code === "email_not_confirmed") {
          setUnconfirmedEmail(email.trim().toLowerCase());
          setMessage(
            "Your email isn't confirmed yet. Click the link we emailed you (check spam or junk), or send a new one.",
          );
        } else if (error.status === 429 || error.code === "over_request_rate_limit") {
          setMessage("Too many sign-in attempts for now. Please wait a minute and try again.");
        } else {
          setMessage("Email or password is incorrect. Please try again.");
        }
        return;
      }

      window.location.replace(getSafeNextPath());
    } catch (error) {
      console.error("Login failed:", error);
      setStatus("error");
      setMessage("We couldn't sign you in. Please try again.");
    }
  }

  async function handleResetRequest(event) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "We couldn't process your request. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(data.message);
    } catch (error) {
      console.error("Password reset request failed:", error);
      setStatus("error");
      setMessage("We couldn't process your request. Please try again.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-eyebrow">MakeSB 2027 / Portal</p>
        <h1 id="login-title">Sign in</h1>
        <p className="auth-intro">
          Sign in to continue working on your MakeSB application.
        </p>

        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}

        <form
          className="auth-form"
          onSubmit={resetMode ? handleResetRequest : handleSubmit}
        >
          <label className="auth-field" htmlFor="login-email">
            <span>Email</span>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {!resetMode && (
            <label className="auth-field" htmlFor="login-password">
              <span>Password</span>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={status === "submitting"}
          >
            {status === "submitting"
              ? resetMode
                ? "Sending link..."
                : "Signing in..."
              : resetMode
                ? "Send reset link"
                : "Sign in"}
          </button>

          {message && (
            <p className="auth-message" data-status={status} role="alert">
              {message}
            </p>
          )}
          {unconfirmedEmail && !resetMode && (
            <button
              className="auth-text-button"
              type="button"
              onClick={handleResendConfirmation}
              disabled={status === "submitting"}
            >
              Resend confirmation email
            </button>
          )}
        </form>

        <p className="auth-footer">
          <button
            className="auth-text-button"
            type="button"
            onClick={() => {
              setResetMode((current) => !current);
              setStatus("idle");
              setMessage("");
            }}
          >
            {resetMode ? "Back to sign in" : "Forgot your password?"}
          </button>
        </p>
        <p className="auth-footer">
          Need an account? <Link href="/apply">Start your application</Link>
        </p>
      </section>
    </main>
  );
}
