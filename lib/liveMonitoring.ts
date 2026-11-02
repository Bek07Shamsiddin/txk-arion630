import { supabase } from './supabase';

export interface TractorLiveData {
  tractorId: string;
  pendingPartsCount: number;
  activeCallsCount: number;
  hoursUntilService: number;
  isOverdue: boolean;
}

export async function getTractorLiveData(tractorId: string): Promise<TractorLiveData> {
  const [partsResult, callsResult, tractorResult] = await Promise.all([
    supabase
      .from('parts_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tractor_id', tractorId)
      .eq('delivery_status', 'pending'),

    supabase
      .from('technician_calls')
      .select('id', { count: 'exact', head: true })
      .eq('tractor_id', tractorId)
      .in('status', ['pending', 'in-progress']),

    supabase
      .from('tractors')
      .select('current_moto_hours, next_service_hours')
      .eq('id', tractorId)
      .maybeSingle(),
  ]);

  const pendingPartsCount = partsResult.count || 0;
  const activeCallsCount = callsResult.count || 0;

  let hoursUntilService = 0;
  let isOverdue = false;

  if (tractorResult.data) {
    hoursUntilService =
      tractorResult.data.next_service_hours - tractorResult.data.current_moto_hours;
    isOverdue = hoursUntilService < 0;
  }

  return {
    tractorId,
    pendingPartsCount,
    activeCallsCount,
    hoursUntilService: Math.max(0, hoursUntilService),
    isOverdue,
  };
}

export async function getAllTractorsLiveData(): Promise<Map<string, TractorLiveData>> {
  const { data: tractors, error } = await supabase
    .from('tractors')
    .select('id, current_moto_hours, next_service_hours');

  if (error || !tractors) {
    return new Map();
  }

  const liveDataPromises = tractors.map((tractor) => getTractorLiveData(tractor.id));
  const liveDataArray = await Promise.all(liveDataPromises);

  const liveDataMap = new Map<string, TractorLiveData>();
  liveDataArray.forEach((data) => {
    liveDataMap.set(data.tractorId, data);
  });

  return liveDataMap;
}
