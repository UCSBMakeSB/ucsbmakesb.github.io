"use client";

import { useState } from "react";

const EMAIL = "team@makesb.org";

export function ContactEmail() {
  const [message, setMessage] = useState("");

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setMessage("Email address copied!");
    } catch {
      setMessage("Couldn’t copy automatically. Select and copy team@makesb.org.");
    }
  }

  return (
    <div className="contact-email">
      <p>Questions? Contact the MakeSB team.</p>
      <div className="contact-email-actions">
        <a href={`mailto:${EMAIL}`} onClick={copyEmail}>{EMAIL}</a>
        <button type="button" onClick={copyEmail} aria-label="Copy team@makesb.org email address">
          Copy email
        </button>
      </div>
      <p className="contact-email-status" role="status">{message}</p>
    </div>
  );
}
