// Sponsors shown on the homepage. Logos are drawn as white wordmarks on the
// section background (see .sponsor-logo in css/styles.css), so every file in
// public/assets/sponsors is either white or a single-colour mark that the CSS
// filter flattens to white.
//
// `width` and `height` are the file's natural size (for next/image).
// `display` is the rendered width in CSS px on desktop, tuned per logo so
// wide wordmarks and tall marks carry the same visual weight.
export const sponsors = [
  {
    name: "Rotatrix",
    href: "https://rotatrix.com/",
    src: "/assets/sponsors/Rotatrix.png",
    width: 1985,
    height: 372,
    display: 210,
  },
  {
    name: "DigiKey",
    href: "https://www.digikey.com/",
    src: "/assets/sponsors/digikey.svg",
    width: 1986,
    height: 555,
    display: 170,
  },
  {
    name: "STMicroelectronics",
    href: "https://www.st.com/",
    src: "/assets/sponsors/stmicroelectronics.svg",
    width: 229,
    height: 161,
    display: 112,
  },
  {
    name: "OpenLight Photonics",
    href: "https://www.openlightphotonics.com/",
    src: "/assets/sponsors/openlight.png",
    width: 800,
    height: 186,
    display: 190,
  },
  {
    name: "Google Quantum AI",
    href: "https://quantumai.google/",
    src: "/assets/sponsors/google-quantum-ai.svg",
    width: 479,
    height: 78,
    display: 230,
  },
  {
    name: "SpaceX",
    href: "https://www.spacex.com/",
    src: "/assets/sponsors/spacex.svg",
    width: 400,
    height: 50,
    display: 215,
  },
  {
    name: "Costco",
    href: "https://www.costco.com/",
    src: "/assets/sponsors/costco.svg",
    width: 201,
    height: 72,
    display: 165,
  },
  {
    name: "PseudolithIC",
    href: "https://www.pseudolithic.com/",
    src: "/assets/sponsors/pseudolithic.svg",
    width: 150,
    height: 20,
    display: 230,
  },
  {
    name: "UCSB College of Engineering",
    href: "https://engineering.ucsb.edu/",
    src: "/assets/sponsors/ucsb-engineering.png",
    width: 900,
    height: 265,
    display: 210,
  },
  {
    name: "UCSB Department of Electrical and Computer Engineering",
    href: "https://ece.ucsb.edu/",
    src: "/assets/sponsors/ucsb-ece.svg",
    width: 992,
    height: 148,
    display: 285,
  },
];
