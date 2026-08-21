/**
 * lib/fonts.ts — Font configuration using next/font
 * Inter (body) + Inter Tight (display) — BookMyShow-inspired clean grotesque
 */
import { Inter, Inter_Tight } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});
