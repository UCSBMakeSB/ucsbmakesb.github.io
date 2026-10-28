"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function usePortalPath() {
  const pathname = usePathname();
  return pathname === "/portal/" ? "/portal" : pathname;
}

export function PortalNavLink({ href, children, ...props }) {
  return <Link href={href} {...props}>{children}</Link>;
}
