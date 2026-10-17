import { Account, AccountCategory, AccountNature } from '../types';

export interface RawChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  subType?: string;
  balance: number;
}

export const RAW_EGYPTIAN_CHART_OF_ACCOUNTS: RawChartAccount[] = [
  { id: '1101', code: '1101', name: 'الربط المباشر مع الخزينة الرئيسية', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 150000 },
  { id: '1102', code: '1102', name: 'البنك الأهلي المصري - حساب جاري', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 450000 },
  { id: '1103', code: '1103', name: 'العملاء وحسابات القبض', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 280000 },
  { id: '1104', code: '1104', name: 'مخزون بضائع بغرض البيع', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 320000 },
  { id: '1220', code: '1220', name: 'عملاء المبيعات والخدمات', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 0 },
  { id: '1221', code: '1221', name: 'العملاء وحسابات القبض التجارية', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 0 },
  { id: '1230', code: '1230', name: 'عملاء الفواتير الإلكترونية المعتمدة', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 0 },
  { id: '1231', code: '1231', name: 'حساب المبيعات والخدمات الآجلة', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 0 },
  { id: '1201', code: '1201', name: 'الأصول الثابتة - آلات ومعدات', type: 'ASSET', subType: 'NON_CURRENT_ASSET', balance: 850000 },
  { id: '1202', code: '1202', name: 'مجمع إهلاك الآلات والمعدات', type: 'ASSET', subType: 'NON_CURRENT_ASSET', balance: -150000 },
  { id: '2101', code: '2101', name: 'الموردون وحسابات الدفع', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 210000 },
  { id: '2102', code: '2102', name: 'أوراق الدفع والكمبيالات', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 95000 },
  { id: '2103', code: '2103', name: 'مصلحة الضرائب - ضريبة القيمة المضافة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 42000 },
  { id: '214', code: '214', name: 'الموردون وحسابات الدائنين التجاريين', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 0 },
  { id: '2140', code: '2140', name: 'موردو الفواتير والمشتريات', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 0 },
  { id: '2145', code: '2145', name: 'موردو الخدمات والمشتريات الآجلة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 0 },
  { id: '2230', code: '2230', name: 'حساب دائنو المشتريات والفواتير', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', balance: 0 },
  { id: '3101', code: '3101', name: 'رأس المال المدفوع', type: 'EQUITY', balance: 1200000 },
  { id: '3102', code: '3102', name: 'الأرباح المرحلة (المدورة)', type: 'EQUITY', balance: 353000 },
  { id: '4100', code: '4100', name: 'إيرادات المبيعات والخدمات', type: 'REVENUE', balance: 0 },
  { id: '4101', code: '4101', name: 'إيرادات النشاط الرئيسي (المبيعات)', type: 'REVENUE', balance: 950000 },
  { id: '4102', code: '4102', name: 'إيرادات الخدمات واستشارات', type: 'REVENUE', balance: 0 },
  { id: '4110', code: '4110', name: 'إيرادات مبيعات الفواتير', type: 'REVENUE', balance: 0 },
  { id: '5101', code: '5101', name: 'تكلفة البضاعة المباعة (كست)', type: 'EXPENSE', balance: 580000 },
  { id: '5201', code: '5201', name: 'مصروفات عمومية وإدارية', type: 'EXPENSE', balance: 120000 },
  { id: '5202', code: '5202', name: 'مصروف أجور ومرتبات', type: 'EXPENSE', balance: 95000 },
];

export const DEFAULT_EGYPTIAN_CHART_OF_ACCOUNTS: Account[] = RAW_EGYPTIAN_CHART_OF_ACCOUNTS.map((raw) => {
  const category = (raw.type || 'ASSET') as AccountCategory;
  const rawTypeStr = String(raw.type || '');
  const isDebitNature = rawTypeStr === 'ASSET' || rawTypeStr === 'EXPENSE';
  const nature: AccountNature = isDebitNature ? 'DEBIT' : 'CREDIT';
  const bal = raw.balance || 0;

  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    category,
    nature,
    level: raw.code.length <= 2 ? 1 : raw.code.length <= 3 ? 2 : 3,
    openingBalanceDebit: isDebitNature ? Math.max(0, bal) : 0,
    openingBalanceCredit: !isDebitNature ? Math.max(0, bal) : 0,
    currentDebit: 0,
    currentCredit: 0,
    currentBalance: bal,
  };
});
