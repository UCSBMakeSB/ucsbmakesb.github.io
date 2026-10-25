import { Footer } from "../../components/page-layout";
import { PortalHeader } from "../../components/portal/header";
import { PortalAccountProvider } from "../../components/portal/account";
import { PortalSidebar } from "../../components/portal/sidebar";
import { PortalScrollReset } from "../../components/portal/scroll-reset";
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

export default function Layout({ children }) {
  return (
    <PortalAccountProvider>
      <PortalScrollReset />
      <PortalHeader />
      <div className="portal-shell">
        <a className="skip-link" href="#account-main">
          Skip to account settings
        </a>
        <div className="portal-layout">
          <PortalSidebar pages={pages} />
          {children}
        </div>
      </div>
      <Footer />
    </PortalAccountProvider>
  );
}
