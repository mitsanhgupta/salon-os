/**
 * lib/types.ts — Core TypeScript types for Salon OS
 * Based on the existing data model from data/db.json
 * Extended for the Next.js + BookMyShow-inspired UI
 */

// ===================== Enums =====================

export type UserRole = "owner" | "receptionist" | "manager" | "staff" | "customer";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "arrived"
  | "in-service"
  | "completed"
  | "cancelled"
  | "no-show";

export type BookingSource = "receptionist" | "customer" | "whatsapp" | "ai" | "owner";

export type PaymentMethod = "cash" | "card" | "upi" | "online" | "other";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export type ConversationStatus =
  | "needs-action"
  | "waiting"
  | "booked"
  | "reschedule"
  | "payment"
  | "feedback";

export type InsightType = "churn" | "staffing" | "revenue" | "reactivation" | "no-show" | "demand";

export type InsightSeverity = "low" | "medium" | "high" | "critical";

export type ActionStatus = "pending" | "completed" | "dismissed" | "expired";

export type ActionKind = "warning" | "slot" | "reactivate" | "staffing" | "revenue";

export type MessageDirection = "customer" | "ai" | "staff";

// ===================== Core Entities =====================

export interface Salon {
  id: number;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  hours: { open: number; close: number };
  plan: string;
  logo_url?: string;
}

export interface User {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  services: number[];
  color: string;
  avatar_url?: string;
  specialization?: string;
  commission_percentage?: number;
  status?: "active" | "inactive";
  rating?: number;
  reviewCount?: number;
  bio?: string;
  working_hours?: Record<string, { start: string; end: string }>;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  isActive: boolean;
  description?: string;
  image_url?: string;
  rating?: number;
  bookCount?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  gender?: string;
  language?: string;
  birthday?: string;
  preferredStylistId?: number | null;
  preferredTime?: string;
  preferredServiceIds?: number[];
  typicalInterval?: number;
  lifetimeValue?: number;
  visitCount?: number;
  attendance?: number;
  lastVisitAt?: string;
  createdAt?: string;
  tags?: string[];
  notes?: string;
}

export interface Appointment {
  id: number;
  customerId: number;
  staffId: number;
  serviceIds: number[];
  start: string;
  end: string;
  durationMin: number;
  price: number;
  notes: string;
  source: BookingSource;
  createdAt: string;
  status: AppointmentStatus;
  confirmation: string;
}

// ===================== Communication =====================

export interface Conversation {
  id: number;
  customerId: number;
  channel: string;
  status: ConversationStatus;
  lastMessage: string;
  lastAt: string;
  aiSuggestion: string;
  unread: number;
  messages: Message[];
}

export interface Message {
  id: number;
  from: MessageDirection;
  text: string;
  at: string | number;
}

// ===================== Commerce =====================

export interface Payment {
  id: number;
  appointmentId: number | null;
  customerId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  at: string;
  receiptNo: string;
}

export interface Campaign {
  id: number;
  name: string;
  message: string;
  audience: string;
  status: string;
  sentAt: string;
  sentCount: number;
}

// ===================== Intelligence =====================

export interface AIInsight {
  id: number;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  detail: string;
  recommendation: string;
}

export interface AIAction {
  id: number;
  kind: ActionKind;
  title: string;
  detail: string;
  cta: string;
}

export interface OfferBanner {
  id: number;
  title: string;
  subtitle?: string;
  discount?: string;
  cta: string;
  bgGradient?: string;
  image_url?: string;
}

// ===================== Computed / Views =====================

export interface DailySummary {
  appointments: number;
  expectedRevenue: number;
  todayRevenue: number;
  completedCount: number;
  avgBill: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface NoShowRisk {
  id: number;
  customerId: number;
  customer: string;
  staff: string;
  price: number;
  at: string;
}

export interface EmptySlot {
  id: number;
  staffId: number;
  staff: string;
  fromLabel: string;
  toLabel: string;
  color: string;
}

export interface OverdueCustomer {
  id: number;
  name: string;
  gap: number;
  typicalInterval: number;
  lifetimeValue: number;
  risk: "HIGH" | "MEDIUM" | "LOW";
}

export interface MoneyLeftItem {
  label: string;
  amount: number;
  note: string;
}

export interface StaffUtilization {
  id: number;
  name: string;
  color: string;
  utilization: number;
  todayBooked: number;
  revenue: number;
  avgBill: number;
  repeatPct: number;
  noShowRate: number;
}

export interface CustomerSegment {
  label: string;
  count: number;
  items: Customer[];
}

export interface SalonOverview {
  salonName: string;
  today: DailySummary;
  noShowRisks: NoShowRisk[];
  overdue: OverdueCustomer[];
  emptySlots: EmptySlot[];
  moneyLeft: MoneyLeftItem[];
  staffUtil: StaffUtilization[];
  segments: CustomerSegment[];
  conversations: number;
}

// ===================== UI State =====================

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  hash: string;
};

export interface BranchOption {
  id: number;
  name: string;
  address: string;
  active?: boolean;
}
