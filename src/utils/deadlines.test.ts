import { describe, it, expect } from 'vitest';
import { getDeadlineStatus, ClientDeadline } from './deadlines';

describe('getDeadlineStatus (Client Deadlines Utility)', () => {
  const todayStr = '2026-10-15'; // Base reference date for tests

  it('returns FILED when deadline status is FILED regardless of due date', () => {
    const deadline: ClientDeadline = {
      id: 'd1',
      clientId: 'c1',
      type: 'VAT',
      title: 'إقرار القيمة المضافة',
      dueDate: '2026-10-01', // Past date
      status: 'FILED',
      filedAt: '2026-09-28',
    };

    expect(getDeadlineStatus(deadline, todayStr)).toBe('FILED');
  });

  it('returns OVERDUE when due date is in the past and status is pending/late', () => {
    const deadline: ClientDeadline = {
      id: 'd2',
      clientId: 'c1',
      type: 'INCOME_TAX',
      title: 'إقرار ضريبة الدخل',
      dueDate: '2026-10-10', // 5 days past todayStr (2026-10-15)
      status: 'PENDING',
    };

    expect(getDeadlineStatus(deadline, todayStr)).toBe('OVERDUE');
  });

  it('returns DUE_SOON when due date is today or within 7 days in the future', () => {
    // Due today
    const deadlineToday: ClientDeadline = {
      id: 'd3',
      clientId: 'c1',
      type: 'WHT',
      title: 'إقرار نموذج 44',
      dueDate: '2026-10-15', // Same day
      status: 'PENDING',
    };
    expect(getDeadlineStatus(deadlineToday, todayStr)).toBe('DUE_SOON');

    // Due in 5 days (within 7 days)
    const deadline5Days: ClientDeadline = {
      id: 'd4',
      clientId: 'c1',
      type: 'PAYROLL_TAX',
      title: 'إقرار كسب العمل',
      dueDate: '2026-10-20', // 5 days future
      status: 'PENDING',
    };
    expect(getDeadlineStatus(deadline5Days, todayStr)).toBe('DUE_SOON');

    // Due in exactly 7 days
    const deadline7Days: ClientDeadline = {
      id: 'd5',
      clientId: 'c1',
      type: 'SOCIAL_INSURANCE',
      title: 'سداد التأمينات',
      dueDate: '2026-10-22', // Exactly 7 days
      status: 'PENDING',
    };
    expect(getDeadlineStatus(deadline7Days, todayStr)).toBe('DUE_SOON');
  });

  it('returns UPCOMING when due date is more than 7 days in the future', () => {
    const deadlineUpcoming: ClientDeadline = {
      id: 'd6',
      clientId: 'c1',
      type: 'COMMERCIAL_REGISTER',
      title: 'تجديد السجل التجاري',
      dueDate: '2026-11-01', // 17 days in the future
      status: 'PENDING',
    };

    expect(getDeadlineStatus(deadlineUpcoming, todayStr)).toBe('UPCOMING');
  });
});
