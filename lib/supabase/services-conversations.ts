/**
 * lib/supabase/services-conversations.ts — Conversations & messages
 */
import supabase from './client';
import type { Conversation, Message } from '../types';

export async function getConversations(salonId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, customers!inner(name, phone)')
    .eq('salon_id', salonId)
    .order('last_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getConversation(salonId: string, id: string): Promise<Conversation & { messages: Message[] } | null> {
  const { data: convo, error: convoError } = await supabase
    .from('conversations')
    .select('*, customers!inner(name, phone)')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (convoError) throw convoError;

  const { data: msgs, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('sent_at', { ascending: true });
  if (msgError) throw msgError;

  return { ...convo, messages: msgs || [] };
}

export async function createConversation(salonId: string, convo: Partial<Conversation>): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ ...convo, salon_id: salonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversation(salonId: string, id: string, updates: Partial<Conversation>): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createMessage(conversationId: string, message: Partial<Message>): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ ...message, conversation_id: conversationId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getNeedsActionCount(salonId: string): Promise<number> {
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salonId)
    .eq('status', 'needs-action');
  if (error) throw error;
  return count || 0;
}
