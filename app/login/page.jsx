"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

const NOTICES = {
  confirm_link:
    "Your email address is confirmed. Sign in with the email and password you chose to continue your application.",
  reset_link:
    "That password reset link was opened in a different browser or has expired. Use \"Forgot your password?\" below to get a new one.",
};

function getSafeNextPath() {
  if (typeof window === "undefined") return "/portal";

  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/portal";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const notice = new URLSearchParams(window.location.search).get("notice");
    if (NOTICES[notice]) {
      setStatus("success");
      setMessage(NOTICES[notice]);
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const { error } = await getSupabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus("error");
        setMessage("Email or password is incorrect. Please try again.");
        return;
      }

      // Link a saved application to this account by its confirmed email. This
      // is what completes sign-up for someone who confirmed in a different
      // browser. A 404/409 just means there is nothing to link.
      await fetch("/api/apply/claim-draft", { method: "POST" }).catch(() => {});

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
            <p className="auth-message" role="alert">
              {message}
            </p>
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
