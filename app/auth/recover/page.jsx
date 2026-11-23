"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    const notice = new URLSearchParams(window.location.search).get("notice");
    const fragment = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const fragmentExpired =
      fragment.get("error_code") === "otp_expired" ||
      fragment.get("error") === "access_denied";

    if (notice === "link_expired" || fragmentExpired) {
      setStatus("error");
      setMessage(
        "This confirmation link is invalid or has expired. Please request a new confirmation email.",
      );
    } else if (notice === "incomplete_link") {
      setStatus("error");
      setMessage(
        "This confirmation request is incomplete. Please request a new confirmation email.",
      );
    }
    getSupabaseBrowser().auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (user) {
        window.location.replace("/portal");
        return;
      }
      if (
        notice !== "incomplete_link" &&
        notice !== "link_expired" &&
        !fragmentExpired
      ) {
        setStatus("idle");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function sendRecoveryRequest() {
    setStatus("submitting");
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Couldn't process the recovery request.");
        return;
      }

      setResult(data);
      if (data.code === "logged_in") {
        window.location.replace("/portal");
        return;
      }
      if (data.code === "create_account") {
        window.location.replace(data.redirectTo);
        return;
      }
      if (data.code === "account_found") {
        window.location.replace(data.redirectTo);
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await sendRecoveryRequest();
  }

  if (status === "loading") {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-busy="true">
          <p role="status" aria-live="polite">
            Checking your sign-in status
            <span className="auth-loading-ellipsis" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="recover-title">
        <p className="auth-eyebrow">MakeSB 2027 / Application recovery</p>
        <h1 id="recover-title">Find your application</h1>
        <p className="auth-intro">
          Enter the email address you used to apply.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field" htmlFor="recovery-email">
            <span>Email</span>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="auth-submit"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Checking..." : "Find application"}
          </button>
        </form>

        {status === "error" && (
          <p className="auth-message" role="alert">{message}</p>
        )}

        {result?.code === "not_found" && (
          <div className="auth-recovery-result">
            <p className="auth-message" role="status">
              No matching application or saved draft was found for this email.
            </p>
            <p className="auth-footer">
              <Link href="/apply">Start a new application</Link>
            </p>
          </div>
        )}

        {result?.code === "account_found" && (
          <div className="auth-recovery-result">
            <p className="auth-success" role="status">
              A valid account was found for this email.
            </p>
            <p className="auth-footer">
              <Link href="/login">Go to sign in</Link>
            </p>
          </div>
        )}

        {result?.code === "draft_active" && (
          <div className="auth-recovery-result">
            <p className="auth-success" role="status">
              A saved application draft was found. Check your email for the
              confirmation link.
            </p>
            <p className="auth-footer">
              <button
                type="button"
                className="auth-text-button"
                disabled={status === "submitting"}
                onClick={sendRecoveryRequest}
              >
                Send a new confirmation email
              </button>
            </p>
          </div>
        )}

        {result?.code === "draft_expired" && (
          <div className="auth-recovery-result">
            <p className="auth-success" role="status">
              Your application draft has been restored for 30 minutes. A
              confirmation email was sent. Open it in this browser on this
              device within 30 minutes.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
