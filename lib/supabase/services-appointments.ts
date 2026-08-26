/**
 * lib/supabase/services-appointments.ts — Appointment data access + business rules
 */
import supabase from './client';
import type { Appointment, Customer, Staff, Service } from '../types';

export async function getAppointments(
  salonId: string,
  options: { date?: string; status?: string; staffId?: string } = {}
): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*, customers!inner(name, phone), staff!inner(name)')
    .eq('salon_id', salonId);

  if (options.date) {
    const start = `${options.date}T00:00:00.000Z`;
    const end = `${options.date}T23:59:59.999Z`;
    query = query.gte('start_time', start).lte('start_time', end);
  }
  if (options.status) query = query.eq('status', options.status);
  if (options.staffId) query = query.eq('staff_id', options.staffId);

  query = query.order('start_time', { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAppointment(salonId: string, id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, customers!inner(name, phone)')
    .eq('salon_id', salonId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Check for overlapping appointments before inserting.
 * Returns true if the slot is available, false if conflicting.
 */
export async function checkSlotAvailability(
  salonId: string,
  staffId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<{ available: boolean; conflicts: Appointment[] }> {
  let query = supabase
    .from('appointments')
    .select('*')
    .eq('salon_id', salonId)
    .eq('staff_id', staffId)
    .neq('status', 'cancelled')
    .neq('status', 'no-show');

  if (excludeId) query = query.neq('id', excludeId);

  query = query
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  const { data, error } = await query;
  if (error) throw error;
  return { available: (data || []).length === 0, conflicts: data || [] };
}

export async function createAppointment(salonId: string, appt: Partial<Appointment>): Promise<Appointment> {
  // Validate no double-booking
  if (appt.staff_id && appt.start_time && appt.end_time) {
    const { available } = await checkSlotAvailability(
      salonId, appt.staff_id, appt.start_time, appt.end_time, undefined
    );
    if (!available) {
      throw new Error('Slot conflict: selected time overlaps with an existing appointment');
    }
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...appt, salon_id: salonId })
    .select('*, customers!inner(name, phone), staff!inner(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(salonId: string, id: string, updates: Partial<Appointment>): Promise<Appointment> {
  // If staff + time is changing, re-check availability
  const existing = await getAppointment(salonId, id);
  if (existing && updates.staff_id && updates.start_time && updates.end_time) {
    if (
      updates.staff_id !== existing.staff_id ||
      updates.start_time !== existing.start_time ||
      updates.end_time !== existing.end_time
    ) {
      const { available } = await checkSlotAvailability(
        salonId, updates.staff_id, updates.start_time, updates.end_time, id
      );
      if (!available) {
        throw new Error('Slot conflict: selected time overlaps with an existing appointment');
      }
    }
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('salon_id', salonId)
    .eq('id', id)
    .select('*, customers!inner(name, phone), staff!inner(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAppointment(salonId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('salon_id', salonId)
    .eq('id', id);
  if (error) throw error;
}

/**
 * Fetch appointments for a given date range — used by calendar.
 * Returns appointments enriched with customer + service names.
 */
export async function getAppointmentsByRange(
  salonId: string,
  start: string,
  end: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, customers!inner(name, phone), staff!inner(name), appointments_services!inner(services!inner(name))')
    .eq('salon_id', salonId)
    .gte('start_time', start)
    .lte('start_time', end)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Update appointment status — used for check-in flow.
 */
export async function updateAppointmentStatus(
  salonId: string,
  id: string,
  status: Appointment['status']
): Promise<Appointment> {
  return updateAppointment(salonId, id, { status });
}
