/**
 * lib/supabase/services-realtime.ts — Realtime subscriptions
 * Allows the UI to react to database changes across clients.
 */
import supabase from './client';

/**
 * Subscribe to appointment changes for a salon.
 * Fires on INSERT, UPDATE, DELETE.
 */
export function subscribeToAppointments(
  salonId: string,
  onInsert?: (payload: unknown) => void,
  onUpdate?: (payload: unknown) => void,
  onDelete?: (payload: unknown) => void
) {
  const channel = supabase
    .channel(`realtime:appointments:${salonId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => onInsert?.(payload)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => onUpdate?.(payload)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'appointments',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => onDelete?.(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to conversation changes for a salon.
 */
export function subscribeToConversations(
  salonId: string,
  onChange: (payload: unknown) => void
) {
  const channel = supabase
    .channel(`realtime:conversations:${salonId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => onChange(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to message insertions in a specific conversation.
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (payload: unknown) => void
) {
  const channel = supabase
    .channel(`realtime:messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to AI action changes.
 */
export function subscribeToActions(
  salonId: string,
  onChange: (payload: unknown) => void
) {
  const channel = supabase
    .channel(`realtime:ai_actions:${salonId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ai_actions',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => onChange(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
