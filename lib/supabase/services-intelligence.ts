/**
 * lib/supabase/services-intelligence.ts — Computed intelligence (AI insights from real data)
 * Replaces JSON-based deterministic logic with real database queries.
 */
import supabase from './client';
import type {
  OverdueCustomer, NoShowRisk, StaffUtilization, CustomerSegment
} from '../types';

export async function getOverdueCustomers(salonId: string): Promise<OverdueCustomer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .not('last_visit_at', 'is', null)
    .gt('visit_count', 1)
    .gt('typical_interval_days', 0);

  if (error) throw error;
  if (!data) return [];

  return data
    .map((c) => {
      const gap = Math.floor((Date.now() - new Date(c.last_visit_at!).getTime()) / (1000 * 60 * 60 * 24));
      const normal = c.typical_interval_days;
      let risk: 'HIGH' | 'MEDIUM' | 'LOW';
      if (gap > normal + 25) risk = 'HIGH';
      else if (gap > normal + 5) risk = 'MEDIUM';
      else risk = 'LOW';
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        gap,
        typicalInterval: normal,
        lifetimeValue: Number(c.lifetime_value),
        risk,
      };
    })
    .filter((c) => c.gap > (c.typicalInterval + 5))
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export async function getNoShowRisks(salonId: string): Promise<NoShowRisk[]> {
  const dateStr = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('appointments')
    .select('id, customer_id, start_time, status, price, customers!inner(name), staff!inner(name)')
    .eq('salon_id', salonId)
    .eq('status', 'confirmed')
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('start_time', `${dateStr}T23:59:59`);

  if (error) throw error;
  if (!data) return [];

  return data.map((a: any) => ({
    id: a.id,
    customerId: a.customer_id,
    customer: Array.isArray(a.customers) ? a.customers[0]?.name : a.customers?.name || 'Unknown',
    staff: Array.isArray(a.staff) ? a.staff[0]?.name : a.staff?.name || 'Unknown',
    price: Number(a.price || 0),
    at: a.start_time,
  }));
}

export async function getStaffUtilization(salonId: string): Promise<StaffUtilization[]> {
  const dateStr = new Date().toISOString().split('T')[0];
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salonId);

  if (staffError) throw staffError;
  if (!staffData) return [];

  return Promise.all(
    staffData.map(async (s) => {
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('price, status')
        .eq('salon_id', salonId)
        .eq('staff_id', s.id)
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`);

      const booked = (appts || []).filter((a) => a.status !== 'cancelled' && a.status !== 'no-show').length;
      const revenue = (appts || []).reduce((sum, a) => sum + (a.status === 'completed' ? Number(a.price || 0) : 0), 0);

      return {
        id: s.id,
        name: s.name,
        color: s.color || '#888888',
        utilization: booked > 0 ? Math.min(100, Math.round((booked / 8) * 100)) : 0,
        todayBooked: booked,
        revenue,
        avgBill: booked > 0 ? Math.round(revenue / booked) : 0,
        repeatPct: 0,
        noShowRate: 0,
      };
    })
  );
}

export async function getCustomerSegments(salonId: string): Promise<CustomerSegment[]> {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .order('lifetime_value', { ascending: false });

  if (error) throw error;
  if (!customers) return [];

  const vip = customers.filter((c) => (c.tags || []).includes('vip'));
  const atRisk = customers.filter((c) => (c.tags || []).includes('at-risk'));
  const overdue = customers.filter((c) => (c.tags || []).includes('overdue'));
  const newOnes = customers.filter((c) => c.visit_count <= 1);
  const lost = customers.filter((c) => {
    if (!c.last_visit_at) return false;
    const gap = Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24));
    const normal = c.typical_interval_days || 40;
    return gap > normal + 30;
  });

  return [
    { label: 'VIP', count: vip.length, items: vip },
    { label: 'At risk', count: atRisk.length, items: atRisk },
    { label: 'Overdue', count: overdue.length, items: overdue },
    { label: 'New', count: newOnes.length, items: newOnes },
    { label: 'Lost', count: lost.length, items: lost },
    { label: 'Advocates', count: 0, items: [] },
  ].filter((s) => s.count > 0 || s.label === 'Advocates');
}
