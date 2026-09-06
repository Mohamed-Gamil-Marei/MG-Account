import { JournalEntryLine, CurrencyCode } from '../types';

export interface JournalHistorySnapshot {
  id: string;
  timestamp: Date;
  actionLabel: string;
  actionCategory: 'NUMBER_EDIT' | 'DECIMAL_EDIT' | 'NEGATIVE_STORNO' | 'LINE_STRUCTURE' | 'TEMPLATE_APPLY' | 'AUTO_BALANCE' | 'GENERAL';
  lines: JournalEntryLine[];
  description?: string;
  currency: CurrencyCode;
  exchangeRate: number;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  detail?: {
    lineIndex?: number;
    accountName?: string;
    field?: keyof JournalEntryLine;
    oldValue?: any;
    newValue?: any;
  };
}

/**
 * Creates an immutable deep copy of journal lines
 */
export const cloneJournalLines = (lines: JournalEntryLine[]): JournalEntryLine[] => {
  return lines.map((l) => ({
    ...l,
    debit: typeof l.debit === 'number' ? Number(l.debit.toFixed(4)) : 0,
    credit: typeof l.credit === 'number' ? Number(l.credit.toFixed(4)) : 0,
    foreignDebit: typeof l.foreignDebit === 'number' ? Number(l.foreignDebit.toFixed(4)) : 0,
    foreignCredit: typeof l.foreignCredit === 'number' ? Number(l.foreignCredit.toFixed(4)) : 0,
    exchangeRate: typeof l.exchangeRate === 'number' ? l.exchangeRate : 1.0,
  }));
};

/**
 * Calculates totals with standard precision
 */
export const calculateLinesTotals = (lines: JournalEntryLine[]) => {
  const totalDebit = Number(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0).toFixed(2));
  const totalCredit = Number(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0).toFixed(2));
  const foreignTotalDebit = Number(lines.reduce((s, l) => s + (Number(l.foreignDebit) || 0), 0).toFixed(2));
  const foreignTotalCredit = Number(lines.reduce((s, l) => s + (Number(l.foreignCredit) || 0), 0).toFixed(2));
  const difference = Number(Math.abs(totalDebit - totalCredit).toFixed(2));
  const foreignDifference = Number(Math.abs(foreignTotalDebit - foreignTotalCredit).toFixed(2));
  const isBalanced = totalDebit > 0 && difference < 0.01;
  const hasNegativeValues = lines.some((l) => (Number(l.debit) || 0) < 0 || (Number(l.credit) || 0) < 0 || (Number(l.foreignDebit) || 0) < 0 || (Number(l.foreignCredit) || 0) < 0);
  const hasDecimals = lines.some((l) => {
    const deb = Number(l.debit) || 0;
    const cred = Number(l.credit) || 0;
    return (deb % 1 !== 0) || (cred % 1 !== 0);
  });

  return {
    totalDebit,
    totalCredit,
    foreignTotalDebit,
    foreignTotalCredit,
    difference,
    foreignDifference,
    isBalanced,
    hasNegativeValues,
    hasDecimals,
  };
};

/**
 * Formats financial values in Arabic accounting standard (handling decimals and negative storno values)
 */
export const formatFinancialValue = (val: number | string, currency: string = 'ج.م'): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return `0.00 ${currency}`;
  
  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (isNegative) {
    return `(${absFormatted}) سالب ${currency}`;
  }
  return `${absFormatted} ${currency}`;
};

/**
 * Generates an intuitive, readable Arabic label for an undo action
 */
export const generateActionLabel = (
  type: string,
  meta?: {
    lineIndex?: number;
    accountName?: string;
    field?: string;
    oldVal?: number | string;
    newVal?: number | string;
    diff?: number;
    currency?: string;
  }
): { label: string; category: JournalHistorySnapshot['actionCategory'] } => {
  const lineNum = meta?.lineIndex !== undefined ? `الطرف #${meta.lineIndex + 1}` : '';
  const acc = meta?.accountName ? `[${meta.accountName}]` : '';

  if (type === 'EDIT_DEBIT') {
    const isNeg = typeof meta?.newVal === 'number' && meta.newVal < 0;
    const isDec = typeof meta?.newVal === 'number' && meta.newVal % 1 !== 0;
    return {
      label: `تعديل مدين ${lineNum} ${acc}: ${formatFinancialValue(meta?.newVal || 0, meta?.currency)}`,
      category: isNeg ? 'NEGATIVE_STORNO' : isDec ? 'DECIMAL_EDIT' : 'NUMBER_EDIT',
    };
  }

  if (type === 'EDIT_CREDIT') {
    const isNeg = typeof meta?.newVal === 'number' && meta.newVal < 0;
    const isDec = typeof meta?.newVal === 'number' && meta.newVal % 1 !== 0;
    return {
      label: `تعديل دائن ${lineNum} ${acc}: ${formatFinancialValue(meta?.newVal || 0, meta?.currency)}`,
      category: isNeg ? 'NEGATIVE_STORNO' : isDec ? 'DECIMAL_EDIT' : 'NUMBER_EDIT',
    };
  }

  if (type === 'EDIT_FOREIGN_DEBIT') {
    return {
      label: `تعديل مدين أجنبي ${lineNum}: ${meta?.newVal} ${meta?.currency}`,
      category: 'DECIMAL_EDIT',
    };
  }

  if (type === 'EDIT_FOREIGN_CREDIT') {
    return {
      label: `تعديل دائن أجنبي ${lineNum}: ${meta?.newVal} ${meta?.currency}`,
      category: 'DECIMAL_EDIT',
    };
  }

  if (type === 'SELECT_ACCOUNT') {
    return {
      label: `تحديد حساب ${lineNum}: ${acc}`,
      category: 'LINE_STRUCTURE',
    };
  }

  if (type === 'ADD_LINE') {
    return {
      label: `إضافة طرف قيد جديد (${lineNum})`,
      category: 'LINE_STRUCTURE',
    };
  }

  if (type === 'REMOVE_LINE') {
    return {
      label: `حذف ${lineNum} ${acc}`,
      category: 'LINE_STRUCTURE',
    };
  }

  if (type === 'AUTO_BALANCE') {
    return {
      label: `موازنة القيد التلقائية بقيمة فارق ${formatFinancialValue(meta?.diff || 0, meta?.currency)}`,
      category: 'AUTO_BALANCE',
    };
  }

  if (type === 'REVERSE_ENTRY') {
    return {
      label: `عكس أطراف القيد (تبديل المدين والدائن)`,
      category: 'LINE_STRUCTURE',
    };
  }

  if (type === 'STORNO_CORRECTION') {
    return {
      label: `تطبيق تسوية قيد عكسي سالب (Red Storno)`,
      category: 'NEGATIVE_STORNO',
    };
  }

  if (type === 'APPLY_TEMPLATE') {
    return {
      label: `تطبيق قالب محاسبي جاهز`,
      category: 'TEMPLATE_APPLY',
    };
  }

  if (type === 'AI_GENERATE') {
    return {
      label: `تطبيق القيد المقترح من الذكاء الاصطناعي`,
      category: 'TEMPLATE_APPLY',
    };
  }

  return {
    label: type || 'تعديل في بيانات القيد',
    category: 'GENERAL',
  };
};
