export type DeadlineType =
  | 'VAT'
  | 'INCOME_TAX'
  | 'WHT'
  | 'PAYROLL_TAX'
  | 'SOCIAL_INSURANCE'
  | 'COMMERCIAL_REGISTER'
  | 'E_INVOICE'
  | 'OTHER'
  | string;

export type CalculatedDeadlineStatus = 'FILED' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';

export interface ClientDeadline {
  id: string;
  clientId: string;
  type?: DeadlineType;
  title: string;
  dueDate: string; // YYYY-MM-DD
  status: 'PENDING' | 'FILED' | 'LATE' | string;
  period?: string;
  filedAt?: string;
  receiptNo?: string;
  notes?: string;
}

export function getDeadlineStatus(
  deadline: ClientDeadline,
  referenceDateStr?: string
): CalculatedDeadlineStatus {
  if (deadline.status === 'FILED') {
    return 'FILED';
  }

  const refStr = referenceDateStr || new Date().toISOString().slice(0, 10);
  const [rY, rM, rD] = refStr.split('-').map(Number);
  const [dY, dM, dD] = (deadline.dueDate || refStr).split('-').map(Number);

  const refUtc = Date.UTC(rY, (rM || 1) - 1, rD || 1);
  const dueUtc = Date.UTC(dY, (dM || 1) - 1, dD || 1);

  const diffDays = Math.round((dueUtc - refUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'OVERDUE';
  }
  if (diffDays <= 7) {
    return 'DUE_SOON';
  }
  return 'UPCOMING';
}

export function formatDeadlineTypeLabel(type?: DeadlineType): string {
  switch (type) {
    case 'VAT':
      return 'ضريبة القيمة المضافة';
    case 'INCOME_TAX':
      return 'ضريبة الدخل السنوية';
    case 'WHT':
      return 'الخصم والتحصيل (نموذج 41)';
    case 'PAYROLL_TAX':
      return 'ضريبة كسب العمل';
    case 'SOCIAL_INSURANCE':
      return 'التأمينات الاجتماعية';
    case 'COMMERCIAL_REGISTER':
      return 'السجل التجاري';
    case 'E_INVOICE':
      return 'الفاتورة الإلكترونية';
    default:
      return 'التزام دوري';
  }
}
