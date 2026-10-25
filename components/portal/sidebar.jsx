"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalSidebar({ pages }) {
  const pathname = usePathname();

  return (
    <aside className="portal-sidebar" aria-label="Portal navigation">
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
    </aside>
  );
}
