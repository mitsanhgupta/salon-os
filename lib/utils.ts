/**
 * lib/utils.ts — Shared utility functions for Salon OS
 */
import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, resolving conflicts.
 * Usage: cn("px-2 py-1", "px-4") => "py-1 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupees.
 * @example formatPrice(2500) => "₹2,500"
 */
export function formatPrice(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return "₹" + num.toLocaleString("en-IN");
}

/**
 * Format a price range for a service.
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

/**
 * Format an ISO date string to a short date string.
 * @example formatDate("2024-01-15T10:30:00.000Z") => "Mon, Jan 15"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Format an ISO date string to a long date string.
 * @example formatDateLong("2024-01-15") => "Monday, January 15, 2024"
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Format an ISO date/time to a 12-hour time string.
 * @example formatTime("2024-01-15T14:30:00.000Z") => "2:30 PM"
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/**
 * Format an ISO date/time to a relative time string.
 * @example formatRelativeTime("2024-01-15T14:30:00.000Z") => "2h ago"
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const minutes = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/**
 * Extract initials from a name.
 * @example initials("Rahul Sharma") => "RS"
 */
export function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Generate a deterministic avatar color from a name.
 */
export function avatarColor(name: string): string {
  const PANTS = ["#FF6B4A", "#5B9DFF", "#3ECF8E", "#F5B841", "#B57BFF", "#FF8FC7", "#5BC8FF", "#9CE05A"];
  let h = 0;
  for (const c of name || "?") h = (h * 31 + c.charCodeAt(0)) % 997;
  return PANTS[h % PANTS.length];
}

/**
 * Get a category label with consistent capitalization.
 */
export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    Hair: "Hair",
    Grooming: "Grooming",
    Skin: "Skin",
    Nails: "Nails",
    Makeup: "Makeup",
    Spa: "Spa",
  };
  return labels[category] || category;
}

/**
 * Generate a list of date options for the date strip (today + next 6 days).
 */
export function generateDateOptions(): Array<{
  date: string;
  dayName: string;
  dayNum: number;
  monthShort: string;
  isToday: boolean;
  label: string;
}> {
  const options: Array<{
    date: string;
    dayName: string;
    dayNum: number;
    monthShort: string;
    isToday: boolean;
    label: string;
  }> = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    options.push({
      date: d.toISOString(),
      dayName: d.toLocaleDateString("en-IN", { weekday: "short" }),
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString("en-IN", { month: "short" }),
      isToday: i === 0,
      label: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
    });
  }
  return options;
}

/**
 * Generate time slot options (30-min intervals within salon hours).
 */
export function generateTimeSlots(date: string): Array<{
  time: string;
  iso: string;
  label: string;
  available: boolean;
}> {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const slots: Array<{
    time: string;
    iso: string;
    label: string;
    available: boolean;
  }> = [];
  // 10:00 to 21:00, 30-min intervals
  for (let h = 10; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slot = new Date(d);
      slot.setHours(h, m);
      const timeStr = slot.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      slots.push({
        time: `${h}:${m.toString().padStart(2, "0")}`,
        iso: slot.toISOString(),
        label: timeStr,
        available: true,
      });
    }
  }
  return slots;
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
