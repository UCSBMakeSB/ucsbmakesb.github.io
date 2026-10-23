"use client";

import { useState } from "react";
import Image from "next/image";

const links = [
  ["about", "About"],
  ["schedule", "Schedule"],
  ["faqs", "FAQs"],
  ["sponsors", "Sponsors"],
  ["contact", "Apply"],
  ["team", "Meet Our Team"],
];

export function Header() {
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
    <header className="site-header" aria-label="MakeSB navigation">
      <a className="wordmark" href="#main" aria-label="MakeSB home">
        <Image className="wordmark-logo" src="/assets/makesb-logo-v2.png" width="1688" height="1040" alt="MakeSB" />
      </a>
      <nav className="header-nav" aria-label="Section navigation">
        {links.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
      <details className={`mobile-menu${closing ? " is-closing" : ""}`} open={open}>
        <summary aria-label="Navigation menu" onClick={toggleMenu}>
          <span className="hamburger" aria-hidden="true"><span /><span /><span /></span>
        </summary>
        <nav aria-label="Mobile section navigation">
          {links.map(([id, label]) => <a key={id} href={`#${id}`} onClick={closeMenu}>{label}</a>)}
        </nav>
      </details>
    </header>
  );
}
