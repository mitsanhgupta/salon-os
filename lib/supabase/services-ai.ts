/**
 * lib/supabase/services-ai.ts — AI insights & actions CRUD
 */
import supabase from './client';
import type { AIInsight, AIAction } from '../types';

export async function getInsights(salonId: string): Promise<AIInsight[]> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('salon_id', salonId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createInsight(salonId: string, insight: Partial<AIInsight>): Promise<AIInsight> {
  const { data, error } = await supabase
    .from('ai_insights')
    .insert({ ...insight, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveInsight(salonId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_insights')
    .update({ status: 'resolved' as const, resolved_at: new Date().toISOString() })
    .eq('salon_id', salonId)
    .eq('id', id);
  if (error) throw error;
}

export async function getActions(salonId: string): Promise<AIAction[]> {
  const { data, error } = await supabase
    .from('ai_actions')
    .select('*')
    .eq('salon_id', salonId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function completeAction(salonId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_actions')
    .update({ status: 'completed' as const, completed_at: new Date().toISOString() })
    .eq('salon_id', salonId)
    .eq('id', id);
  if (error) throw error;
}

export async function dismissAction(salonId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_actions')
    .update({ status: 'dismissed' as const })
    .eq('salon_id', salonId)
    .eq('id', id);
  if (error) throw error;
}
