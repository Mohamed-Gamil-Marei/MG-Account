import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  FileText,
  DollarSign,
  ShieldCheck,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Users,
  MessageSquare,
  Clock,
  Printer,
  ChevronRight,
  FolderOpen,
  Award,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { AuditEngagementContract } from '../../types';
import { PrintLayoutWrapper } from '../common/PrintLayoutWrapper';
import { FeeEstimatorView } from './FeeEstimatorView';

interface PracticeManagementHubViewProps {
  state: DatabaseState;
}

export const PracticeManagementHubView: React.FC<PracticeManagementHubViewProps> = ({ state }) => {
  const [activeSubView, setActiveSubView] = useState<'CONTRACTS' | 'FEE_ESTIMATOR' | 'TAX_WAR_ROOM'>('CONTRACTS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState<boolean>(false);
  const [isPrintDossierOpen, setIsPrintDossierOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sample Engagement Contracts
  const [contracts, setContracts] = useState<AuditEngagementContract[]>([
    {
      id: 'cnt-01',
      contractCode: 'ENG-2026-001',
      clientId: state.clients[0]?.id || 'cl-01',
      clientName: state.clients[0]?.name || 'شركة الأهرام للتجارة والتوزيع',
      engagementType: 'ANNUAL_AUDIT',
      fiscalYear: 2026,
      contractDate: '2026-01-01',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      totalAgreedFee: 65000,
      paidAmount: 35000,
      remainingAmount: 30000,
      assignedAuditor: 'أ. محمد جميل مرعي',
      status: 'ACTIVE',
      billingSchedule: [
        { milestoneName: 'دفعة التعاقد وبدء التخطيط', dueDate: '2026-01-15', amount: 20000, isBilled: true, isPaid: true },
        { milestoneName: 'دفعة المراجعة النصف سنوية والفحص', dueDate: '2026-07-15', amount: 15000, isBilled: true, isPaid: true },
        { milestoneName: 'دفعة اعتماد القوائم المالية وتقرير المراجع', dueDate: '2026-12-31', amount: 30000, isBilled: false, isPaid: false },
      ],
    },
    {
      id: 'cnt-02',
      contractCode: 'ENG-2026-002',
      clientId: state.clients[1]?.id || 'cl-02',
      clientName: state.clients[1]?.name || 'الشركة الهندسية للصناعات الحديثة',
      engagementType: 'TAX_INSPECTION_DEFENSE',
      fiscalYear: 2026,
      contractDate: '2026-01-10',
      startDate: '2026-01-10',
      endDate: '2026-06-30',
      totalAgreedFee: 45000,
      paidAmount: 25000,
      remainingAmount: 20000,
      assignedAuditor: 'أ. محمد جميل مرعي',
      status: 'ACTIVE',
      billingSchedule: [
        { milestoneName: 'مقدم إعداد ملف الدفاع واللجنة الداخلية', dueDate: '2026-01-20', amount: 25000, isBilled: true, isPaid: true },
        { milestoneName: 'مؤخر صدور النموذج والاتفاق النهائي', dueDate: '2026-05-15', amount: 20000, isBilled: false, isPaid: false },
      ],
    },
    {
      id: 'cnt-03',
      contractCode: 'ENG-2026-003',
      clientId: state.clients[2]?.id || 'cl-03',
      clientName: state.clients[2]?.name || 'مؤسسة الدلتا للخدمات اللوجستية',
      engagementType: 'ETA_COMPLIANCE',
      fiscalYear: 2026,
      contractDate: '2026-01-15',
      startDate: '2026-01-15',
      endDate: '2026-12-31',
      totalAgreedFee: 30000,
      paidAmount: 30000,
      remainingAmount: 0,
      assignedAuditor: 'أ. محمد جميل مرعي',
      status: 'ACTIVE',
      billingSchedule: [
        { milestoneName: 'اشتراك سنوي كامل منظومة الفاتورة والإيصال', dueDate: '2026-01-15', amount: 30000, isBilled: true, isPaid: true },
      ],
    },
  ]);

  const totalContractsValue = contracts.reduce((s, c) => s + c.totalAgreedFee, 0);
  const totalCollectedFees = contracts.reduce((s, c) => s + c.paidAmount, 0);
  const totalOutstandingFees = contracts.reduce((s, c) => s + c.remainingAmount, 0);

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (contract: AuditEngagementContract, milestoneName: string, amount: number) => {
    const clientPhone = state.clients.find((cl) => cl.id === contract.clientId)?.phone || '01003335360';
    const message = encodeURIComponent(
      `مرحباً بكم من مكتب المحاسب القانوني / محمد جميل مرعي 📜\nنحيط سيادتكم علماً باستحقاق الدفعة المالية (${milestoneName}) بمبلغ ${amount.toLocaleString(
        'ar-EG'
      )} ج.م، الخاصة بعقد الأتعاب المهنية رقم ${contract.contractCode}.\nشاكرين حسن تعاونكم الدائم.`
    );
    const url = `https://wa.me/2${clientPhone.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(url, '_blank');

    setToastMessage(`تم فتح واتساب لإرسال إشعار المطالبة للعميل ${contract.clientName}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 border border-emerald-800/40 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>إدارة ممارسة المهنة وعقود المراجعة | Practice & Inspection Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            إدارة عقود الأتعاب وغرفة الفحص الضريبي
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            إدارة عقود المراجعة والخدمات الضريبية والاستشارية، جدولة المطالبات المالية وإرسال إشعارات واتساب، وتجهيز ملفات الفحص الضريبي للمأموريات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubView('FEE_ESTIMATOR')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-700/30 transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>مقدّر الأتعاب وعروض الأسعار الذكية</span>
          </button>
          <button
            onClick={() => setIsPrintDossierOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة ملف الفحص الضريبي الميداني</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Aggregates Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">إجمالي قيمة العقود النشطة</span>
          <div className="text-xl font-black text-white font-mono">
            {totalContractsValue.toLocaleString('ar-EG')} <span className="text-xs text-slate-400 font-sans">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">عقود سنوية وفحص واستشارات</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">إجمالي الأتعاب المحصلة</span>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {totalCollectedFees.toLocaleString('ar-EG')} <span className="text-xs text-slate-400 font-sans">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">محصلة بحسابات الخزينة والبنوك</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">مستحقات أتعاب متبقية للتحصيل</span>
          <div className="text-xl font-black text-amber-400 font-mono">
            {totalOutstandingFees.toLocaleString('ar-EG')} <span className="text-xs text-slate-400 font-sans">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">جاهزة للمطالبة عبر واتساب</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-bold block mb-1">العقود النشطة الحالية</span>
          <div className="text-xl font-black text-blue-400 font-mono">{contracts.length}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">تغطية مراجعة معتمدة 100%</span>
        </div>
      </div>

      {/* Sub Views Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubView('CONTRACTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubView === 'CONTRACTS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>عقود المراجعة والارتباط المهني</span>
        </button>

        <button
          onClick={() => setActiveSubView('FEE_ESTIMATOR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubView === 'FEE_ESTIMATOR'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>مقدّر الأتعاب وعروض الأسعار (Fee Estimator)</span>
        </button>

        <button
          onClick={() => setActiveSubView('TAX_WAR_ROOM')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubView === 'TAX_WAR_ROOM'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>غرفة عمليات الفحص الضريبي الميداني (Tax War Room)</span>
        </button>
      </div>

      {/* Subview: Fee Estimator */}
      {activeSubView === 'FEE_ESTIMATOR' && (
        <FeeEstimatorView
          state={state}
          onConvertToContract={(newContract) => {
            setContracts([newContract, ...contracts]);
            setActiveSubView('CONTRACTS');
            setToastMessage(`تم إضافة عقد الارتباط الجديد (${newContract.contractCode}) بنجاح!`);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Subview 1: Contracts & Billing Table */}
      {activeSubView === 'CONTRACTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>سجل عقود الارتباط والأتعاب المهنية</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">{contracts.length} عقود معتمدة</span>
          </div>

          <div className="divide-y divide-slate-800">
            {contracts.map((cnt) => (
              <div key={cnt.id} className="p-5 hover:bg-slate-800/30 transition-colors space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                        {cnt.contractCode}
                      </span>
                      <h4 className="font-bold text-sm text-white">{cnt.clientName}</h4>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      نوع الارتباط: {cnt.engagementType === 'ANNUAL_AUDIT' ? 'مراجعة واعتماد قوائم سنوية' : cnt.engagementType === 'TAX_INSPECTION_DEFENSE' ? 'دفاع وتمثيل في فحص ضريبي' : 'منظومة الفاتورة الإلكترونية'} • المسؤول: {cnt.assignedAuditor}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">إجمالي العقد</span>
                      <span className="font-bold text-white text-sm">{cnt.totalAgreedFee.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">المحصل</span>
                      <span className="font-bold text-emerald-400">{cnt.paidAmount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">المتبقي</span>
                      <span className="font-bold text-amber-400">{cnt.remainingAmount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Milestones Schedule */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">جدول الدفعات والمطالبات:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {cnt.billingSchedule.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          m.isPaid
                            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[11px]">{m.milestoneName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {m.dueDate} • {m.amount.toLocaleString('ar-EG')} ج.م
                          </div>
                        </div>

                        <div>
                          {m.isPaid ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تم السداد
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendWhatsAppReminder(cnt, m.milestoneName, m.amount)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                              title="إرسال إشعار فوري عبر واتساب"
                            >
                              <Send className="w-3 h-3" />
                              <span>مطالبة واتساب</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subview 2: Tax Inspection War Room */}
      {activeSubView === 'TAX_WAR_ROOM' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ملف الجاهزية للفحص الضريبي الميداني (Tax Inspection War Room)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              حزمة المستندات والنماذج الضريبية المجمعة الجاهزة للعرض على لجان الفحص والطعن الداخلي بمصلحة الضرائب المصرية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>قائمة المستندات المكتملة والمجهزة (Checklist)</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center justify-between p-2 bg-slate-900 rounded-lg">
                  <span>دفاتر اليومية والأستاذ العام المطبوعة والمختومة</span>
                  <span className="text-emerald-400 font-bold">جاهز ✓</span>
                </li>
                <li className="flex items-center justify-between p-2 bg-slate-900 rounded-lg">
                  <span>كشوف مطابقة الفواتير والإيصالات الإلكترونية مع البوابة</span>
                  <span className="text-emerald-400 font-bold">جاهز ✓</span>
                </li>
                <li className="flex items-center justify-between p-2 bg-slate-900 rounded-lg">
                  <span>نماذج الخصم والإضافة (نموذج 41 وسدادات الخصم)</span>
                  <span className="text-emerald-400 font-bold">جاهز ✓</span>
                </li>
                <li className="flex items-center justify-between p-2 bg-slate-900 rounded-lg">
                  <span>تسويات كسب العمل السنوية ونماذج سداد المرتبات</span>
                  <span className="text-emerald-400 font-bold">جاهز ✓</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span>النماذج والإخطارات الضريبية المسجلة</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-900 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">نموذج (19) ضرائب عامة ودخل</div>
                    <div className="text-[10px] text-slate-400">إخطار بعناصر ربط الضريبة المبدئية</div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold">مجهز للرد والطعن</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">نموذج (15) ضريبة القيمة المضافة</div>
                    <div className="text-[10px] text-slate-400">تعديل ومطابقة مبيعات الإقرارات الشهرية</div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">مطابق تماماً</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Print Dossier Modal */}
      {isPrintDossierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative text-slate-900 text-right my-8">
            <button
              onClick={() => setIsPrintDossierOpen(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>

            <PrintLayoutWrapper
              documentTitle="ملف الدفاع والفحص الضريبي الميداني المعتمد"
              documentRefNumber={`TAX-DEF-${new Date().getFullYear()}-044`}
              documentDate={new Date().toLocaleDateString('ar-EG')}
              companyName={state.officeProfile?.firmName || 'الشركة المصرية للتجارة والصناعة'}
              showSignatureStamp={true}
              notes="تم إعداد الملف للمرافعة والتمثيل أمام مأمورية الضرائب واللجان الداخلية وفقاً لقانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020."
            >
              <div className="space-y-6 text-right py-4 text-xs">
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block">المحاسب القانوني المسؤول:</span>
                    <span className="font-bold text-slate-900 text-sm">أ. محمد جميل مرعي (سجل 43122)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">السنوات المالية محل الفحص:</span>
                    <span className="font-bold text-slate-900 text-sm">2023 - 2024 - 2025</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b border-slate-300 pb-1">
                    أولاً: مذكرة الدفاع والرد على بنود الفحص
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-right">
                    بصفتنا المحاسب القانوني والمفوض عن المنشأة، نتشرف بأن نوضح أن كافة الإيرادات مسجلة ومعتمدة بالفواتير الإلكترونية المعتمدة من منظومة مصلحة الضرائب المصرية، وأن المصروفات والتكاليف مؤيدة بمستندات صحيحة ومخصوم عنها ضرائب كسب العمل والدمغة النسبية وضريبة الخصم والتحصيل بموجب النماذج الرسمية، ونطلب اعتماد الدفاتر والحسابات المنتظمة استناداً لأحكام القانون 91 لسنة 2005.
                  </p>
                </div>
              </div>
            </PrintLayoutWrapper>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة ملف الفحص الضريبي المعتمد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
