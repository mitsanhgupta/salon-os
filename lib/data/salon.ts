/**
 * lib/data/salon.ts — Salon, branches, and offer data
 */
import { Salon, BranchOption, OfferBanner } from "../types";

export const salon: Salon = {
  id: 1,
  name: "Looks Salon",
  tagline: "The AI-Native Salon",
  address: "G-14, C-Scheme, Jaipur",
  phone: "+91 98290 12345",
  email: "hello@lookssalon.in",
  currency: "₹",
  hours: { open: 10, close: 21 },
  plan: "Growth",
};

export const branches: BranchOption[] = [
  { id: 1, name: "Looks Salon — C-Scheme", address: "G-14, C-Scheme, Jaipur", active: true },
  { id: 2, name: "Looks Salon — Malviya Nagar", address: "B-23, MN Road, Jaipur", active: false },
  { id: 3, name: "Looks Salon — Vaishali", address: "Shop 8, V&T Square, Vaishali", active: false },
];

export const offers: OfferBanner[] = [
  { id: 1, title: "Sunday Slots Open", subtitle: "Haircut + Beard from ₹330", discount: "₹50 OFF", cta: "Book now", bgGradient: "from-accent/10 via-accent-soft to-transparent" },
  { id: 2, title: "Monsoon Hair Spa", subtitle: "Nourish dry hair with our special monsoon treatment", discount: "20% OFF", cta: "Book now", bgGradient: "from-info/10 via-info-soft to-transparent" },
  { id: 3, title: "Bridal Glow Package", subtitle: "Makeup + Manicure + Pedicure", discount: "Starting ₹6,500", cta: "Book now", bgGradient: "from-success/10 via-success-soft to-transparent" },
];
