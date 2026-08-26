/**
 * lib/supabase/services-campaigns.ts — Campaign data access
 */
import supabase from './client';
import type { Campaign } from '../types';

export async function getCampaigns(salonId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCampaign(salonId: string, id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCampaign(salonId: string, campaign: Partial<Campaign>): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...campaign, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(salonId: string, id: string, updates: Partial<Campaign>): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
