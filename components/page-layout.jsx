"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const links = [
  ["about", "About"],
  ["schedule", "Schedule"],
  ["faqs", "FAQs"],
  ["sponsors", "Sponsors"],
  ["contact", "Apply"],
  ["team", "Meet Our Team"],
];

export function Header({ fixed = false }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

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
            <a key={id} href={`#${id}`} onClick={closeMenu}>
              {label}
            </a>
          ))}
        </nav>
      </details>
    </header>
  );
}

export function Footer({ applyUrl, sponsorUrl }) {
  return (
    <footer className="site-footer">
      <p> © 2026 MakeSB.com - All Rights Reserved. </p>
      <p>
        <a href={applyUrl}>Apply</a>&emsp;&emsp;&emsp;&emsp;
        <a href={sponsorUrl}>Sponsor</a>
      </p>
      <p>
        Please contact us here:{" "}
        <a href="https://linktr.ee/ucsbmakesb">LinkTree</a>
      </p>
    </footer>
  );
}
