"use client";

import { useEffect } from "react";
import { usePortalPath } from "./navigation";

export function PortalScrollReset() {
  const pathname = usePortalPath();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
