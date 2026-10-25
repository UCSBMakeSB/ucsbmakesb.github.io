"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./account-settings.module.css";

const previewAccount = {
  firstName: "Alex",
  lastName: "Rivera",
  email: "alex@example.com",
};

// Pass the authenticated account and backend actions from the portal when ready.
// Actions should reject with a user-safe error message when an update fails.
export function AccountSettings({ account = previewAccount, actions }) {
  const [profile, setProfile] = useState(account);
  const [pending, setPending] = useState(null);
  const [feedback, setFeedback] = useState({});
  const isPreview = !actions;

  async function submit(event, section) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setFeedback((previous) => ({ ...previous, [section]: null }));

    if (section === "password" && values.newPassword !== values.confirmPassword) {
      setFeedback((previous) => ({ ...previous, password: { error: true, text: "Your new passwords don’t match." } }));
      return;
    }
    if (section === "email" && values.email.trim().toLowerCase() === profile.email.toLowerCase()) {
      setFeedback((previous) => ({ ...previous, email: { error: true, text: "Enter a different email address." } }));
      return;
    }

    setPending(section);
    try {
      if (isPreview) {
        if (section === "profile") setProfile((previous) => ({ ...previous, firstName: values.firstName.trim(), lastName: values.lastName.trim() }));
        setFeedback((previous) => ({ ...previous, [section]: { text: section === "profile" ? "Profile preview updated. Changes reset when you reload." : "Form checked. Connect account services to save this change." } }));
      } else {
        if (section === "profile") {
          const updated = await actions.updateProfile({ firstName: values.firstName.trim(), lastName: values.lastName.trim() });
          setProfile((previous) => ({ ...previous, ...updated }));
        } else if (section === "email") {
          await actions.updateEmail({ email: values.email.trim(), currentPassword: values.currentPassword });
        } else {
          await actions.updatePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        }
        setFeedback((previous) => ({ ...previous, [section]: { text: section === "email" ? "Check your inbox to confirm your email change. Your current email stays active until confirmation." : "Your changes have been saved." } }));
      }
      if (section !== "profile") form.reset();
    } catch {
      setFeedback((previous) => ({ ...previous, [section]: { error: true, text: "We couldn’t save your changes. Please try again." } }));
    } finally {
      setPending(null);
    }
  }

  function Status({ section }) {
    const message = feedback[section];
    return message ? <p className={message.error ? styles.error : styles.success} role={message.error ? "alert" : "status"}>{message.text}</p> : null;
  }

  function SaveButton({ section, children }) {
    return <button className={styles.button} disabled={pending !== null} type="submit">{pending === section ? "Saving…" : children}</button>;
  }

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#account-main">Skip to account settings</a>
      <header className={styles.header}>
        <a href="/" className={styles.brand} aria-label="MakeSB home"><Image src="/assets/makesb-logo-v2.png" width={1688} height={1040} alt="MakeSB" priority /><span>Hacker portal</span></a>
        <span className={styles.event}>JAN 15–17, 2027 <span> / </span> UC SANTA BARBARA</span>
        <a href="https://linktr.ee/ucsbmakesb" className={styles.help}>Need help? ↗</a>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Portal navigation">
          <p className={styles.eyebrow}>Hacker portal</p>
          <nav><a href="/portal/settings" aria-current="page" className={styles.selected}>Account settings <span aria-hidden="true">→</span></a></nav>
          <a className={styles.backLink} href="/">← Back to MakeSB</a>
          <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{profile.firstName.slice(0, 1)}{profile.lastName.slice(0, 1)}</span><div><strong>{profile.firstName} {profile.lastName}</strong><small>{profile.email}</small></div></div>
        </aside>
        <main id="account-main" className={styles.main}>
          <p className={styles.eyebrow}>MakeSB 2027 / Your account</p>
          <h1>Account settings</h1>
          <p className={styles.intro}>Update your personal details, email, and password.</p>
          {isPreview && <p className={styles.preview}><strong>Preview mode</strong> You’re viewing a sample account. Account services aren’t connected yet.</p>}
          <section className={styles.card} aria-labelledby="profile-heading">
            <div className={styles.cardHeading}><h2 id="profile-heading">Personal details</h2><p>The name on your application.</p></div>
            <form onSubmit={(event) => submit(event, "profile")}>
              <div className={styles.fields}>
                <label>Preferred first name<input name="firstName" autoComplete="given-name" defaultValue={account.firstName} required maxLength={80} pattern=".*\S.*" /></label>
                <label>Last name<input name="lastName" autoComplete="family-name" defaultValue={account.lastName} required maxLength={80} pattern=".*\S.*" /></label>
              </div>
              <Status section="profile" />
              <div className={styles.formFooter}><span>These details appear in your applicant profile.</span><SaveButton section="profile">{isPreview ? "Preview changes" : "Save changes"}</SaveButton></div>
            </form>
          </section>
          <section className={styles.card} aria-labelledby="email-heading">
            <div className={styles.cardHeading}><h2 id="email-heading">Email address</h2><p>Use this address to sign in and receive event updates.</p></div>
            <p className={styles.currentEmail}>Current email <strong>{profile.email}</strong></p>
            <form onSubmit={(event) => submit(event, "email")}>
              <div className={styles.fields}>
                <label>New email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>
                <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
              </div>
              <Status section="email" />
              <div className={styles.formFooter}><span>You’ll need to confirm your new email address.</span><SaveButton section="email">{isPreview ? "Check email change" : "Update email"}</SaveButton></div>
            </form>
          </section>
          <section className={styles.card} aria-labelledby="password-heading">
            <div className={styles.cardHeading}><h2 id="password-heading">Password</h2><p>Choose a strong password for your account.</p></div>
            <form onSubmit={(event) => submit(event, "password")}>
              <div className={styles.fields}>
                <label className={styles.fullWidth}>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
                <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} aria-describedby="password-hint" required /></label>
                <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
              </div>
              <Status section="password" />
              <div className={styles.formFooter}><span id="password-hint">Use at least 12 characters.</span><SaveButton section="password">{isPreview ? "Check password change" : "Update password"}</SaveButton></div>
            </form>
          </section>
          <footer className={styles.footer}>MakeSB 2027 <span>UC Santa Barbara</span></footer>
        </main>
      </div>
    </div>
  );
}
