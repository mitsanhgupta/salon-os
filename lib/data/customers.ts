/**
 * lib/data/customers.ts — Customer database (16 customers)
 * Based on existing data/db.json
 */
import { Customer } from "../types";

export const customers: Customer[] = [
  { id: 1, name: "Rahul Sharma", phone: "98111 00001", gender: "M", language: "Hindi", birthday: "1990-04-12", preferredStylistId: 1, preferredTime: "5–8 PM", preferredServiceIds: [1, 2], typicalInterval: 35, lifetimeValue: 28400, visitCount: 18, attendance: 92, lastVisitAt: "2026-07-20T12:30:00.000Z", createdAt: "2025-06-27T14:07:40.793Z", tags: ["vip", "overdue"], notes: "Usually visits weekends, books haircut + beard." },
  { id: 2, name: "Neha Gupta", phone: "98111 00002", gender: "F", language: "Hindi", birthday: "1993-08-19", preferredStylistId: 3, preferredTime: "Evening", preferredServiceIds: [6, 7, 10], typicalInterval: 31, lifetimeValue: 42800, visitCount: 26, attendance: 95, lastVisitAt: "2026-06-15T13:30:00.000Z", createdAt: "2024-09-20T14:07:40.793Z", tags: ["at-risk", "overdue"], notes: "High-value. Gap 67d vs normal ~31d. Churn risk HIGH." },
  { id: 3, name: "Arjun Mehta", phone: "98111 00003", gender: "M", language: "Hindi", birthday: "1995-01-03", preferredStylistId: 1, preferredTime: "Morning", preferredServiceIds: [1], typicalInterval: 30, lifetimeValue: 21000, visitCount: 12, attendance: 88, lastVisitAt: "2026-08-09T05:30:00.000Z", createdAt: "2025-08-26T14:07:40.793Z", tags: [], notes: "" },
  { id: 4, name: "Kavya Rao", phone: "98111 00004", gender: "F", language: "English", birthday: "1991-11-22", preferredStylistId: 2, preferredTime: "Weekend", preferredServiceIds: [6, 8], typicalInterval: 28, lifetimeValue: 36000, visitCount: 20, attendance: 94, lastVisitAt: "2026-08-15T11:30:00.000Z", createdAt: "2025-08-04T14:07:40.793Z", tags: ["vip"], notes: "Prefers Simran. Manicure + pedicure regular." },
  { id: 5, name: "Dev Kapoor", phone: "98111 00005", gender: "M", language: "Hindi", birthday: "1988-06-09", preferredStylistId: 4, preferredTime: "Evening", preferredServiceIds: [1], typicalInterval: 40, lifetimeValue: 9500, visitCount: 6, attendance: 78, lastVisitAt: "2026-06-21T13:30:00.000Z", createdAt: "2025-10-03T14:07:40.793Z", tags: ["overdue"], notes: "" },
  { id: 6, name: "Ananya Iyer", phone: "98111 00006", gender: "F", language: "English", birthday: "1996-02-27", preferredStylistId: 3, preferredTime: "Evening", preferredServiceIds: [6, 10], typicalInterval: 25, lifetimeValue: 31000, visitCount: 17, attendance: 90, lastVisitAt: "2026-07-31T12:30:00.000Z", createdAt: "2025-10-23T14:07:40.793Z", tags: ["vip"], notes: "Occasional bridal client." },
  { id: 7, name: "Rohan Singh", phone: "98111 00007", gender: "M", language: "Hindi", birthday: "1994-12-30", preferredStylistId: 1, preferredTime: "5–8 PM", preferredServiceIds: [1], typicalInterval: 35, lifetimeValue: 14200, visitCount: 9, attendance: 85, lastVisitAt: "2026-07-13T12:30:00.000Z", createdAt: "2025-11-12T14:07:40.793Z", tags: ["overdue"], notes: "" },
  { id: 8, name: "Pooja Patel", phone: "98111 00008", gender: "F", language: "Hindi", birthday: "1999-05-14", preferredStylistId: 3, preferredTime: "Evening", preferredServiceIds: [7, 8], typicalInterval: 22, lifetimeValue: 8400, visitCount: 7, attendance: 88, lastVisitAt: "2026-08-08T15:30:00.000Z", createdAt: "2026-02-14T14:07:40.793Z", tags: [], notes: "" },
];

export const defaultCustomer: Customer = customers[0]; // Rahul Sharma
