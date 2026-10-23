import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";

export const mono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const serif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: "400",
});

export const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});
