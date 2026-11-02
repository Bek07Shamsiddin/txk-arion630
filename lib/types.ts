export type UserRole = 'operator' | 'technician' | 'admin';
export type TractorStatus = 'active' | 'maintenance' | 'inactive';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type PartsUrgency = 'urgent' | 'medium' | 'normal';
export type DeliveryStatus = 'pending' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled';
export type CallStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type MechanicRequestStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Tractor {
  id: string;
  model: string;
  serial_number: string;
  registration_date: string;
  location: string;
  current_moto_hours: number;
  next_service_hours: number;
  status: TractorStatus;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceLog {
  id: string;
  tractor_id: string;
  service_type: string;
  moto_hour: number;
  date: string;
  used_parts: Record<string, unknown>[];
  technician_note?: string;
  uploaded_photos: string[];
  technician_id?: string;
  created_at: string;
}

export interface MotoHour {
  id: string;
  tractor_id: string;
  value: number;
  date: string;
  operator_note?: string;
  operator_id?: string;
  created_at: string;
}

export interface PartsRequest {
  id: string;
  tractor_id: string;
  part_name: string;
  quantity: number;
  urgency: PartsUrgency;
  request_date: string;
  delivery_status: DeliveryStatus;
  requested_by?: string;
  notes?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MechanicRequest {
  id: string;
  tractor_id: string;
  operator_name: string;
  problem_description: string;
  request_date: string;
  status: MechanicRequestStatus;
  assigned_technician_id?: string;
  completed_at?: string;
  technician_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TechnicianCall {
  id: string;
  tractor_id: string;
  operator_id: string;
  date: string;
  description: string;
  status: CallStatus;
  assigned_technician_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceNotification {
  id: string;
  tractor_id: string;
  notification_type: string;
  triggered_at_hours: number;
  is_read: boolean;
  created_at: string;
}
