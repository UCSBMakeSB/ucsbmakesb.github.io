"use client";

import { useLayoutEffect } from "react";

export function HomeScrollReset() {
  useLayoutEffect(() => {
    if (window.location.hash) {
      document.querySelector(":target")?.scrollIntoView({ behavior: "instant" });
      return;
    }

    const previousRestoration = window.history.scrollRestoration;
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;

    window.history.scrollRestoration = "manual";
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      root.style.scrollBehavior = previousBehavior;
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}
