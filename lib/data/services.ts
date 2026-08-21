/**
 * lib/data/services.ts — Services catalog and categories
 */
import { Service } from "../types";

export const services: Service[] = [
  { id: 1, name: "Haircut", category: "Hair", durationMin: 30, price: 250, isActive: true, description: "Classic haircut tailored to your face shape and style preference.", image_url: "✂️", rating: 4.7, bookCount: 42 },
  { id: 2, name: "Beard Trim", category: "Grooming", durationMin: 20, price: 100, isActive: true, description: "Precision beard shaping and trimming to keep your look sharp.", image_url: "🧔", rating: 4.5, bookCount: 36 },
  { id: 13, name: "Haircut + Beard", category: "Hair", durationMin: 45, price: 330, isActive: true, description: "Full grooming package: haircut and precision beard trim together.", image_url: "✂️🧔", rating: 4.8, bookCount: 55 },
  { id: 3, name: "Hair Color", category: "Hair", durationMin: 120, price: 1200, isActive: true, description: "Premium hair coloring with damage-protect treatment included.", image_url: "🎨", rating: 4.6, bookCount: 19 },
  { id: 4, name: "Keratin", category: "Hair", durationMin: 150, price: 2500, isActive: true, description: "Deep-smoothing keratin treatment for frizz-free, glossy hair.", image_url: "💎", rating: 4.9, bookCount: 12 },
  { id: 5, name: "Hair Spa", category: "Hair", durationMin: 60, price: 800, isActive: true, description: "Nourishing scalp massage and deep conditioning treatment.", image_url: "🧖", rating: 4.4, bookCount: 28 },
  { id: 6, name: "Facial", category: "Skin", durationMin: 60, price: 900, isActive: true, description: "Custom facial treatment for your skin type — cleanse, exfoliate, massage.", image_url: "🧖‍♀️", rating: 4.7, bookCount: 31 },
  { id: 14, name: "Skin Treatment", category: "Skin", durationMin: 90, price: 1500, isActive: true, description: "Advanced skincare treatment targeting specific concerns.", image_url: "🧬", rating: 4.5, bookCount: 8 },
  { id: 7, name: "Manicure", category: "Nails", durationMin: 45, price: 400, isActive: true, description: "Hand treatment, shaping, filing, and polish application.", image_url: "💅", rating: 4.3, bookCount: 24 },
  { id: 8, name: "Pedicure", category: "Nails", durationMin: 60, price: 500, isActive: true, description: "Foot soak, exfoliation, massage, and polish application.", image_url: "👣", rating: 4.4, bookCount: 18 },
  { id: 10, name: "Bridal Makeup", category: "Makeup", durationMin: 180, price: 8000, isActive: true, description: "Full bridal makeup look including trial, application, and touch-ups.", image_url: "💄", rating: 4.9, bookCount: 6 },
  { id: 11, name: "Threading", category: "Grooming", durationMin: 15, price: 80, isActive: true, description: "Precision eyebrow shaping and facial hair threading.", image_url: "🪢", rating: 4.2, bookCount: 41 },
  { id: 12, name: "Waxing", category: "Grooming", durationMin: 40, price: 500, isActive: true, description: "Full-body or facial waxing for smooth, hair-free skin.", image_url: "🕯️", rating: 4.1, bookCount: 15 },
  { id: 9, name: "Head Massage", category: "Spa", durationMin: 30, price: 350, isActive: true, description: "Relaxing Ayurvedic head massage with warm oils.", image_url: "🙌", rating: 4.6, bookCount: 33 },
];

export const serviceCategories: string[] = ["All", "Hair", "Grooming", "Skin", "Nails", "Makeup", "Spa"];
