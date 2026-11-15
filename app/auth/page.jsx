"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

const SECURE_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

const RESEND_COOLDOWN_SECONDS = 60;

// Supabase error codes -> words an applicant can act on. The raw messages
// ("email rate limit exceeded") read like the site is broken.
function signupErrorMessage(error) {
  const code = error?.code ?? "";
  const text = (error?.message ?? "").toLowerCase();
  if (code === "over_email_send_rate_limit" || text.includes("rate limit")) {
    return "We're sending a lot of confirmation emails right now. Your application is saved. Please wait a minute and try again.";
  }
  if (code === "user_already_exists" || code === "email_exists" || text.includes("already")) {
    return "An account already exists for this email. Sign in instead.";
  }
  if (code === "weak_password") {
    return "Please choose a stronger password: at least 12 characters with uppercase, lowercase, a number, and a symbol.";
  }
  if (code === "email_address_invalid" || code === "validation_failed") {
    return "That email address doesn't look right. Please check it and try again.";
  }
  if (code === "over_request_rate_limit") {
    return "Too many attempts from this network right now. Please wait a minute and try again.";
  }
  return error?.message || "We couldn't create your account. Please try again.";
}

export default function AuthPage() {
  const [email, setEmail] = useState("");
  // The second "Confirm email" and "Confirm password" boxes were removed to
  // shorten sign-up: the email is carried over from the application, and the
  // password has a Show toggle (and a reset link if it is mistyped).
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("loading");
  const [authState, setAuthState] = useState("checking");
  const [message, setMessage] = useState("");
  // Set once the confirmation email has been requested.
  const [sentTo, setSentTo] = useState("");
  const [resendWait, setResendWait] = useState(0);

  useEffect(() => {
    if (resendWait <= 0) return undefined;
    const timer = window.setTimeout(() => setResendWait((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendWait]);

  useEffect(() => {
    // The only error still sent here (lib/auth-callback.js). Links that can't
    // be used now go to /login?notice=..., and a claimed draft to /apply.
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "email_sync_failed") {
      setStatus("error");
      setMessage(
        "Your email was confirmed, but we couldn't sync your application. Please contact MakeSB support.",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAuthState() {
      const { data: { user } } = await getSupabaseBrowser().auth.getUser();
      if (user) {
        window.location.replace("/portal");
        return;
      }

      if (active) setAuthState("signed-out");
      const response = await fetch("/api/apply/draft");
      const data = await response.json().catch(() => ({}));
      if (response.ok && active) {
        setEmail(data.email);
        setStatus("idle");
      } else if (active) {
        setStatus("idle");
      }
    }

    loadAuthState().catch((error) => {
      if (active) {
        setStatus("error");
        setMessage(error.message);
      }
    });

    function handleConfirmation(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "makesb-auth-confirmed") return;
      setStatus("error");
      setMessage("Your email is confirmed. Sign in to continue your application.");
      window.setTimeout(() => window.location.replace("/login"), 1200);
    }

    window.addEventListener("message", handleConfirmation);

    return () => {
      active = false;
      window.removeEventListener("message", handleConfirmation);
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!SECURE_PASSWORD.test(password)) {
      setStatus("error");
      setMessage(
        "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.",
      );
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const preflightResponse = await fetch("/api/auth/prepare-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const preflight = await preflightResponse.json().catch(() => ({}));

      if (!preflightResponse.ok) {
        setStatus("error");
        setMessage(
          preflightResponse.status === 429
            ? "Too many attempts for now. Your application is saved. Please wait a few minutes and try again."
            : preflight.error || "Couldn't check your application status.",
        );
        return;
      }
      if (preflight.code === "no_application") {
        window.alert(
          "If this email has an application, we'll help you continue. Otherwise, please start an application first.",
        );
        window.location.replace("/apply");
        return;
      }
      if (preflight.code === "application_exists") {
        window.location.replace("/login");
        return;
      }

      const { data, error } = await getSupabaseBrowser().auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(signupErrorMessage(error));
        return;
      }

      // For an address that already has a confirmed account, Supabase answers
      // "success" with a placeholder user and sends NO email (so the address
      // can't be probed). An empty identities list is how to tell. Without
      // this check the applicant waited for an email that never came.
      if (!data.session && data.user && data.user.identities?.length === 0) {
        setStatus("error");
        setMessage("An account already exists for this email. Sign in instead, or reset your password from the sign-in page.");
        return;
      }

      if (!data.session) {
        setStatus("success");
        setSentTo(normalizedEmail);
        setResendWait(RESEND_COOLDOWN_SECONDS);
        setMessage("");
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

  async function handleResend() {
    if (resendWait > 0) return;
    setResendWait(RESEND_COOLDOWN_SECONDS);
    setMessage("");
    try {
      const { error } = await getSupabaseBrowser().auth.resend({
        type: "signup",
        email: sentTo,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setMessage(error ? signupErrorMessage(error) : "Sent again. It can take a minute to arrive.");
    } catch (error) {
      console.error("Resending the confirmation email failed:", error);
      setMessage("We couldn't resend the email. Please try again in a minute.");
    }
  }

  if (authState === "checking" || status === "loading") {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-busy="true">
          <p>Loading your application...</p>
        </section>
      </main>
    );
  }

  if (sentTo) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="confirm-title">
          <p className="auth-eyebrow">MakeSB 2027 / One last step</p>
          <h1 id="confirm-title">Check your email</h1>
          <p className="auth-intro">
            We sent a confirmation link to <strong>{sentTo}</strong>. Click it
            to finish your application. Your answers are already saved.
          </p>
          <p className="auth-password-help">
            Nothing after a couple of minutes? Check spam or junk, and search
            your inbox for "MakeSB".
          </p>
          <div className="auth-form">
            <button
              className="auth-submit"
              type="button"
              onClick={handleResend}
              disabled={resendWait > 0}
            >
              {resendWait > 0 ? `Resend email in ${resendWait}s` : "Resend email"}
            </button>
            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
          </div>
          <p className="auth-footer">
            Already confirmed? <Link href="/login">Sign in</Link>
          </p>
          <p className="auth-footer">
            Wrong address? <Link href="/apply">Start over with the right email</Link>
          </p>
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

          <label className="auth-field" htmlFor="signup-password">
            <span>Password</span>
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>

          <p className="auth-password-help">
            Use at least 12 characters with uppercase and lowercase letters, a
            number, and a symbol.
          </p>

          <label className="auth-checkbox" htmlFor="signup-show-password">
            <input
              id="signup-show-password"
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            <span>Show password</span>
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