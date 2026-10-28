"use client";

import { useState } from "react";
import { usePortalAccount } from "./account";

export function AccountSettings() {
  const { account, setAccount } = usePortalAccount();
  const [profile, setProfile] = useState(account);
  const [pending, setPending] = useState(null);
  const [feedback, setFeedback] = useState({});

  async function submit(event, section) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setFeedback((previous) => ({ ...previous, [section]: null }));

    if (
      section === "password" &&
      values.newPassword !== values.confirmPassword
    ) {
      setFeedback((previous) => ({
        ...previous,
        password: { error: true, text: "Your new passwords don’t match." },
      }));
      return;
    }
    if (
      section === "email" &&
      values.email.trim().toLowerCase() === profile.email.toLowerCase()
    ) {
      setFeedback((previous) => ({
        ...previous,
        email: { error: true, text: "Enter a different email address." },
      }));
      return;
    }

    setPending(section);
    const previousAccount = account;
    const optimisticProfile =
      section === "profile"
        ? {
            ...account,
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
          }
        : account;
    if (section === "profile") {
      setAccount(optimisticProfile);
      setProfile(optimisticProfile);
    }
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "We couldn't save your changes. Please try again.");
      }
      if (section === "profile") {
        setAccount((previous) => ({ ...previous, ...data.account }));
        setProfile((previous) => ({ ...previous, ...data.account }));
      }
      setFeedback((previous) => ({
        ...previous,
        [section]: {
          text: section === "email"
            ? data.message
            : "Your changes have been saved.",
        },
      }));
      if (section !== "profile") form.reset();
    } catch (error) {
      if (section === "profile") {
        setAccount(previousAccount);
        setProfile(previousAccount);
      }
      setFeedback((previous) => ({
        ...previous,
        [section]: {
          error: true,
          text: error.message,
        },
      }));
    } finally {
      setPending(null);
    }
  }

  function Status({ section }) {
    const message = feedback[section];
    return message ? (
      <p
        className={message.error ? "portal-error" : "portal-success"}
        role={message.error ? "alert" : "status"}
      >
        {message.text}
      </p>
    ) : null;
  }

  function SaveButton({ section, children }) {
    return (
      <button
        className="portal-button"
        disabled={pending !== null}
        type="submit"
      >
        {pending === section ? "Saving…" : children}
      </button>
    );
  }

  return (
    <main id="account-main" className="portal-main">
      <p className="portal-eyebrow">MakeSB 2027 / Your account</p>
      <h1>Account settings</h1>
      <p className="portal-intro">
        Update your personal details, email, and password.
      </p>
      <section className="portal-card" aria-labelledby="profile-heading">
        <div className="portal-card-heading">
          <h2 id="profile-heading">Personal details</h2>
          <p>The name on your application.</p>
        </div>
        <form onSubmit={(event) => submit(event, "profile")}>
          <div className="portal-fields">
            <label>
              Preferred first name
              <input
                name="firstName"
                autoComplete="given-name"
                defaultValue={account.firstName}
                required
                maxLength={80}
                pattern=".*\S.*"
              />
            </label>
            <label>
              Last name
              <input
                name="lastName"
                autoComplete="family-name"
                defaultValue={account.lastName}
                required
                maxLength={80}
                pattern=".*\S.*"
              />
            </label>
          </div>
          <Status section="profile" />
          <div className="portal-form-footer">
            <span>These details appear in your applicant profile.</span>
            <SaveButton section="profile">
              Save changes
            </SaveButton>
          </div>
        </form>
      </section>
      <section className="portal-card" aria-labelledby="email-heading">
        <div className="portal-card-heading">
          <h2 id="email-heading">Email address</h2>
          <p>Use this address to sign in and receive event updates.</p>
        </div>
        <p className="portal-current-email">
          Current email <strong>{profile.email}</strong>
        </p>
        <form onSubmit={(event) => submit(event, "email")}>
          <div className="portal-fields">
            <label>
              New email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </label>
            <label>
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <Status section="email" />
          <div className="portal-form-footer">
            <span>You’ll need to confirm your new email address.</span>
            <SaveButton section="email">
              Update email
            </SaveButton>
          </div>
        </form>
      </section>
      <section className="portal-card" aria-labelledby="password-heading">
        <div className="portal-card-heading">
          <h2 id="password-heading">Password</h2>
          <p>Choose a strong password for your account.</p>
        </div>
        <form onSubmit={(event) => submit(event, "password")}>
          <div className="portal-fields">
            <label className="portal-full-width">
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                aria-describedby="password-hint"
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
          </div>
          <Status section="password" />
          <div className="portal-form-footer">
            <span id="password-hint">
              Use at least 12 characters with uppercase and lowercase letters, a
              number, and a symbol.
            </span>
            <SaveButton section="password">
              Update password
            </SaveButton>
          </div>
        </form>
      </section>
    </main>
  );
}
