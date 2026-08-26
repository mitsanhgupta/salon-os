/**
 * lib/supabase/services-payments.ts — Payment data access
 */
import supabase from './client';
import type { Payment } from '../types';

export async function getPayments(salonId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPayment(salonId: string, id: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createPayment(salonId: string, payment: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...payment, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePayment(salonId: string, id: string, updates: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPaymentStats(salonId: string): Promise<{
  totalRevenue: number;
  todayPayments: number;
  pendingAmount: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const { data: todayData } = await supabase
    .from('payments')
    .select('amount')
    .eq('salon_id', salonId)
    .eq('status', 'paid')
    .gte('paid_at', `${today}T00:00:00`)
    .lte('paid_at', `${today}T23:59:59`);

  const { data: pendingData } = await supabase
    .from('payments')
    .select('amount', { count: 'estimated' })
    .eq('salon_id', salonId)
    .eq('status', 'pending');

  const { data: totalData } = await supabase
    .from('payments')
    .select('amount')
    .eq('salon_id', salonId)
    .eq('status', 'paid');

  return {
    todayPayments: todayData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    pendingAmount: pendingData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    totalRevenue: totalData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };
}
