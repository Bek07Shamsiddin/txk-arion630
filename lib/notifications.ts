export interface ServiceInterval {
  hours: number;
  title: string;
  message: string;
}

export const SERVICE_INTERVALS: ServiceInterval[] = [
  {
    hours: 50,
    title: 'Initial Service - 50 Hours',
    message: 'Your tractor has reached 50 moto-hours. Perform initial inspection and basic maintenance.',
  },
  {
    hours: 100,
    title: 'First Service - 100 Hours',
    message: 'Your tractor has reached 100 moto-hours. Change engine oil and filter.',
  },
  {
    hours: 250,
    title: 'Service Required - 250 Hours',
    message: 'Your tractor has reached 250 moto-hours. Change engine oil and filter.',
  },
  {
    hours: 500,
    title: 'Major Service - 500 Hours',
    message: 'Your tractor has reached 500 moto-hours. Change engine oil, filter, and perform comprehensive inspection.',
  },
  {
    hours: 1000,
    title: 'Annual Service - 1000 Hours',
    message: 'Your tractor has reached 1000 moto-hours. Perform complete maintenance including oil, filters, and full system check.',
  },
];

export function getServiceIntervalNotification(hours: number): ServiceInterval | null {
  const interval = SERVICE_INTERVALS.find((interval) => interval.hours === hours);

  if (interval) {
    return interval;
  }

  if (hours > 1000 && hours % 1000 === 0) {
    return {
      hours,
      title: `Service Required - ${hours.toLocaleString()} Hours`,
      message: `Your tractor has reached ${hours.toLocaleString()} moto-hours. Perform complete maintenance including oil, filters, and full system check.`,
    };
  }

  return null;
}

export function shouldCreateNotification(
  previousHours: number,
  newHours: number,
  intervalHours: number
): boolean {
  return previousHours < intervalHours && newHours >= intervalHours;
}

export function getTriggeredIntervals(
  previousHours: number,
  newHours: number
): ServiceInterval[] {
  const triggered: ServiceInterval[] = [];

  for (const interval of SERVICE_INTERVALS) {
    if (shouldCreateNotification(previousHours, newHours, interval.hours)) {
      triggered.push(interval);
    }
  }

  if (newHours >= 1000) {
    const startMultiplier = Math.floor(previousHours / 1000);
    const endMultiplier = Math.floor(newHours / 1000);

    for (let i = startMultiplier + 1; i <= endMultiplier; i++) {
      const intervalHours = i * 1000;
      const notification = getServiceIntervalNotification(intervalHours);
      if (notification) {
        triggered.push(notification);
      }
    }
  }

  return triggered;
}
