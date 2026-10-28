"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

export function PortalSidebar({ pages }) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setIsSigningOut(true);
    setError("");

    try {
      const { error: signOutError } = await getSupabaseBrowser().auth.signOut();
      if (signOutError) {
        console.error("Sign out failed:", signOutError);
        setError("We couldn't sign you out. Please try again.");
        setIsSigningOut(false);
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      window.location.replace("/");
    } catch (signOutError) {
      console.error("Sign out failed:", signOutError);
      setError("We couldn't sign you out. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <aside className="portal-sidebar" aria-label="Portal navigation">
      <div>
        <p className="portal-eyebrow">Hacker portal</p>
        <nav>
          {pages.map((page) => {
            const isSelected = pathname === page.href;
            return (
              <Link
                key={page.title + page.href}
                href={page.href}
                aria-current={isSelected ? "page" : undefined}
                className={`portal-nav-link${isSelected ? " portal-selected" : ""}`}
              >
                {page.title} {isSelected && <span aria-hidden="true">→</span>}
              </Link>
            );
          })}
        </nav>
        <Link className="portal-back-link" href="/">
          ← Back to MakeSB
        </Link>
      </div>
      <div className="portal-sidebar-footer">
        {error && (
          <p className="portal-sidebar-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="portal-sign-out"
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
