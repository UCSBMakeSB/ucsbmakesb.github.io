"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseBrowser } from "../lib/supabase-browser";
import { ApplyLink } from "./apply-link";
import { ContactEmail } from "./contact-email";

const links = [
  ["about", "About"],
  ["schedule", "Schedule"],
  ["faqs", "FAQs"],
  ["sponsors", "Sponsors"],
  ["team", "Meet Our Team"],
];

export function Header({ fixed = false }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    let supabase;
    try {
      supabase = getSupabaseBrowser();
    } catch (error) {
      console.error("Could not initialize authentication:", error);
      return undefined;
    }

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (active) setIsAuthenticated(Boolean(user));
      })
      .catch((error) => {
        console.error("Could not read authentication state:", error);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function toggleMenu(event) {
    event.preventDefault();
    if (open) {
      setClosing(true);
      window.setTimeout(() => {
        setOpen(false);
        setClosing(false);
      }, 220);
      return;
    }
    setOpen(true);
  }

  function closeMenu() {
    if (!open) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }

  return (
    <header
      className={`site-header${fixed ? " site-header-fixed" : ""}`}
      aria-label="MakeSB navigation"
    >
      <a className="wordmark" href="/#main" aria-label="MakeSB home">
        <Image
          className="wordmark-logo"
          src="/assets/makesb-logo-v2.png"
          width="1688"
          height="1040"
          alt="MakeSB"
        />
      </a>
      <nav className="header-nav" aria-label="Section navigation">
        {links.map(([id, label]) => (
          <a key={id} href={`/#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <details
        className={`mobile-menu${closing ? " is-closing" : ""}`}
        open={open}
      >
        <summary aria-label="Navigation menu" onClick={toggleMenu}>
          <span className="hamburger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </summary>
        <nav aria-label="Mobile section navigation">
          {links.map(([id, label]) => (
            <a key={id} href={`/#${id}`} onClick={closeMenu}>
              {label}
            </a>
          ))}
        </nav>
      </details>
      <div className="header-actions">
      <Link
        className="header-sign-in"
        href={isAuthenticated ? "/portal/" : "/login"}
      >
        {isAuthenticated ? "Access Portal" : "Portal Login"}
      </Link>
        <ApplyLink className="header-apply" />
      </div>
    </header>
  );
}

export function Footer({ sponsorUrl = "mailto:patrick_liu@ucsb.edu?subject=MakeSB%202027%20Sponsorship" }) {
  return (
    <footer className="site-footer">
      <p> © 2026 MakeSB.com - All Rights Reserved. </p>
      <div className="footer-actions">
        <ApplyLink />&emsp;&emsp;&emsp;&emsp;
        <a href={sponsorUrl}>Sponsor</a>
      </div>
      <ContactEmail />
    </footer>
  );
}
