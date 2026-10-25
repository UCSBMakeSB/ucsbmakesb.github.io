"use client";

import Image from "next/image";
import Link from "next/link";
import { usePortalAccount } from "./account";

export function PortalHeader() {
  const { account } = usePortalAccount();

  return (
    <header className="portal-header">
      <div className="portal-brand">
        <Link href="/" aria-label="MakeSB home">
          <Image
            src="/assets/makesb-logo-v2.png"
            width={1688}
            height={1040}
            alt="MakeSB"
            preload
          />
        </Link>
        <Link
          href="/portal"
          className="portal-brand-text"
          aria-label="MakeSB Portal Home"
        >
          Hacker portal
          <br />
          <span className="portal-event">
            JAN 15–17, 2027
            <br />
            UC SANTA BARBARA
          </span>
        </Link>
      </div>
      <div className="portal-identity">
        <span className="portal-avatar" aria-hidden="true">
          {account.firstName.slice(0, 1)}
          {account.lastName.slice(0, 1)}
        </span>
        <div>
          <strong>
            {account.firstName} {account.lastName}
          </strong>
          <small>{account.email}</small>
        </div>
      </div>

      <a href="https://linktr.ee/ucsbmakesb" className="portal-help">
        Need help? ↗
      </a>
    </header>
  );
}
