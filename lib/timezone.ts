const UZBEKISTAN_TIMEZONE = 'Asia/Tashkent';

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function getCurrentDate(): string {
  const now = new Date();

  if (isNaN(now.getTime())) {
    throw new Error('Invalid date: Cannot get current date');
  }

  const uzbekistanDate = new Date(now.toLocaleString('en-US', { timeZone: UZBEKISTAN_TIMEZONE }));

  if (isNaN(uzbekistanDate.getTime())) {
    throw new Error('Invalid date: Cannot convert to Uzbekistan timezone');
  }

  const year = uzbekistanDate.getFullYear();
  const month = String(uzbekistanDate.getMonth() + 1).padStart(2, '0');
  const day = String(uzbekistanDate.getDate()).padStart(2, '0');

  const dateString = `${year}-${month}-${day}`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error('Invalid date format produced');
  }

  return dateString;
}

export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: UZBEKISTAN_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: UZBEKISTAN_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateShort(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: UZBEKISTAN_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: UZBEKISTAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return formatDateShort(date);
  }
}

export function getTimezoneInfo(): string {
  return UZBEKISTAN_TIMEZONE;
}

export function getTimezoneOffset(): string {
  const date = new Date();
  const uzbekistanTime = new Date(date.toLocaleString('en-US', { timeZone: UZBEKISTAN_TIMEZONE }));
  const offset = (uzbekistanTime.getTime() - date.getTime() + date.getTimezoneOffset() * 60000) / 3600000;
  const hours = Math.floor(Math.abs(offset));
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${hours}`;
}

export function formatDateForInput(dateString?: string | Date): string {
  if (!dateString) {
    return getCurrentDate();
  }

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) {
    return getCurrentDate();
  }

  const uzbekistanDate = new Date(date.toLocaleString('en-US', { timeZone: UZBEKISTAN_TIMEZONE }));

  if (isNaN(uzbekistanDate.getTime())) {
    return getCurrentDate();
  }

  const year = uzbekistanDate.getFullYear();
  const month = String(uzbekistanDate.getMonth() + 1).padStart(2, '0');
  const day = String(uzbekistanDate.getDate()).padStart(2, '0');

  const dateStringFormatted = `${year}-${month}-${day}`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStringFormatted)) {
    return getCurrentDate();
  }

  return dateStringFormatted;
}

export function isToday(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const today = getCurrentDate();
  const inputDate = formatDateForInput(date);
  return today === inputDate;
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = formatDateForInput(date1);
  const d2 = formatDateForInput(date2);
  return d1 === d2;
}
