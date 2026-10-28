"use client";

import { useEffect, useState } from "react";

function normalizePath(pathname) {
  if (pathname === "/portal/") return "/portal";
  return pathname;
}

export function usePortalPath() {
  const [pathname, setPathname] = useState(() =>
    typeof window === "undefined"
      ? "/portal"
      : normalizePath(window.location.pathname),
  );

  useEffect(() => {
    const updatePath = () => setPathname(normalizePath(window.location.pathname));
    updatePath();
    window.addEventListener("popstate", updatePath);
    window.addEventListener("portal:navigate", updatePath);
    return () => {
      window.removeEventListener("popstate", updatePath);
      window.removeEventListener("portal:navigate", updatePath);
    };
  }, []);

  return pathname;
}

export function navigatePortal(href) {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new Event("portal:navigate"));
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
    navigatePortal(href);
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
