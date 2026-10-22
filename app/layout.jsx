import "../styles.css";
import "../team.css";

export const metadata = {
  title: "MakeSB 2027 — January 16–17 at UC Santa Barbara",
  description: "MakeSB 2027 — January 16–17 at UC Santa Barbara.",
  // metadataBase: new URL('https://makesb.com')
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
};

export const viewport = {
  themeColor: "#0b1930"
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
