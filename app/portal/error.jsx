"use client";

export default function PortalError({ reset }) {
  return (
    <main id="account-main" className="portal-main">
      <p className="portal-eyebrow">MakeSB 2027 / Your account</p>
      <h1>We couldn&apos;t load this page</h1>
      <p className="portal-intro">
        Please try again. Your account data has not been changed.
      </p>
      <button className="portal-button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
