"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

const SECURE_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "confirmation_failed") {
      setStatus("error");
      setMessage("We couldn't confirm your email. Please request a new confirmation email.");
    } else if (error === "missing_code") {
      setStatus("error");
      setMessage("That confirmation link is incomplete. Please request a new one.");
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/apply/draft")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "No application draft found.");
        if (active) {
          setEmail(data.email);
          setStatus("idle");
        }
      })
      .catch((error) => {
        if (active) {
          setStatus("error");
          setMessage(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== confirmEmail.trim().toLowerCase()) {
      setStatus("error");
      setMessage("Email addresses do not match.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (!SECURE_PASSWORD.test(password)) {
      setStatus("error");
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.",
      );
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const { data, error } = await getSupabaseBrowser().auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        setStatus("success");
        setMessage(
          "Your account was created. Check your email to confirm your account. We will continue your application after confirmation.",
        );
        return;
      }

      const claimResponse = await fetch("/api/apply/claim-draft", {
        method: "POST",
      });
      const claimData = await claimResponse.json().catch(() => ({}));

      if (!claimResponse.ok) {
        setStatus("error");
        setMessage(claimData.error || "We couldn't finish creating your application.");
        return;
      }

      window.location.replace("/portal/application");
    } catch (error) {
      console.error("Signup failed:", error);
      setStatus("error");
      setMessage("We couldn't create your account. Please try again.");
    }
  }

  if (status === "loading") {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-busy="true">
          <p>Loading your application...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <p className="auth-eyebrow">MakeSB 2027 / Create account</p>
        <h1 id="signup-title">Secure your application</h1>
        <p className="auth-intro">
          Create an account to save your application and finish it in the portal.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field" htmlFor="signup-email">
            <span>Email</span>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="auth-field" htmlFor="signup-confirm-email">
            <span>Confirm email</span>
            <input
              id="signup-confirm-email"
              type="email"
              autoComplete="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              required
            />
          </label>

          <label className="auth-field" htmlFor="signup-password">
            <span>Password</span>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          <p className="auth-password-help">
            Use 8 or more characters with uppercase and lowercase letters, a
            number, and a symbol.
          </p>

          <label className="auth-field" htmlFor="signup-confirm-password">
            <span>Confirm password</span>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          <button
            className="auth-submit"
            type="submit"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p className="auth-message" data-status={status} role="alert">
              {message}
            </p>
          )}
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}