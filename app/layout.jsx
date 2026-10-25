import "../css/styles.css";
import "../css/team.css";
import "../css/apply.css";

import { mono, serif, sans } from "./fonts";

const domain = process.env.NEXT_SITE_URL || "https://localhost:3000";

export const metadata = {
  title: "MakeSB 2027 — January 15–17 at UC Santa Barbara",
  description: "MakeSB 2027 — January 15–17 at UC Santa Barbara.",
  metadataBase: new URL(domain),
  icons: {
    icon: "/assets/makesb-favicon-v2.png",
  },
  openGraph: {
    title: "MakeSB 2027",
    description: "January 16–17 at UC Santa Barbara.",
    type: "website",
    images: [
      {
        url: "/assets/makesb-social-card.jpg",
        width: 1731,
        height: 909,
        alt: "MakeSB 2027 at UC Santa Barbara",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MakeSB 2027",
    description: "January 15–17 at UC Santa Barbara.",
    images: ["/assets/makesb-social-card.jpg"],
  },
};

export const viewport = {
  themeColor: "#0b1930",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${serif.variable} ${sans.variable}`}>
        {children}
      </body>
    </html>
  );
}
