import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../db/localDatabase';
import { formatEgyptianCurrency } from '../utils/egyptianTaxCalculations';
import { ScreenActionToolbar } from './common/ScreenActionToolbar';
import {
  Users,
  Calculator,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Printer,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  FileCheck2,
  Percent,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface PayrollInsuranceEngineProps {
  state: DatabaseState;
}

interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  nationalId: string;
  insuranceNo: string;
  jobTitle: string;
  basicSalary: number;
  variableAllowances: number;
  insurableSalary: number; // الأجر التأميني
  overtimeOrBonus: number;
  penaltiesOrDeductions: number;
}

// Egyptian Salary Tax Calculation Logic
export function calculateEgyptianSalaryTax(grossAnnualTaxable: number): {
  annualTax: number;
  monthlyTax: number;
  taxablePool: number;
  bracketsBreakdown: { bracket: string; amount: number; rate: string; tax: number }[];
} {
  // Personal annual exemption (حد الإعفاء الشخصي للممول)
  const personalExemption = 20000;
  const taxablePool = Math.max(0, grossAnnualTaxable - personalExemption);

  let remaining = taxablePool;
  let annualTax = 0;
  const bracketsBreakdown: { bracket: string; amount: number; rate: string; tax: number }[] = [];

  // Bracket 1: 0 to 40,000 (0% - Zero Bracket)
  const b1 = Math.min(remaining, 40000);
  bracketsBreakdown.push({ bracket: 'من 1 إلى 40,000 ج.م', amount: b1, rate: '0%', tax: 0 });
  remaining -= b1;

  // Bracket 2: 40,001 to 55,000 (10%)
  if (remaining > 0) {
    const b2 = Math.min(remaining, 15000);
    const tax = b2 * 0.1;
    annualTax += tax;
    bracketsBreakdown.push({ bracket: 'من 40,001 إلى 55,000 ج.م', amount: b2, rate: '10%', tax });
    remaining -= b2;
  }

  // Bracket 3: 55,001 to 70,000 (15%)
  if (remaining > 0) {
    const b3 = Math.min(remaining, 15000);
    const tax = b3 * 0.15;
    annualTax += tax;
    bracketsBreakdown.push({ bracket: 'من 55,001 إلى 70,000 ج.م', amount: b3, rate: '15%', tax });
    remaining -= b3;
  }

  // Bracket 4: 70,001 to 200,000 (20%)
  if (remaining > 0) {
    const b4 = Math.min(remaining, 130000);
    const tax = b4 * 0.2;
    annualTax += tax;
    bracketsBreakdown.push({ bracket: 'من 70,001 إلى 200,000 ج.م', amount: b4, rate: '20%', tax });
    remaining -= b4;
  }

  // Bracket 5: 200,001 to 400,000 (22.5%)
  if (remaining > 0) {
    const b5 = Math.min(remaining, 200000);
    const tax = b5 * 0.225;
    annualTax += tax;
    bracketsBreakdown.push({ bracket: 'من 200,001 إلى 400,000 ج.م', amount: b5, rate: '22.5%', tax });
    remaining -= b5;
  }

  // Bracket 6: Above 400,000 (25%)
  if (remaining > 0) {
    const b6 = remaining;
    const tax = b6 * 0.25;
    annualTax += tax;
    bracketsBreakdown.push({ bracket: 'أكثر من 400,000 ج.م', amount: b6, rate: '25%', tax });
  }

  return {
    annualTax,
    monthlyTax: annualTax / 12,
    taxablePool,
    bracketsBreakdown,
  };
}

