import { Footer } from "../../components/page-layout";
import { PortalHeader } from "../../components/portal/header";
import { PortalAccountProvider } from "../../components/portal/account";
import { PortalSidebar } from "../../components/portal/sidebar";
import { PortalScrollReset } from "../../components/portal/scroll-reset";
import { PortalClientRouter } from "../../components/portal/client-router";
import {
  getPortalAccount,
  PORTAL_ACCOUNT_FIELDS,
} from "../../lib/portal-data";
import "../../css/portal.css";

const pages = [
  {
    title: "Dashboard",
    href: "/portal",
  },
  {
    title: "Profile",
    href: "/portal/profile",
  },
  {
    title: "Application",
    href: "/portal/application",
  },
  {
    title: "Account settings",
    href: "/portal/settings",
  },
];

async function getInitialAccount() {
  return getPortalAccount(PORTAL_ACCOUNT_FIELDS);
}

export default async function Layout() {
  const initialAccount = await getInitialAccount();

  return (
    <PortalAccountProvider initialAccount={initialAccount}>
      <PortalScrollReset />
      <PortalHeader />
      <div className="portal-shell">
        <a className="skip-link" href="#account-main">
          Skip to account settings
        </a>
        <div className="portal-layout">
          <PortalSidebar pages={pages} />
          <PortalClientRouter />
        </div>
      </div>
      <Footer />
    </PortalAccountProvider>
  );
}
