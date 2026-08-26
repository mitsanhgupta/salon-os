/**
 * lib/supabase/services-services.ts — Services data access
 */
import supabase from './client';
import type { Service } from '../types';

export async function getServices(salonId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salonId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getActiveServices(salonId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getService(salonId: string, id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createService(salonId: string, service: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({ ...service, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateService(salonId: string, id: string, updates: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
