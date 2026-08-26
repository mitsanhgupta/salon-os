/**
 * lib/types.ts — TypeScript types matching the Supabase schema
 * (snake_case columns, UUID ids). Real rows, no mock data.
 */

// ============================ Auth ============================

export type UserRole = "owner" | "receptionist" | "manager" | "staff" | "customer";
export type UserStatus = "active" | "inactive" | "invited";

export interface Salon {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
  open_hour: number;
  close_hour: number;
  plan: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonMember {
  id: string;
  salon_id: string;
  user_id: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  full_name: string;
  role: UserRole;
  salonId: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

// ============================ Business ============================

export interface Staff {
  id: string;
  salon_id: string;
  profile_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  specialization: string | null;
  avatar_url: string | null;
  color: string | null;
  commission_pct: number;
  status: UserStatus;
  rating: number | null;
  review_count: number;
  working_hours: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  salon_id: string;
  profile_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  language: string | null;
  birthday: string | null;
  preferred_stylist_id: string | null;
  preferred_time: string | null;
  preferred_service_ids: string[] | null;
  typical_interval_days: number | null;
  lifetime_value: number;
  visit_count: number;
  attendance_pct: number | null;
  last_visit_at: string | null;
  tags: string[] | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  category: string;
  duration_min: number;
  price: number;
  is_active: boolean;
  image_url: string | null;
  rating: number | null;
  book_count: number;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | "pending" | "confirmed" | "arrived" | "in-service" | "completed" | "cancelled" | "no-show";
export type BookingSource = "receptionist" | "customer" | "whatsapp" | "ai" | "owner";
export type ConfirmationStatus = "pending" | "confirmed" | "cancelled";

export interface Appointment {
  id: string;
  salon_id: string;
  customer_id: string;
  staff_id: string | null;
  start_time: string;
  end_time: string;
  duration_min: number | null;
  price: number | null;
  status: AppointmentStatus;
  source: BookingSource;
  confirmation: ConfirmationStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus =
  | "needs-action" | "waiting" | "booked" | "reschedule" | "payment" | "feedback";
export type ConversationChannel = "whatsapp" | "sms" | "email";
export type MessageSender = "customer" | "ai" | "staff" | "receptionist";

export interface Conversation {
  id: string;
  salon_id: string;
  customer_id: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  last_message: string | null;
  last_at: string | null;
  ai_suggestion: string | null;
  unread: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  text: string | null;
  sent_at: string;
}

// ============================ Marketing ============================

export type CampaignStatus = "draft" | "approved" | "sending" | "sent" | "failed";
export type CampaignChannel = "whatsapp" | "sms" | "email";

export interface Campaign {
  id: string;
  salon_id: string;
  name: string;
  objective: string | null;
  audience_desc: string | null;
  message: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  target_count: number | null;
  sent_count: number;
  approved_by: string | null;
  created_at: string;
  sent_at: string | null;
}

// ============================ AI ============================

export type InsightType =
  | "churn" | "staffing" | "revenue" | "reactivation" | "no-show"
  | "demand" | "inventory" | "campaign" | "overdue_customer";
export type InsightSeverity = "low" | "medium" | "high" | "critical";
export type InsightStatus = "active" | "resolved" | "dismissed";

export interface AIInsight {
  id: string;
  salon_id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string | null;
  recommendation: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: InsightStatus;
  created_at: string;
  resolved_at: string | null;
}

export type ActionStatus = "pending" | "completed" | "dismissed" | "expired";

export interface AIAction {
  id: string;
  salon_id: string;
  type: string;
  title: string;
  description: string | null;
  recommendation: string | null;
  entity_type: string | null;
  entity_id: string | null;
  estimated_value: number | null;
  status: ActionStatus;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

// ============================ Computed / Views ============================

export interface OverdueCustomer {
  id: string;
  name: string;
  phone: string | null;
  gap: number;
  typicalInterval: number;
  lifetimeValue: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

export interface NoShowRisk {
  id: string;
  customerId: string;
  customer: string;
  staff: string;
  price: number;
  at: string;
}

export interface StaffUtilization {
  id: string;
  name: string;
  color: string | null;
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

export type PaymentMethod = "cash" | "card" | "upi" | "online" | "other";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface Payment {
  id: string;
  salon_id: string;
  appointment_id: string | null;
  customer_id: string | null;
  amount: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
}