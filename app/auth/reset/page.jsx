"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";

const SECURE_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data: { user }, error }) => {
        if (!active) return;
        if (error || !user) {
          setStatus("error");
          setMessage("This password reset link is invalid or has expired.");
          return;
        }
        setStatus("ready");
      })
      .catch((error) => {
        console.error("Password reset session check failed:", error);
        if (active) {
          setStatus("error");
          setMessage("This password reset link is invalid or has expired.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!SECURE_PASSWORD.test(password)) {
      setStatus("error");
      setMessage(
        "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    const { error } = await getSupabaseBrowser().auth.updateUser({ password });
    if (error) {
      console.error("Password reset failed:", error);
      setStatus("error");
      setMessage(
        error.message.toLowerCase().includes("expired")
          ? "This password reset link has expired. Please request a new one."
          : "We couldn't update your password. Please request a new reset link.",
      );
      return;
    }

    await getSupabaseBrowser().auth.signOut();
    setStatus("success");
    setMessage("Your password has been updated. Redirecting to sign in...");
    window.setTimeout(() => window.location.replace("/login"), 1200);
  }

  if (status === "checking") {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-busy="true">
          <p>Checking your password reset link...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <p className="auth-eyebrow">MakeSB 2027 / Account recovery</p>
        <h1 id="reset-title">Set a new password</h1>
        <p className="auth-intro">
          Choose a new password for your MakeSB portal account.
        </p>

        {status === "error" && (
          <p className="auth-message" role="alert">{message}</p>
        )}

        {status !== "error" || password || confirmPassword ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field" htmlFor="reset-password">
              <span>New password</span>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                required
              />
            </label>
            <p className="auth-password-help">
              Use at least 12 characters with uppercase and lowercase letters, a
              number, and a symbol.
            </p>
            <label className="auth-field" htmlFor="reset-confirm-password">
              <span>Confirm password</span>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={12}
                required
              />
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Updating password..." : "Update password"}
            </button>
            {status === "success" && (
              <p className="auth-success" role="status">{message}</p>
            )}
          </form>
        ) : null}
      </section>
    </main>
  );
}
