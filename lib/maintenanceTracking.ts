import { supabase } from './supabase';

export interface ServiceInterval {
  id: string;
  service_name: string;
  interval_hours: number;
  description: string;
  service_category: 'critical' | 'routine' | 'major';
  parts_needed: string[];
  estimated_duration_minutes: number;
}

export interface MaintenanceAlert {
  type: 'overdue' | 'due_soon' | 'upcoming';
  service_name: string;
  current_hours: number;
  service_due_hours: number;
  hours_remaining: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export async function getServiceIntervals(): Promise<ServiceInterval[]> {
  try {
    const { data, error } = await supabase
      .from('service_intervals')
      .select('*')
      .order('interval_hours');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading service intervals:', error);
    return [];
  }
}

export function calculateNextServiceHour(
  currentHours: number,
  lastServiceHour: number,
  serviceInterval: number
): number {
  const hoursSinceLastService = currentHours - lastServiceHour;
  const servicesCompleted = Math.floor(hoursSinceLastService / serviceInterval);
  return lastServiceHour + ((servicesCompleted + 1) * serviceInterval);
}

export function getMaintenanceAlerts(
  currentHours: number,
  serviceIntervals: ServiceInterval[],
  lastServiceHours: Record<string, number> = {}
): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];

  serviceIntervals.forEach((interval) => {
    const lastService = lastServiceHours[interval.service_name] || 0;
    const nextServiceDue = calculateNextServiceHour(
      currentHours,
      lastService,
      interval.interval_hours
    );
    const hoursRemaining = nextServiceDue - currentHours;

    let type: MaintenanceAlert['type'];
    let priority: MaintenanceAlert['priority'];
    let message: string;

    if (hoursRemaining <= 0) {
      type = 'overdue';
      priority = interval.service_category === 'critical' ? 'critical' : 'high';
      message = `${interval.service_name} is ${Math.abs(hoursRemaining)} hours overdue!`;
    } else if (hoursRemaining <= 30) {
      type = 'due_soon';
      priority = interval.service_category === 'critical' ? 'high' : 'medium';
      message = `${interval.service_name} due in ${hoursRemaining} hours`;
    } else if (hoursRemaining <= 100) {
      type = 'upcoming';
      priority = 'medium';
      message = `${interval.service_name} due at ${nextServiceDue} hours`;
    } else {
      type = 'upcoming';
      priority = 'low';
      message = `${interval.service_name} scheduled at ${nextServiceDue} hours`;
    }

    alerts.push({
      type,
      service_name: interval.service_name,
      current_hours: currentHours,
      service_due_hours: nextServiceDue,
      hours_remaining: hoursRemaining,
      priority,
      message,
    });
  });

  return alerts.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export async function createMaintenanceNotifications(
  tractorId: string,
  currentHours: number,
  previousHours: number
): Promise<void> {
  try {
    const serviceIntervals = await getServiceIntervals();

    const newlyTriggered = serviceIntervals.filter((interval) => {
      return (
        previousHours < interval.interval_hours &&
        currentHours >= interval.interval_hours
      );
    });

    if (newlyTriggered.length === 0) return;

    const notifications = newlyTriggered.map((interval) => ({
      tractor_id: tractorId,
      notification_type: `${interval.service_name} Due`,
      message: `${interval.service_name} is now due at ${currentHours} hours. ${interval.description}`,
      triggered_at_hours: currentHours,
      is_read: false,
    }));

    const { error } = await supabase
      .from('service_notifications')
      .insert(notifications);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating maintenance notifications:', error);
  }
}

export function getMaintenanceStatusColor(alert: MaintenanceAlert): string {
  switch (alert.type) {
    case 'overdue':
      return '#ef4444';
    case 'due_soon':
      return '#f59e0b';
    case 'upcoming':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

export function getMaintenanceStatusLabel(alert: MaintenanceAlert): string {
  switch (alert.type) {
    case 'overdue':
      return 'OVERDUE';
    case 'due_soon':
      return 'DUE SOON';
    case 'upcoming':
      return 'SCHEDULED';
    default:
      return 'OK';
  }
}

export async function getLastServiceHours(tractorId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('service_logs')
      .select('service_type, moto_hour')
      .eq('tractor_id', tractorId)
      .order('moto_hour', { ascending: false });

    if (error) throw error;

    const lastServiceHours: Record<string, number> = {};

    data?.forEach((log) => {
      if (!lastServiceHours[log.service_type]) {
        lastServiceHours[log.service_type] = log.moto_hour;
      }
    });

    return lastServiceHours;
  } catch (error) {
    console.error('Error getting last service hours:', error);
    return {};
  }
}
