import { Tractor } from './types';

export type ServiceStatusColor = 'green' | 'yellow' | 'red';

export interface TractorServiceStatus {
  color: ServiceStatusColor;
  label: string;
  hoursUntilService: number;
}

export function getTractorServiceStatus(tractor: Tractor): TractorServiceStatus {
  const hoursUntilService = tractor.next_service_hours - tractor.current_moto_hours;

  if (hoursUntilService <= 0) {
    return {
      color: 'red',
      label: 'Service Required',
      hoursUntilService: 0,
    };
  }

  if (hoursUntilService <= 50) {
    return {
      color: 'yellow',
      label: 'Upcoming Service',
      hoursUntilService,
    };
  }

  return {
    color: 'green',
    label: 'OK',
    hoursUntilService,
  };
}

export function getStatusColor(color: ServiceStatusColor): string {
  switch (color) {
    case 'green':
      return '#10b981';
    case 'yellow':
      return '#f59e0b';
    case 'red':
      return '#ef4444';
  }
}
