"use client";

import { useId, useRef, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser";

export function ApplyLink({ children = "Apply", className }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [message, setMessage] = useState("");

  async function handleClick(event) {
    event.preventDefault();
    try {
      const { data, error } = await getSupabaseBrowser().auth.getSession();
      if (error) throw error;
      if (!data.session) {
        window.location.assign("/apply");
        return;
      }
    } catch {
      // The application remains accessible when authentication is unavailable.
      window.location.assign("/apply");
      return;
    }

    setMessage("Copying the application link…");
    if (!dialog.current.open) dialog.current.showModal();
    try {
      await navigator.clipboard.writeText("makesb.org/apply");
      setMessage("Copied makesb.org/apply to your clipboard. Share it with friends!");
    } catch {
      setMessage("We couldn’t copy the link automatically. You can copy it here: makesb.org/apply");
    }
  }

  return (
    <>
      <a href="/apply" className={className} onClick={handleClick}>{children}</a>
      <dialog className="apply-dialog" ref={dialog} aria-labelledby={titleId}>
        <h2 id={titleId}>You’re already logged in!</h2>
        <p role="status">{message}</p>
        <form method="dialog"><button autoFocus>Got it</button></form>
      </dialog>
    </>
  );
}
