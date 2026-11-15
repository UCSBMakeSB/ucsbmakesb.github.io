// Sponsors shown on the homepage, grouped into rows by tier (1 is the top tier).
// Logos are drawn as white wordmarks on the section background (see
// .sponsor-logo in css/styles.css), so every file in public/assets/sponsors is
// either white or a single-colour mark that the CSS filter flattens to white.
//
// `width` and `height` are the file's natural size (for next/image).
// `display` is the rendered width in CSS px for a tier 2 logo, tuned per logo so
// wide wordmarks and tall marks carry the same visual weight. The tier scales it
// up or down, see TIER_SCALE.

export const TIER_SCALE = { 1: 1.35, 2: 1, 3: 0.75 };

export const sponsors = [
  {
    name: "Google Quantum AI",
    tier: 1,
    href: "https://quantumai.google/",
    src: "/assets/sponsors/google-quantum-ai.svg",
    width: 479,
    height: 78,
    display: 230,
  },
  {
    name: "ASUS",
    tier: 1,
    href: "https://www.asus.com/",
    src: "/assets/sponsors/asus.svg",
    width: 500,
    height: 105,
    display: 190,
  },
  {
    name: "UCSB College of Engineering",
    tier: 1,
    href: "https://engineering.ucsb.edu/",
    src: "/assets/sponsors/ucsb-engineering.png",
    width: 900,
    height: 265,
    display: 210,
  },
  {
    name: "UCSB Department of Electrical and Computer Engineering",
    tier: 1,
    href: "https://ece.ucsb.edu/",
    src: "/assets/sponsors/ucsb-ece.svg",
    width: 992,
    height: 148,
    display: 285,
  },
  {
    name: "SpaceX",
    tier: 2,
    href: "https://www.spacex.com/",
    src: "/assets/sponsors/spacex.svg",
    width: 400,
    height: 50,
    display: 215,
  },
  {
    name: "DigiKey",
    tier: 2,
    href: "https://www.digikey.com/",
    src: "/assets/sponsors/digikey.svg",
    width: 1986,
    height: 555,
    display: 170,
  },
  {
    name: "STMicroelectronics",
    tier: 2,
    href: "https://www.st.com/",
    src: "/assets/sponsors/stmicroelectronics.svg",
    width: 229,
    height: 161,
    display: 112,
  },
  {
    name: "OpenLight Photonics",
    tier: 2,
    href: "https://www.openlightphotonics.com/",
    src: "/assets/sponsors/openlight.png",
    width: 800,
    height: 186,
    display: 190,
  },
  {
    name: "Costco",
    tier: 3,
    href: "https://www.costco.com/",
    src: "/assets/sponsors/costco.svg",
    width: 201,
    height: 72,
    display: 165,
  },
  {
    name: "PseudolithIC",
    tier: 3,
    href: "https://www.pseudolithic.com/",
    src: "/assets/sponsors/pseudolithic.svg",
    width: 150,
    height: 20,
    display: 230,
  },
  {
    name: "Rotatrix",
    tier: 3,
    href: "https://rotatrix.com/",
    src: "/assets/sponsors/Rotatrix.png",
    width: 1985,
    height: 372,
    display: 210,
  },
];

// Sponsors grouped by tier, in tier order.
export const sponsorTiers = Object.entries(
  Object.groupBy(sponsors, (sponsor) => sponsor.tier),
)
  .map(([tier, items]) => ({ tier: Number(tier), items }))
  .sort((a, b) => a.tier - b.tier);
