import { supabase } from './supabase';

export interface TractorMotoHourStats {
  tractorId: string;
  model: string;
  serialNumber: string;
  currentMotoHours: number;
  totalHoursLogged: number;
  averageHoursPerDay: number;
  lastLogDate: string | null;
  logCount: number;
}

export interface PartsUsageStats {
  partName: string;
  totalQuantity: number;
  requestCount: number;
  pendingCount: number;
  deliveredCount: number;
  lastRequestDate: string;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  completedServices: number;
  completedCalls: number;
  averageResponseTime: number;
  totalWorkHours: number;
  lastActivityDate: string | null;
}

export interface ServiceOverdueItem {
  tractorId: string;
  model: string;
  serialNumber: string;
  currentMotoHours: number;
  nextServiceHours: number;
  hoursOverdue: number;
  location: string;
  status: string;
}

export interface MotoHourHistory {
  date: string;
  value: number;
  tractorModel: string;
}

export async function getTractorMotoHourStats(): Promise<TractorMotoHourStats[]> {
  const { data: tractors, error: tractorsError } = await supabase
    .from('tractors')
    .select('id, model, serial_number, current_moto_hours');

  if (tractorsError) throw tractorsError;
  if (!tractors) return [];

  const stats: TractorMotoHourStats[] = [];

  for (const tractor of tractors) {
    const { data: motoHours, error: motoHoursError } = await supabase
      .from('moto_hours')
      .select('value, date, created_at')
      .eq('tractor_id', tractor.id)
      .order('date', { ascending: false });

    if (motoHoursError) continue;

    const totalHours = motoHours?.reduce((sum, log) => sum + log.value, 0) || 0;
    const logCount = motoHours?.length || 0;

    let averageHoursPerDay = 0;
    if (motoHours && motoHours.length > 1) {
      const oldestDate = new Date(motoHours[motoHours.length - 1].date);
      const newestDate = new Date(motoHours[0].date);
      const daysDiff = Math.max(
        1,
        Math.floor((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      averageHoursPerDay = totalHours / daysDiff;
    }

    stats.push({
      tractorId: tractor.id,
      model: tractor.model,
      serialNumber: tractor.serial_number,
      currentMotoHours: tractor.current_moto_hours,
      totalHoursLogged: totalHours,
      averageHoursPerDay: Math.round(averageHoursPerDay * 10) / 10,
      lastLogDate: motoHours && motoHours.length > 0 ? motoHours[0].date : null,
      logCount,
    });
  }

  return stats;
}

export async function getPartsUsageStats(): Promise<PartsUsageStats[]> {
  const { data: partsRequests, error } = await supabase
    .from('parts_requests')
    .select('part_name, quantity, delivery_status, request_date')
    .order('request_date', { ascending: false });

  if (error) throw error;
  if (!partsRequests) return [];

  const partsMap = new Map<string, PartsUsageStats>();

  for (const request of partsRequests) {
    const existing = partsMap.get(request.part_name);

    if (existing) {
      existing.totalQuantity += request.quantity;
      existing.requestCount += 1;
      if (request.delivery_status === 'pending') existing.pendingCount += 1;
      if (request.delivery_status === 'delivered') existing.deliveredCount += 1;
      if (
        new Date(request.request_date) > new Date(existing.lastRequestDate)
      ) {
        existing.lastRequestDate = request.request_date;
      }
    } else {
      partsMap.set(request.part_name, {
        partName: request.part_name,
        totalQuantity: request.quantity,
        requestCount: 1,
        pendingCount: request.delivery_status === 'pending' ? 1 : 0,
        deliveredCount: request.delivery_status === 'delivered' ? 1 : 0,
        lastRequestDate: request.request_date,
      });
    }
  }

  return Array.from(partsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export async function getTechnicianPerformance(): Promise<TechnicianPerformance[]> {
  const { data: technicians, error: techError } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'technician');

  if (techError) throw techError;
  if (!technicians) return [];

  const performance: TechnicianPerformance[] = [];

  for (const tech of technicians) {
    const { data: services, error: servicesError } = await supabase
      .from('service_logs')
      .select('created_at')
      .eq('technician_id', tech.id);

    const { data: calls, error: callsError } = await supabase
      .from('technician_calls')
      .select('created_at, updated_at, status')
      .eq('assigned_technician_id', tech.id)
      .eq('status', 'completed');

    const completedServices = services?.length || 0;
    const completedCalls = calls?.length || 0;

    let totalResponseTime = 0;
    if (calls && calls.length > 0) {
      for (const call of calls) {
        const created = new Date(call.created_at);
        const updated = new Date(call.updated_at);
        totalResponseTime += (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
      }
    }

    const averageResponseTime =
      completedCalls > 0 ? Math.round((totalResponseTime / completedCalls) * 10) / 10 : 0;

    const allActivities = [
      ...(services || []).map((s) => s.created_at),
      ...(calls || []).map((c) => c.created_at),
    ].sort();

    const lastActivityDate =
      allActivities.length > 0 ? allActivities[allActivities.length - 1] : null;

    performance.push({
      technicianId: tech.id,
      technicianName: tech.name,
      completedServices,
      completedCalls,
      averageResponseTime,
      totalWorkHours: Math.round(totalResponseTime * 10) / 10,
      lastActivityDate,
    });
  }

  return performance.sort((a, b) => b.completedServices - a.completedServices);
}

export async function getServiceOverdueList(): Promise<ServiceOverdueItem[]> {
  const { data: tractors, error } = await supabase
    .from('tractors')
    .select('id, model, serial_number, current_moto_hours, next_service_hours, location, status');

  if (error) throw error;
  if (!tractors) return [];

  const overdue = tractors
    .filter((t) => t.current_moto_hours >= t.next_service_hours)
    .map((t) => ({
      tractorId: t.id,
      model: t.model,
      serialNumber: t.serial_number,
      currentMotoHours: t.current_moto_hours,
      nextServiceHours: t.next_service_hours,
      hoursOverdue: t.current_moto_hours - t.next_service_hours,
      location: t.location,
      status: t.status,
    }));

  return overdue.sort((a, b) => b.hoursOverdue - a.hoursOverdue);
}

export async function getMotoHourHistory(
  startDate?: string,
  endDate?: string
): Promise<MotoHourHistory[]> {
  let query = supabase
    .from('moto_hours')
    .select(`
      value,
      date,
      tractors!inner(model)
    `)
    .order('date', { ascending: true });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  return data.map((item: any) => ({
    date: item.date,
    value: item.value,
    tractorModel: item.tractors.model,
  }));
}
