import { ClientDeadline, DeadlineType } from '../types';

export type { ClientDeadline, DeadlineType };

export type CalculatedDeadlineStatus = 'FILED' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';

/**
 * Calculates the operational status of a deadline relative to today:
 * - 'FILED': if status is 'FILED'
 * - 'OVERDUE': if due date is strictly before today (diffDays < 0)
 * - 'DUE_SOON': if due date is today or within 7 days (0 <= diffDays <= 7)
 * - 'UPCOMING': if due date is more than 7 days in the future (diffDays > 7)
 */
export function getDeadlineStatus(
  deadline: ClientDeadline,
  todayInput?: Date | string
): CalculatedDeadlineStatus {
  if (deadline.status === 'FILED') {
    return 'FILED';
  }

  const today = todayInput
    ? typeof todayInput === 'string'
      ? new Date(todayInput)
      : new Date(todayInput)
    : new Date();

  // Normalize dates to start of day in local time for accurate calendar day comparison
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [yearStr, monthStr, dayStr] = String(deadline.dueDate || '').split('-');
  const dueYear = Number(yearStr) || today.getFullYear();
  const dueMonth = (Number(monthStr) || 1) - 1;
  const dueDay = Number(dayStr) || 1;

  const dueNormalized = new Date(dueYear, dueMonth, dueDay);

  const diffMs = dueNormalized.getTime() - todayNormalized.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'OVERDUE';
  }
  if (diffDays <= 7) {
    return 'DUE_SOON';
  }
  return 'UPCOMING';
}

export function formatDeadlineTypeLabel(type: DeadlineType): string {
  switch (type) {
    case 'INCOME_TAX':
      return 'إقرار ضريبة الدخل';
    case 'VAT':
      return 'إقرار القيمة المضافة (VAT)';
    case 'WHT':
      return 'إقرار الخصم والتحصيل (WHT)';
    case 'PAYROLL_TAX':
      return 'إقرار كسب العمل والأجور';
    case 'SOCIAL_INSURANCE':
      return 'التأمينات الاجتماعية';
    case 'COMMERCIAL_REGISTER':
      return 'تجديد السجل التجاري';
    case 'OTHER':
    default:
      return 'موعد/إقرار آخر';
  }
}

/**
 * Helper to generate simple monthly repeated deadlines without auto-calculating legal dates.
 */
export function generateMonthlyDeadlines(
  base: Omit<ClientDeadline, 'id' | 'createdAt' | 'updatedAt'>,
  monthsCount: number
): Omit<ClientDeadline, 'id' | 'createdAt' | 'updatedAt'>[] {
  const result: Omit<ClientDeadline, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const [yearStr, monthStr, dayStr] = String(base.dueDate || '').split('-');

  let startYear = Number(yearStr) || new Date().getFullYear();
  let startMonth = (Number(monthStr) || 1) - 1; // 0-indexed
  const startDay = Number(dayStr) || 1;

  for (let i = 1; i <= monthsCount; i++) {
    let targetMonth = startMonth + i;
    let targetYear = startYear + Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;

    // Handle days in month e.g. Feb 28/29
    const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(startDay, maxDaysInMonth);

    const formattedMonth = String(targetMonth + 1).padStart(2, '0');
    const formattedDay = String(actualDay).padStart(2, '0');
    const dueDate = `${targetYear}-${formattedMonth}-${formattedDay}`;

    result.push({
      ...base,
      title: `${base.title} (شهر ${targetMonth + 1}/${targetYear})`,
      dueDate,
      status: 'PENDING',
      filedAt: undefined,
    });
  }

  return result;
}
