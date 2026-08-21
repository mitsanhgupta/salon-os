/**
 * lib/data/staff.ts — Staff members
 */
import { Staff } from "../types";

export const staff: Staff[] = [
  {
    id: 1,
    name: "Aman",
    role: "Lead Stylist",
    services: [1, 2, 3, 4, 5, 13],
    color: "#5B9DFF",
    specialization: "Men's Grooming & Hair Color",
    rating: 4.8,
    reviewCount: 127,
    bio: "Specializes in men's cuts, beard grooming, and premium hair color. 8+ years experience.",
  },
  {
    id: 2,
    name: "Simran",
    role: "Stylist",
    services: [1, 2, 5, 6, 11, 12],
    color: "#3ECF8E",
    specialization: "Facials & Nails",
    rating: 4.7,
    reviewCount: 93,
    bio: "Expert in facials, manicures, and pedicures. Brings a calm, spa-like energy.",
  },
  {
    id: 3,
    name: "Priya",
    role: "Senior Stylist",
    services: [6, 7, 8, 10, 11, 12, 14],
    color: "#FF6B4A",
    specialization: "Bridal & Skin",
    rating: 4.9,
    reviewCount: 184,
    bio: "Go-to artist for bridal makeup, skincare, and special occasion styling.",
  },
  {
    id: 4,
    name: "Vikram",
    role: "Stylist",
    services: [1, 2, 3, 4, 5, 13],
    color: "#F5B841",
    specialization: "Haircut & Keratin",
    rating: 4.6,
    reviewCount: 81,
    bio: "Known for precision cuts and transformative keratin treatments.",
  },
];
