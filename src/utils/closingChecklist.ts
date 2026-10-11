export type ClosingStepStatus = 'PENDING' | 'DONE' | 'NA';

export interface ClosingStep {
  id: string;
  label: string;
  required: boolean;
  status: ClosingStepStatus;
  doneBy?: string;
  doneAt?: string;
  note?: string;
}

export function createDefaultChecklist(): ClosingStep[] {
  return [
    { id: 'trial_balance_balanced', label: 'ميزان المراجعة متزن', required: true, status: 'PENDING' },
    { id: 'opening_balances_reconciled', label: 'مطابقة الأرصدة الافتتاحية', required: true, status: 'PENDING' },
    { id: 'depreciation_entry', label: 'قيد الإهلاك', required: true, status: 'PENDING' },
    { id: 'inventory_count_adjusted', label: 'جرد المخزون وتسويته', required: true, status: 'PENDING' },
    { id: 'accounts_receivable_reconciled', label: 'مطابقة العملاء', required: true, status: 'PENDING' },
    { id: 'accounts_payable_reconciled', label: 'مطابقة الموردين', required: true, status: 'PENDING' },
    { id: 'bank_cash_reconciled', label: 'مطابقة البنك والخزنة', required: true, status: 'PENDING' },
    { id: 'provisions_accruals_reviewed', label: 'المخصصات والمستحقات', required: true, status: 'PENDING' },
    { id: 'taxes_reconciled', label: 'الضرائب (دخل / قيمة مضافة / خصم وإضافة)', required: true, status: 'PENDING' },
    { id: 'financial_statements_reviewed', label: 'مراجعة القوائم', required: true, status: 'PENDING' },
    { id: 'auditor_approval', label: 'اعتماد المحاسب', required: true, status: 'PENDING' },
  ];
}

export function canFinalize(checklist: ClosingStep[]): { ok: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const step of checklist) {
    if (step.required) {
      if (step.status === 'DONE') {
        continue;
      } else if (step.status === 'NA') {
        if (step.note && step.note.trim().length > 0) {
          continue;
        } else {
          missing.push(`${step.label} (يتطلب مبرر التخطي)`);
        }
      } else {
        missing.push(step.label);
      }
    }
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}
