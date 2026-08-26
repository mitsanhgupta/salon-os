/**
 * lib/supabase/services-customers.ts — Customer data access
 */
import supabase from './client';
import type { Customer } from '../types';

export async function getCustomers(salonId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .order('last_visit_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCustomer(salonId: string, id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getCustomerByPhone(salonId: string, phone: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .eq('phone', phone)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

export async function createCustomer(salonId: string, customer: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...customer, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(salonId: string, id: string, updates: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function searchCustomers(salonId: string, query: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('last_visit_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
