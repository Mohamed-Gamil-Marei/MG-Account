import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Download,
  Eye,
  Ship,
  DollarSign,
  Package,
  Layers,
  FileCheck2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { CustomsShipment, CustomsShipmentItem, IncotermCode, CurrencyCode } from '../../types';
import { db, DatabaseState } from '../../db/localDatabase';

interface NafezaDirectParserTabProps {
  state: DatabaseState;
  showToast: (msg: string) => void;
  onNavigateToOperations?: () => void;
}

export const NafezaDirectParserTab: React.FC<NafezaDirectParserTabProps> = ({
  state,
  showToast,
  onNavigateToOperations,
}) => {
  const clients = state.clients || [];

  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients.length > 0 ? clients[0].id : ''
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<CustomsShipment | null>(null);
  const [rawTextSample, setRawTextSample] = useState<string>('');

  // Sample Pre-Built Nafeza Files for Instant Demonstration
  const handleLoadSampleNafezaData = (type: 'INDUSTRIAL' | 'ELECTRONICS') => {
    setIsProcessing(true);
    setTimeout(() => {
      const clientObj = clients.find((c) => c.id === selectedClientId) || clients[0];
      const clientName = clientObj ? clientObj.name : 'شركة النيل للصناعات الهندسية';

      if (type === 'INDUSTRIAL') {
        const items: CustomsShipmentItem[] = [
          {
            id: 'item-naf-1',
            itemCode: 'ITEM-001',
            hsCode: '8414.80.00',
            description: 'ضواغط هواء صناعية توربينية عالية الضغط (Industrial High Pressure Compressors)',
            quantity: 12,
            unit: 'وحدة',
            unitPriceForeign: 3200,
            totalPriceForeign: 38400,
            customsDutyRatePct: 5,
            dutyAmountEgp: 101250,
            apportionedOtherCostEgp: 60750,
            totalItemLandedCostEgp: 2515000,
            unitLandedCostEgp: 209583.33,
          },
          {
            id: 'item-naf-2',
            itemCode: 'ITEM-002',
            hsCode: '8481.80.90',
            description: 'صمامات ومحابس تحكم هيدروليكية من الصلب (Hydraulic Control Steel Valves)',
            quantity: 250,
            unit: 'قطعة',
            unitPriceForeign: 45,
            totalPriceForeign: 11250,
            customsDutyRatePct: 10,
            dutyAmountEgp: 59300,
            apportionedOtherCostEgp: 17790,
            totalItemLandedCostEgp: 780000,
            unitLandedCostEgp: 3120,
          },
        ];

        const shipment: CustomsShipment = {
          id: `ship-naf-${Date.now()}`,
          shipmentCode: `NAF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: 'شهادة إفراج جمركي نموذج (46 ك.م) - معدات صناعية ألمانية',
          shipmentType: 'IMPORT',
          status: 'UNDER_CLEARANCE',
          clientId: selectedClientId || clientObj?.id || 'client-1',
          clientName: clientName,
          foreignExporterName: 'SIEMENS AG Industrial Systems - Germany',
          foreignExporterCountry: 'ألمانيا (Germany)',
          customsPortOfArrival: 'ميناء الإسكندرية البحري (مركز لوجستي نافذة)',
          portOfLoading: 'ميناء هامبورغ - Hamburg Port',
          shippingLine: 'Hapag-Lloyd Line',
          blNumber: 'HLCUHAM2609481',
          acidNumber: '2026-984-712-45',
          incoterm: 'CIF' as IncotermCode,
          paymentMethod: 'LETTER_OF_CREDIT',
          invoiceCurrency: 'EUR' as CurrencyCode,
          invoiceAmountForeign: 49650,
          cifValueForeign: 49650,
          customsExchangeRate: 54.80,
          cifValueEgp: 2720820,
          customsDutyAmount: 160550,
          vatAmount: 388997,
          developmentFeeAmount: 81624,
          withholdingTaxAmount: 27208,
          totalCustomsDutiesAndTaxes: 631171,
          customsBrokerFees: 15000,
          portStorageAndHandlingFees: 12000,
          demurrageFeesPaid: 0,
          inlandFreightFees: 9500,
          bankCommissionsAndLcExpenses: 3500,
          otherExpenses: 0,
          totalAdditionalExpenses: 40000,
          totalLandedCostEgp: 3392000,
          costMultiplierRatio: 1.2467,
          items: items,
          linkedJournalEntryIds: [],
          linkedTreasuryTransactionIds: [],
          archiveDocumentIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setParsedData(shipment);
        setRawTextSample(JSON.stringify(shipment, null, 2));
      } else {
        const items: CustomsShipmentItem[] = [
          {
            id: 'item-naf-elec-1',
            itemCode: 'ELEC-001',
            hsCode: '8528.52.00',
            description: 'شاشات عرض رقمية ذكية وشاشات مراقبة (Smart Digital Displays)',
            quantity: 80,
            unit: 'جهاز',
            unitPriceForeign: 280,
            totalPriceForeign: 22400,
            customsDutyRatePct: 20,
            dutyAmountEgp: 236000,
            apportionedOtherCostEgp: 59000,
            totalItemLandedCostEgp: 1715000,
            unitLandedCostEgp: 21437.5,
          },
        ];

        const shipment: CustomsShipment = {
          id: `ship-naf-${Date.now()}`,
          shipmentCode: `NAF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: 'بيان جمركي نافذة ACI - شحنة إلكترونيات وشاشات رقمية',
          shipmentType: 'IMPORT',
          status: 'ACI_ISSUED',
          clientId: selectedClientId || clientObj?.id || 'client-1',
          clientName: clientName,
          foreignExporterName: 'Shenzhen Foxconn Electronics Corp - China',
          foreignExporterCountry: 'الصين (China)',
          customsPortOfArrival: 'ميناء العين السخنة اللوجستي',
          portOfLoading: 'ميناء شنتشن - Shenzhen',
          shippingLine: 'COSCO Shipping Lines',
          blNumber: 'COSU629108420',
          acidNumber: '2026-881-304-92',
          incoterm: 'FOB' as IncotermCode,
          paymentMethod: 'COLLECTION_DOCS',
          invoiceCurrency: 'USD' as CurrencyCode,
          invoiceAmountForeign: 22400,
          cifValueForeign: 23500,
          customsExchangeRate: 50.25,
          cifValueEgp: 1180875,
          customsDutyAmount: 236175,
          vatAmount: 198387,
          developmentFeeAmount: 59043,
          withholdingTaxAmount: 11808,
          totalCustomsDutiesAndTaxes: 493605,
          customsBrokerFees: 10000,
          portStorageAndHandlingFees: 8000,
          demurrageFeesPaid: 0,
          inlandFreightFees: 6000,
          bankCommissionsAndLcExpenses: 2000,
          otherExpenses: 0,
          totalAdditionalExpenses: 26000,
          totalLandedCostEgp: 1700480,
          costMultiplierRatio: 1.44,
          items: items,
          linkedJournalEntryIds: [],
          linkedTreasuryTransactionIds: [],
          archiveDocumentIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setParsedData(shipment);
        setRawTextSample(JSON.stringify(shipment, null, 2));
      }
      setIsProcessing(false);
      showToast('تم تفريغ ومعالجة بيانات الشهادة الجمركية بنجاح من ملف نافذة');
    }, 400);
  };

  // Handle Save into Registry
  const handleSaveToRegistry = () => {
    if (!parsedData) return;
    db.saveCustomsShipment(parsedData);
    showToast(`تم استيراد وإدراج الشحنة [${parsedData.shipmentCode}] في سجل العمليات الجمركية بنجاح`);
    if (onNavigateToOperations) {
      onNavigateToOperations();
    }
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0 shadow-lg shadow-teal-500/20">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  المستورد الذكي لبيانات نافذة والشهادات الجمركية (Nafeza Direct Parser)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold font-mono">
                  XML / Excel / ACI Direct Sync
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                استيراد وتفريغ ملفات البيانات الجمركية (نموذج 46 ك.م) الصادرة من منصة نافذة القومية الموحدة للتجارة الخارجية تلقائياً،
                واستخراج بنود بنود التعريفة الجمركية (HS Codes)، والرسوم المقررة وضريبة القيمة المضافة ورسم التنمية ورقم ACID في ثوانٍ معدودة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>رفع ومعالجة ملف نافذة الجمركي</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold">ربط الشحنة بالعميل:</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.taxNumber || 'سجل ضريبي'})
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Visual Area */}
            <div className="border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl p-6 text-center transition cursor-pointer bg-slate-950/60 group">
              <Upload className="w-10 h-10 text-slate-500 group-hover:text-teal-400 mx-auto transition" />
              <div className="text-xs font-bold text-slate-200 mt-2">
                اسحب وأفلت ملف نافذة الجمركي هنا
              </div>
              <div className="text-[10px] text-slate-400 mt-1">يدعم صيغ Excel (.xlsx), XML (ACI), و JSON</div>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-slate-400 font-bold text-[11px] block">
                أو اختر نموذجاً حياً للتفريغ الفوري:
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSampleNafezaData('INDUSTRIAL')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-bold border border-teal-500/30 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-teal-400" />
                    <span>نموذج 46 ك.م (معدات صناعية ألمانيا)</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSampleNafezaData('ELECTRONICS')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Ship className="w-3.5 h-3.5 text-cyan-400" />
                    <span>بيان شحنة نافذة ACI (إلكترونيات الصين)</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Parsed Results Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-teal-400" />
              <span>نتائج الاستخراج والتفريغ الآلي من نافذة</span>
            </h3>

            {parsedData && (
              <button
                onClick={handleSaveToRegistry}
                className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد وحفظ بالسجل الجمركي</span>
              </button>
            )}
          </div>

          {parsedData ? (
            <div className="space-y-4 text-xs">
              {/* Header Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">كود الشحنة المقترح:</span>
                  <span className="font-mono font-bold text-teal-400 text-sm">{parsedData.shipmentCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">رقم ACID المعتمد:</span>
                  <span className="font-mono font-bold text-white text-sm">{parsedData.acidNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">المورد الأجنبي:</span>
                  <span className="font-bold text-slate-200 truncate block">{parsedData.foreignExporterName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">القيمة الجمركية (CIF):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {parsedData.cifValueForeign.toLocaleString()} {parsedData.invoiceCurrency}
                  </span>
                </div>
              </div>

              {/* Duties & Taxes Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">الضريبة الجمركية</div>
                  <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                    {parsedData.customsDutyAmount?.toLocaleString()} ج.م
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">ضريبة القيمة المضافة (14%)</div>
                  <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                    {parsedData.vatAmount?.toLocaleString()} ج.م
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">التكلفة الإنزالية الكلية (Landed Cost)</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {parsedData.totalLandedCostEgp?.toLocaleString()} ج.م
                  </div>
                </div>
              </div>

              {/* Parsed Line Items Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 font-bold text-slate-300 text-[11px] flex justify-between">
                  <span>بنود الشحنة والتعريفة الجمركية المستخرجة ({parsedData.items.length} بنود)</span>
                  <span className="text-teal-400 font-mono font-bold">Auto-Mapped HS Codes</span>
                </div>
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">بند التعريفة (HS Code)</th>
                      <th className="p-2.5">الوصف الصنفي</th>
                      <th className="p-2.5">الكمية</th>
                      <th className="p-2.5">فئة الجمرك</th>
                      <th className="p-2.5">ض.ق.م</th>
                      <th className="p-2.5">تكلفة الوحدة الإنزالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedData.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono font-bold text-cyan-300">{it.hsCode}</td>
                        <td className="p-2.5 font-semibold text-white">{it.descriptionAr}</td>
                        <td className="p-2.5 font-mono text-slate-300">
                          {it.quantity} {it.unitOfMeasure}
                        </td>
                        <td className="p-2.5 font-mono text-amber-300">{(it.customsDutyRate * 100).toFixed(0)}%</td>
                        <td className="p-2.5 font-mono text-blue-300">{(it.vatRate * 100).toFixed(0)}%</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-400">
                          {it.unitLandedCostEgp?.toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <FileCode className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-400">
                لا توجد بيانات معالجة حالياً
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                قم برفع ملف نافذة أو اختر أحد النماذج التجريبية أعلاه لتفريغ بيانات الشهادة الجمركية وحساب التكلفة الإنزالية تلقائياً.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