export const PayrollInsuranceEngineView: React.FC<PayrollInsuranceEngineProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'TAX_CALCULATOR' | 'FORM_4' | 'FORM_2'>('ROSTER');
  const [selectedMonth, setSelectedMonth] = useState<string>('يناير 2026');

  // Interactive Employee Roster
  const [employees, setEmployees] = useState<EmployeeRecord[]>([
    {
      id: 'emp-1',
      code: 'EMP-001',
      name: 'أحمد محمود عبد الفتاح',
      nationalId: '28911041401923',
      insuranceNo: '14829104',
      jobTitle: 'مدير مالي وإداري',
      basicSalary: 18000,
      variableAllowances: 4000,
      insurableSalary: 12600, // Capped at max insurable limit
      overtimeOrBonus: 1000,
      penaltiesOrDeductions: 0,
    },
    {
      id: 'emp-2',
      code: 'EMP-002',
      name: 'سارة إبراهيم الشناوي',
      nationalId: '29304151602941',
      insuranceNo: '29481920',
      jobTitle: 'رئيس قسم الحسابات',
      basicSalary: 12000,
      variableAllowances: 2500,
      insurableSalary: 12600,
      overtimeOrBonus: 0,
      penaltiesOrDeductions: 0,
    },
    {
      id: 'emp-3',
      code: 'EMP-003',
      name: 'كريم خالد الشرقاوي',
      nationalId: '29809112201948',
      insuranceNo: '39481023',
      jobTitle: 'محاسب عام وتكاليف',
      basicSalary: 7500,
      variableAllowances: 1500,
      insurableSalary: 9000,
      overtimeOrBonus: 500,
      penaltiesOrDeductions: 0,
    },
    {
      id: 'emp-4',
      code: 'EMP-004',
      name: 'محمود حسن جاد الحق',
      nationalId: '29912040102948',
      insuranceNo: '49281940',
      jobTitle: 'أخصائي شؤون إدارية ومخازن',
      basicSalary: 6000,
      variableAllowances: 1000,
      insurableSalary: 7000,
      overtimeOrBonus: 0,
      penaltiesOrDeductions: 0,
    },
  ]);

  // Single Calculator State
  const [calcGrossSalary, setCalcGrossSalary] = useState<number>(15000);
  const [calcInsurableSalary, setCalcInsurableSalary] = useState<number>(12600);

  // Constants per Law 148 of 2019
  const employeeInsuranceRate = 0.11; // 11%
  const employerInsuranceRate = 0.1875; // 18.75%
  const martyrsFundRate = 0.0005; // 0.05%

  // Calculations for entire roster
  const rosterCalculations = useMemo(() => {
    return employees.map((emp) => {
      const grossEarnings =
        emp.basicSalary + emp.variableAllowances + emp.overtimeOrBonus;
      
      // Social insurance
      const employeeInsurance = emp.insurableSalary * employeeInsuranceRate;
      const employerInsurance = emp.insurableSalary * employerInsuranceRate;
      
      // Martyrs Fund (0.05% on gross)
      const martyrsFund = grossEarnings * martyrsFundRate;

      // Taxable gross: Earnings - Employee insurance (exempt from income tax)
      const taxableMonthly = Math.max(0, grossEarnings - employeeInsurance);
      const annualEquivalent = taxableMonthly * 12;
      const taxResult = calculateEgyptianSalaryTax(annualEquivalent);
      const monthlyTax = taxResult.monthlyTax;

      // Total Deductions
      const totalDeductions =
        employeeInsurance + monthlyTax + martyrsFund + emp.penaltiesOrDeductions;
      
      // Net Salary
      const netSalary = Math.max(0, grossEarnings - totalDeductions);

      return {
        ...emp,
        grossEarnings,
        employeeInsurance,
        employerInsurance,
        martyrsFund,
        monthlyTax,
        totalDeductions,
        netSalary,
      };
    });
  }, [employees]);

  // Totals
  const totals = useMemo(() => {
    return rosterCalculations.reduce(
      (acc, curr) => ({
        totalGross: acc.totalGross + curr.grossEarnings,
        totalEmployeeInsurance: acc.totalEmployeeInsurance + curr.employeeInsurance,
        totalEmployerInsurance: acc.totalEmployerInsurance + curr.employerInsurance,
        totalTaxes: acc.totalTaxes + curr.monthlyTax,
        totalNetSalary: acc.totalNetSalary + curr.netSalary,
        totalMartyrsFund: acc.totalMartyrsFund + curr.martyrsFund,
      }),
      {
        totalGross: 0,
        totalEmployeeInsurance: 0,
        totalEmployerInsurance: 0,
        totalTaxes: 0,
        totalNetSalary: 0,
        totalMartyrsFund: 0,
      }
    );
  }, [rosterCalculations]);

  // Single calculation breakdown for interactive calculator tab
  const singleCalc = useMemo(() => {
    const empIns = calcInsurableSalary * employeeInsuranceRate;
    const empyrIns = calcInsurableSalary * employerInsuranceRate;
    const taxableGross = Math.max(0, calcGrossSalary - empIns);
    const tax = calculateEgyptianSalaryTax(taxableGross * 12);
    const martyrs = calcGrossSalary * martyrsFundRate;
    const net = calcGrossSalary - empIns - tax.monthlyTax - martyrs;

    return {
      empIns,
      empyrIns,
      tax,
      martyrs,
      net,
    };
  }, [calcGrossSalary, calcInsurableSalary]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              قانون التأمينات 148 لسنة 2019 وقانون الضريبة على الدخل
            </span>
            <span className="text-slate-400 text-xs font-mono">الشرائح الضريبية المعدلة ونموذج (4) واستمارة (2)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            محرك كسب العمل والتأمينات الاجتماعية الشامل
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            احتساب دقيق لضريبة المرتبات، حصص التأمينات (11% و 18.75%)، مسير الرواتب الشهري ونماذج مصلحة الضرائب
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ScreenActionToolbar
            modelType="PAYROLL"
            title="مسير الرواتب والأجور والتأمينات"
            count={employees.length}
            showImport={false}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">إجمالي الأجور والمرتبات</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {formatEgyptianCurrency(totals.totalGross)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            عدد الموظفين: {employees.length} موظف
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-xs font-bold">ضريبة كسب العمل الشهرية</span>
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-900 mt-2">
            {formatEgyptianCurrency(totals.totalTaxes)}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 font-medium">
            مستحقة التوريد لمأمورية الضرائب
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold">اشتراكات التأمينات (11% + 18.75%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900 mt-2">
            {formatEgyptianCurrency(totals.totalEmployeeInsurance + totals.totalEmployerInsurance)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            حصة العامل: {formatEgyptianCurrency(totals.totalEmployeeInsurance)} • حصة المنشأة: {formatEgyptianCurrency(totals.totalEmployerInsurance)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-bold">صافي الأجور المستحقة للصرف</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-300 mt-2">
            {formatEgyptianCurrency(totals.totalNetSalary)}
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            صافي التحويل للحسابات البنكية للموظفين
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'ROSTER'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مسير الرواتب والأجور الشهري
          </button>
          <button
            onClick={() => setActiveTab('TAX_CALCULATOR')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'TAX_CALCULATOR'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            حاسبة الشرائح الضريبية التفاعلية
          </button>
          <button
            onClick={() => setActiveTab('FORM_4')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'FORM_4'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            نموذج (4) كسب عمل ربع السنوي
          </button>
          <button
            onClick={() => setActiveTab('FORM_2')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'FORM_2'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            استمارة (2) تأمينات اجتماعية
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">الشهر المالي:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
          >
            <option value="يناير 2026">يناير 2026</option>
            <option value="فبراير 2026">فبراير 2026</option>
            <option value="مارس 2026">مارس 2026</option>
            <option value="الربع الأول 2026">الربع الأول 2026</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Monthly Payroll Roster */}
      {activeTab === 'ROSTER' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              جدول مسير الأجور والمرتبات لشهر ({selectedMonth})
            </span>
            <span className="text-[11px] text-slate-500">
              وفقاً لقانون التأمينات 148 لسنة 2019 وقانون الضريبة على الدخل
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">اسم الموظف والوظيفة</th>
                  <th className="p-3">الرقم التأميني</th>
                  <th className="p-3 text-left font-mono">الأساسي + المتغير</th>
                  <th className="p-3 text-left font-mono">الأجر التأميني</th>
                  <th className="p-3 text-left font-mono text-red-700">تأمينات العامل (11%)</th>
                  <th className="p-3 text-left font-mono text-blue-800">ضريبة كسب العمل</th>
                  <th className="p-3 text-left font-mono text-emerald-800">تأمينات الشركة (18.75%)</th>
                  <th className="p-3 text-left font-mono text-emerald-950 font-black">الصافي المستحق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rosterCalculations.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.jobTitle} • {emp.code}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{emp.insuranceNo}</td>
                    <td className="p-3 text-left font-mono">{formatEgyptianCurrency(emp.grossEarnings)}</td>
                    <td className="p-3 text-left font-mono text-slate-700">{formatEgyptianCurrency(emp.insurableSalary)}</td>
                    <td className="p-3 text-left font-mono font-bold text-red-700">{formatEgyptianCurrency(emp.employeeInsurance)}</td>
                    <td className="p-3 text-left font-mono font-bold text-blue-800">{formatEgyptianCurrency(emp.monthlyTax)}</td>
                    <td className="p-3 text-left font-mono text-emerald-800">{formatEgyptianCurrency(emp.employerInsurance)}</td>
                    <td className="p-3 text-left font-mono font-black text-slate-900 bg-slate-50/80">{formatEgyptianCurrency(emp.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={2} className="p-3 text-right">الإجماليات الشهرية:</td>
                  <td className="p-3 text-left font-mono">{formatEgyptianCurrency(totals.totalGross)}</td>
                  <td className="p-3 text-left font-mono">-</td>
                  <td className="p-3 text-left font-mono text-red-700">{formatEgyptianCurrency(totals.totalEmployeeInsurance)}</td>
                  <td className="p-3 text-left font-mono text-blue-800">{formatEgyptianCurrency(totals.totalTaxes)}</td>
                  <td className="p-3 text-left font-mono text-emerald-800">{formatEgyptianCurrency(totals.totalEmployerInsurance)}</td>
                  <td className="p-3 text-left font-mono text-emerald-950 bg-emerald-50/50">{formatEgyptianCurrency(totals.totalNetSalary)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Tax Calculator */}
      {activeTab === 'TAX_CALCULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>محددات الراتب الفردي</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الراتب الشهري الإجمالي (ج.م)</label>
                <input
                  type="number"
                  value={calcGrossSalary}
                  onChange={(e) => setCalcGrossSalary(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">الأجر التأميني الشامل (ج.م)</label>
                <input
                  type="number"
                  value={calcInsurableSalary}
                  onChange={(e) => setCalcInsurableSalary(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-sm text-blue-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  الحد الأقصى للأجر التأميني لعام 2026 هو 12,600 ج.م
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>تأمينات العامل (11%):</span>
                <span className="font-mono font-bold text-red-700">{formatEgyptianCurrency(singleCalc.empIns)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>ضريبة كسب العمل الشهرية:</span>
                <span className="font-mono font-bold text-blue-900">{formatEgyptianCurrency(singleCalc.tax.monthlyTax)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>صندوق الشهداء (0.05%):</span>
                <span className="font-mono font-bold text-slate-700">{formatEgyptianCurrency(singleCalc.martyrs)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                <span>الصافي الشهري المقبوض:</span>
                <span className="font-mono text-emerald-700">{formatEgyptianCurrency(singleCalc.net)}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              توزيع وتدرج الشرائح الضريبية السنوية على وعاء الراتب (قانون الضريبة على الدخل)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5">الشريحة الضريبية</th>
                    <th className="p-2.5 text-left font-mono">المبلغ المطبق عليه (ج.م)</th>
                    <th className="p-2.5 text-center font-mono">النسبة</th>
                    <th className="p-2.5 text-left font-mono">الضريبة السنوية المستحقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {singleCalc.tax.bracketsBreakdown.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-900">{b.bracket}</td>
                      <td className="p-2.5 text-left font-mono">{formatEgyptianCurrency(b.amount)}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-blue-700">{b.rate}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-900">{formatEgyptianCurrency(b.tax)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/60 font-bold text-blue-950 border-t border-slate-200">
                    <td colSpan={3} className="p-2.5 text-right">إجمالي الضريبة السنوية (ثم تقسم على 12 شهراً):</td>
                    <td className="p-2.5 text-left font-mono">{formatEgyptianCurrency(singleCalc.tax.annualTax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Official Form 4 (كسب عمل ربع سنوي) */}
      {activeTab === 'FORM_4' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                نموذج (4) كسب عمل ربع السنوي (المعتمد لمصلحة الضرائب المصرية)
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                عن الربع الأول لعام 2026 • مأمورية ضرائب الشركات المساهمة
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة النموذج المعتمد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500">إجمالي الأجور المنصرفة خلال الربع:</span>
              <div className="font-mono font-bold text-base text-slate-900">
                {formatEgyptianCurrency(totals.totalGross * 3)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500">إجمالي الضريبة المستقطعة ربع السنوية:</span>
              <div className="font-mono font-bold text-base text-blue-900">
                {formatEgyptianCurrency(totals.totalTaxes * 3)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500">حالة السداد والتوريد للبنك المركزي:</span>
              <div className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>مسدد بالكامل وفق التواريخ القانونية</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Form 2 Social Insurance */}
      {activeTab === 'FORM_2' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                استمارة (2) تأمينات اجتماعية (سجل حركة وأجور العاملين)
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                الهيئة القومية للتأمين الاجتماعي • مكتب تأمينات السادس من أكتوبر
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الاستمارة الرسمية</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block">اسم المنشأة:</span>
                <span className="font-bold text-slate-900">{state.officeProfile.firmName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">الرقم التأميني للمنشأة:</span>
                <span className="font-mono font-bold text-slate-900">019284719</span>
              </div>
              <div>
                <span className="text-slate-500 block">عدد العمالة المؤمن عليها:</span>
                <span className="font-mono font-bold text-slate-900">{employees.length} عامل</span>
              </div>
              <div>
                <span className="text-slate-500 block">إجمالي الأجور التأمينية:</span>
                <span className="font-mono font-bold text-blue-900">
                  {formatEgyptianCurrency(employees.reduce((s, e) => s + e.insurableSalary, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
