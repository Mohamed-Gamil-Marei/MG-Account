import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  Calculator,
  Building2,
  Calendar,
  Sparkles,
  Info,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
} from 'lucide-react';
import { CustomsShipment, CurrencyCode } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';
import { PrintService } from '../../services/PrintService';

interface FxHedgingEas13TabProps {
  state: DatabaseState;
  showToast: (msg: string) => void;
}

export const FxHedgingEas13Tab: React.FC<FxHedgingEas13TabProps> = ({ state, showToast }) => {
  const shipments = state.customsShipments || [];

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    shipments.length > 0 ? shipments[0].id : ''
  );

  const selectedShipment = useMemo(() => {
    return shipments.find((s) => s.id === selectedShipmentId) || shipments[0] || null;
  }, [shipments, selectedShipmentId]);

  // FX Stages Form State
  const [foreignAmount, setForeignAmount] = useState<number>(selectedShipment?.cifValueForeign || 45000);
  const [currency, setCurrency] = useState<CurrencyCode>(selectedShipment?.invoiceCurrency || 'USD');
  const [lcRate, setLcRate] = useState<number>(48.50); // Rate on LC opening
  const [shippingRate, setShippingRate] = useState<number>(49.20); // Rate on BL date
  const [customsRate, setCustomsRate] = useState<number>(50.25); // Rate on customs release
  const [settlementRate, setSettlementRate] = useState<number>(50.60); // Rate on bank settlement/payment

  // Treatment Type according to EAS 13 & EAS 2
  const [fxTreatmentMethod, setFxTreatmentMethod] = useState<'PL_STATEMENT' | 'CAPITALIZED_TO_INVENTORY'>(
    'PL_STATEMENT'
  );

  // Calculations
  const calculatedFx = useMemo(() => {
    const lcTotalEgp = foreignAmount * lcRate;
    const shippingTotalEgp = foreignAmount * shippingRate;
    const customsTotalEgp = foreignAmount * customsRate;
    const settlementTotalEgp = foreignAmount * settlementRate;

    // Total FX Difference between LC opening and final settlement
    const totalDiffEgp = settlementTotalEgp - lcTotalEgp;
    const isLoss = totalDiffEgp > 0; // Paying more EGP for foreign currency = FX loss

    // Difference between customs assessment and actual settlement
    const customsVsSettlementDiff = settlementTotalEgp - customsTotalEgp;

    return {
      lcTotalEgp,
      shippingTotalEgp,
      customsTotalEgp,
      settlementTotalEgp,
      totalDiffEgp: Math.abs(totalDiffEgp),
      isLoss,
      customsVsSettlementDiff: Math.abs(customsVsSettlementDiff),
      isCustomsLoss: customsVsSettlementDiff > 0,
      rateVariancePct: Number((((settlementRate - lcRate) / lcRate) * 100).toFixed(2)),
    };
  }, [foreignAmount, lcRate, shippingRate, customsRate, settlementRate]);

  // Handle Generate FX Settlement Journal Entry
  const handleGenerateFxJournalEntry = () => {
    if (!selectedShipment) {
      showToast('يرجى تحديد الشحنة أولاً');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const diffAmount = calculatedFx.totalDiffEgp;

    const lines = [];

    if (calculatedFx.isLoss) {
      // خسائر فروق عملة مدينة (مدين) والمورد الأجنبي/البنك دائن
      lines.push({
        id: `line-${Date.now()}-1`,
        accountId: 'acc-fx-loss',
        accountCode: '5320',
        accountName: fxTreatmentMethod === 'CAPITALIZED_TO_INVENTORY' ? 'بضاعة بالطريق واعتمادات مستندية (رسملة فروق عملة)' : 'خسائر فروق تقييم وترجمة عملات أجنبية (EAS 13)',
        debit: diffAmount,
        credit: 0,
        currency,
        exchangeRate: settlementRate,
        foreignDebit: foreignAmount,
        foreignCredit: 0,
        description: `تسوية خسائر فروق عملة شحنة [${selectedShipment.shipmentCode}] طبقاً لمعيار المحاسبة المصري 13`,
      });

      lines.push({
        id: `line-${Date.now()}-2`,
        accountId: 'acc-suppliers-foreign',
        accountCode: '2112',
        accountName: 'موردون خارجيون - اعتمادات مستندية مستحقة',
        debit: 0,
        credit: diffAmount,
        currency,
        exchangeRate: settlementRate,
        foreignDebit: 0,
        foreignCredit: foreignAmount,
        description: `إقفال الفارق التمويلي للعملة الأجنبية - شحنة ${selectedShipment.shipmentCode}`,
      });
    } else {
      // أرباح فروق عملة دائنة
      lines.push({
        id: `line-${Date.now()}-1`,
        accountId: 'acc-suppliers-foreign',
        accountCode: '2112',
        accountName: 'موردون خارجيون - اعتمادات مستندية',
        debit: diffAmount,
        credit: 0,
        currency,
        exchangeRate: settlementRate,
        foreignDebit: foreignAmount,
        foreignCredit: 0,
        description: `تسوية فروق عملة لصالح المنشأة - شحنة ${selectedShipment.shipmentCode}`,
      });

      lines.push({
        id: `line-${Date.now()}-2`,
        accountId: 'acc-fx-gain',
        accountCode: '4320',
        accountName: 'أرباح فروق أسعار صرف عملات أجنبية (EAS 13)',
        debit: 0,
        credit: diffAmount,
        currency,
        exchangeRate: settlementRate,
        foreignDebit: 0,
        foreignCredit: foreignAmount,
        description: `إثبات أرباح فروق أسعار الصرف لشحنة [${selectedShipment.shipmentCode}]`,
      });
    }

    db.addJournalEntry({
      date: todayStr,
      description: `قيد تسوية فروق أسعار صرف العملات الأجنبية (EAS 13) - شحنة ${selectedShipment.shipmentCode} (${selectedShipment.title})`,
      clientId: selectedShipment.clientId,
      clientName: selectedShipment.clientName,
      currency: 'EGP',
      exchangeRate: 1,
      lines,
      totalDebit: diffAmount,
      totalCredit: diffAmount,
      isPosted: true,
      entryType: 'ADJUSTING',
      referenceNumber: `FX-EAS13-${selectedShipment.shipmentCode}`,
    });

    showToast(`تم إنشاء وترحيل قيد تسوية فروق العملة المعياري (EAS 13) بمبلغ ${diffAmount.toLocaleString()} ج.م بنجاح`);
  };

  const handlePrintFxMemo = () => {
    PrintService.printElementById('printable-fx-memo', {
      title: `مذكرة تسوية فروق أسعار الصرف EAS 13 - شحنة ${selectedShipment?.shipmentCode}`,
      customDelayMs: 300,
    });
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  محرك تسوية فروق أسعار الصرف والتحوط (EAS 13 FX Settlement Engine)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono">
                  معيار المحاسبة المصري 13
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                احتساب الفروق الناتجة عن تذبذب أسعار الصرف للعملات الأجنبية بين تاريخ فتح الاعتماد المستندي، تاريخ الشحن، وتاريخ الإفراج الجمركي والسداد البنكي النهائي،
                وتوليد مذكرة التسوية وقيد اليومية المحاسبي التلقائي وفقاً لأحكام معيار المحاسبة المصري رقم (13) وقانون الضرائب 91 لسنة 2005.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrintFxMemo}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-700 flex items-center gap-2 cursor-pointer shadow"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>طباعة مذكرة التسوية</span>
            </button>

            <button
              onClick={handleGenerateFxJournalEntry}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>توليد قيد التسوية فوراً</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shipment Selector & Input Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>بيانات الشحنة والعملة محل التسوية</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold">اختيار الشحنة الجمركية:</label>
              <select
                value={selectedShipmentId}
                onChange={(e) => {
                  setSelectedShipmentId(e.target.value);
                  const ship = shipments.find((s) => s.id === e.target.value);
                  if (ship) {
                    setForeignAmount(ship.cifValueForeign || 45000);
                    setCurrency(ship.invoiceCurrency || 'USD');
                    setCustomsRate(ship.customsExchangeRate || 50.25);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              >
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.shipmentCode}] {s.clientName} - {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold">العملة الأجنبية:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold font-mono"
                >
                  <option value="USD">USD - دولار أمريكي</option>
                  <option value="EUR">EUR - يورو أوروبي</option>
                  <option value="GBP">GBP - جنيه إسترليني</option>
                  <option value="CNY">CNY - يوان صيني</option>
                  <option value="SAR">SAR - ريال سعودي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold">القيمة بالعملة الأجنبية:</label>
                <input
                  type="number"
                  value={foreignAmount}
                  onChange={(e) => setForeignAmount(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <label className="text-slate-400 font-bold">المعالجة المحاسبية لفروق الصرف:</label>
              <select
                value={fxTreatmentMethod}
                onChange={(e) => setFxTreatmentMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-bold"
              >
                <option value="PL_STATEMENT">قائمة الدخل - أرباح وخسائر فروق عملة (EAS 13 الأساسي)</option>
                <option value="CAPITALIZED_TO_INVENTORY">رسملة على تكلفة المخزن (الملحق أ - الاستثنائي)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Stage Exchange Rates */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-md lg:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
              <span>مستويات أسعار الصرف عبر مراحل دورة الاستيراد (سعر الصرف مقابل الجنيه EGP)</span>
            </div>
            <span className="text-xs text-indigo-400 font-mono font-bold">
              تغير السعر: {calculatedFx.rateVariancePct > 0 ? `+${calculatedFx.rateVariancePct}%` : `${calculatedFx.rateVariancePct}%`}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-slate-400 font-bold flex items-center gap-1">
                <span>1. تاريخ فتح الاعتماد (LC)</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={lcRate}
                onChange={(e) => setLcRate(Number(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
              />
              <div className="text-[11px] text-slate-400">
                القيمة: <span className="font-mono text-white font-bold">{calculatedFx.lcTotalEgp.toLocaleString()}</span> ج.م
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-slate-400 font-bold flex items-center gap-1">
                <span>2. تاريخ الشحن (B/L)</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={shippingRate}
                onChange={(e) => setShippingRate(Number(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
              />
              <div className="text-[11px] text-slate-400">
                القيمة: <span className="font-mono text-white font-bold">{calculatedFx.shippingTotalEgp.toLocaleString()}</span> ج.م
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-slate-400 font-bold flex items-center gap-1">
                <span>3. الإفراج الجمركي (46 ك.م)</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={customsRate}
                onChange={(e) => setCustomsRate(Number(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
              />
              <div className="text-[11px] text-slate-400">
                القيمة: <span className="font-mono text-white font-bold">{calculatedFx.customsTotalEgp.toLocaleString()}</span> ج.م
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-slate-400 font-bold flex items-center gap-1">
                <span>4. السداد والتسوية البنكية</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={settlementRate}
                onChange={(e) => setSettlementRate(Number(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
              />
              <div className="text-[11px] text-slate-400">
                القيمة: <span className="font-mono text-white font-bold">{calculatedFx.settlementTotalEgp.toLocaleString()}</span> ج.م
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            calculatedFx.isLoss ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <div className="flex items-center gap-3">
              {calculatedFx.isLoss ? (
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className={`font-black text-sm ${calculatedFx.isLoss ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {calculatedFx.isLoss ? 'خسائر فروق أسعار صرف محققة (EAS 13 FX Loss)' : 'أرباح فروق أسعار صرف محققة (EAS 13 FX Gain)'}
                </div>
                <div className="text-xs text-slate-400">
                  الفارق الإجمالي بين تاريخ فتح الاعتماد وتاريخ السداد النهائي: {calculatedFx.totalDiffEgp.toLocaleString()} ج.م
                </div>
              </div>
            </div>

            <div className="text-left font-mono font-black text-xl">
              <span className={calculatedFx.isLoss ? 'text-rose-400' : 'text-emerald-400'}>
                {calculatedFx.isLoss ? '-' : '+'}{calculatedFx.totalDiffEgp.toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL MEMORANDUM CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="printable-fx-memo">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-center justify-between">
          <div className="text-right">
            <h2 className="text-lg font-black text-white">مكتب المحاسب القانوني ومراقب الحسابات</h2>
            <div className="text-xs text-cyan-400 font-bold">محمد جميل مرعي - زميل جمعية المحاسبين والمراجعين المصرية</div>
            <div className="text-[11px] text-slate-400">سجل عام المحاسبين والمراجعين (س.م.م): 18492</div>
          </div>
          <div className="text-left">
            <div className="text-sm font-black text-white">مذكرة تسوية فروق أسعار الصرف (EAS 13)</div>
            <div className="text-xs text-slate-400 font-mono">الرقم المرجعي: FX-MEMO-{selectedShipment?.shipmentCode}</div>
            <div className="text-xs text-slate-400">التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-200">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans">
            <div>
              <span className="text-slate-400 block">الشركة المستوردة:</span>
              <span className="font-bold text-white text-sm">{selectedShipment?.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">كود الشحنة والعملية:</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">{selectedShipment?.shipmentCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block">المورد الأجنبي:</span>
              <span className="font-bold text-slate-200">{selectedShipment?.foreignExporterName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">رقم بوليصة الشحن (B/L):</span>
              <span className="font-mono font-bold text-slate-200">{selectedShipment?.blNumber}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>السند المهني والتشريعي:</span>
            </h4>
            <p className="text-slate-300 text-justify">
              بناءً على الفحص المستندي لدورة الاستيراد والشحن للشحنة عالية البيان، وطبقاً لأحكام <strong>معيار المحاسبة المصري رقم (13)</strong> المعدل، 
              فقد تم حصر التغيرات السعرية في عملة الشراء ({currency}) من تاريخ فتح الاعتماد المستندي بسعر ({lcRate} ج.م) وصولاً لتاريخ السداد النهائي بسعر ({settlementRate} ج.م)،
              ونتج عن ذلك فارق قدره <strong>({calculatedFx.totalDiffEgp.toLocaleString()} ج.م)</strong> تم توجيهه وفقاً للأصول المحاسبية السليمة.
            </p>
          </div>

          {/* Table Breakdown */}
          <table className="w-full text-right border-collapse border border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-950 text-slate-300 font-bold">
              <tr>
                <th className="p-3 border border-slate-800">المرحلة الإجرائية</th>
                <th className="p-3 border border-slate-800">المبلغ بالعملة الأجنبية</th>
                <th className="p-3 border border-slate-800">سعر الصرف المطبق</th>
                <th className="p-3 border border-slate-800">المعادل بالجنيه المصري</th>
                <th className="p-3 border border-slate-800">الأثر المحاسبي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="p-3 border border-slate-800 font-semibold">1. فتح الاعتماد المستندي (LC Booking)</td>
                <td className="p-3 border border-slate-800 font-mono">{foreignAmount.toLocaleString()} {currency}</td>
                <td className="p-3 border border-slate-800 font-mono">{lcRate} ج.م</td>
                <td className="p-3 border border-slate-800 font-mono">{calculatedFx.lcTotalEgp.toLocaleString()} ج.م</td>
                <td className="p-3 border border-slate-800 text-slate-400">إثبات الالتزام المبدئي</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-800 font-semibold">2. الإفراج الجمركي (Customs Valuation)</td>
                <td className="p-3 border border-slate-800 font-mono">{foreignAmount.toLocaleString()} {currency}</td>
                <td className="p-3 border border-slate-800 font-mono">{customsRate} ج.م</td>
                <td className="p-3 border border-slate-800 font-mono">{calculatedFx.customsTotalEgp.toLocaleString()} ج.م</td>
                <td className="p-3 border border-slate-800 text-slate-400">وعاء احتساب الضرائب والرسوم</td>
              </tr>
              <tr className="bg-slate-950/80 font-bold">
                <td className="p-3 border border-slate-800 font-bold text-cyan-300">3. السداد والتسوية الفعلية</td>
                <td className="p-3 border border-slate-800 font-mono text-white">{foreignAmount.toLocaleString()} {currency}</td>
                <td className="p-3 border border-slate-800 font-mono text-cyan-300">{settlementRate} ج.م</td>
                <td className="p-3 border border-slate-800 font-mono text-white">{calculatedFx.settlementTotalEgp.toLocaleString()} ج.م</td>
                <td className="p-3 border border-slate-800 text-emerald-400 font-bold">تسوية الالتزام النهائي</td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs font-bold text-slate-300">
            <div>
              <div>رئيس الحسابات / المدير المالي</div>
              <div className="mt-8 text-slate-500 font-mono">...........................................</div>
            </div>
            <div>
              <div>المحاسب القانوني ومراقب الحسابات</div>
              <div className="text-cyan-400 mt-1">محمد جميل مرعي</div>
              <div className="mt-6 text-slate-500 font-mono">[ختم المراجعة والاعتماد القانوني]</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
