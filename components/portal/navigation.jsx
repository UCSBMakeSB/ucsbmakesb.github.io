"use client";

import { usePathname } from "next/navigation";

export function usePortalPath() {
  const pathname = usePathname();
  return pathname === "/portal/" ? "/portal" : pathname;
}

export function PortalNavLink({ href, children, ...props }) {
  function handleClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    window.history.pushState({}, "", href);
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
