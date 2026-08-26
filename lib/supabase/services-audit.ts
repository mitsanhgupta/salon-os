/**
 * lib/supabase/services-audit.ts — Audit log data access
 */
import supabase from './client';

export interface AuditLogInput {
  salon_id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    salon_id: input.salon_id,
    user_id: input.user_id || null,
    action: input.action,
    entity_type: input.entity_type || null,
    entity_id: input.entity_id || null,
    metadata: input.metadata || {},
  });
  if (error) {
    console.error('Audit log failed:', error);
  }
}

export async function getAuditLogs(salonId: string, limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
