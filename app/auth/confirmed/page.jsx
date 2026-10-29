"use client";

import { useEffect } from "react";

export default function AuthConfirmedPage() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "makesb-auth-confirmed" },
        window.location.origin,
      );
      window.close();
      return;
    }

    window.location.replace("/portal/application");
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p>Your email has been confirmed. Continuing...</p>
      </section>
    </main>
  );
}
