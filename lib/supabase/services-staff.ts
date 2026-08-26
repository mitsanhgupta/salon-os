/**
 * lib/supabase/services-staff.ts — Staff data access
 */
import supabase from './client';
import type { Staff } from '../types';

export async function getStaff(salonId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salonId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getStaffById(salonId: string, id: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createStaff(salonId: string, staff: Partial<Staff>): Promise<Staff> {
  const { data, error } = await supabase
    .from('staff')
    .insert({ ...staff, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStaff(salonId: string, id: string, updates: Partial<Staff>): Promise<Staff> {
  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
