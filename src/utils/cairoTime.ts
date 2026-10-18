/**
 * توقيت القاهرة المحلي (Africa/Cairo) لمنع أخطاء فرق التوقيت UTC
 * عند استخدام toISOString().slice(0, 10)
 */

export function getCairoDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    const offsetMs = 2 * 60 * 60 * 1000;
    const cairoDate = new Date(date.getTime() + offsetMs);
    return cairoDate.toISOString().slice(0, 10);
  }
}

export function getCairoTimestamp(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour') === '24' ? '00' : getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day}T${hour}:${minute}:${second}+02:00`;
  } catch {
    return date.toISOString();
  }
}

export function getCairoCurrentYear(date: Date = new Date()): number {
  const dateStr = getCairoDateString(date);
  return parseInt(dateStr.slice(0, 4), 10) || 2026;
}

export function formatCairoDateTimeArabic(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return getCairoDateString(date);
  }
}

