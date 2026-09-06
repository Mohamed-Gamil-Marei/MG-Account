import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Send,
  Ship,
  Package,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  TrendingDown,
  Info,
  RefreshCw,
  BellRing,
  ExternalLink,
} from 'lucide-react';
import { CustomsShipment } from '../../types';
import { DatabaseState } from '../../db/localDatabase';

interface DemurrageSentinelTabProps {
  state: DatabaseState;
  onOpenTreasuryModal?: (shipment: CustomsShipment) => void;
  showToast: (msg: string) => void;
}

export interface ContainerTrackingRecord {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  clientName: string;
  containerNumber: string;
  containerType: '20FT' | '40FT' | '40HQ' | 'REEFER';
  shippingLine: string;
  arrivalDate: string;
  dischargeDate: string;
  freeDaysAllowed: number; // e.g., 14 or 21 days
  dailyDemurrageRateUsd: number; // e.g., $50/day initially, then $100
  status: 'SAFE' | 'WARNING' | 'EXPIRED_PENALTY' | 'RETURNED_EMPTY';
  customsBrokerName: string;
  customsBrokerPhone: string;
  clientPhone: string;
}

export const DemurrageSentinelTab: React.FC<DemurrageSentinelTabProps> = ({
  state,
  showToast,
}) => {
  const shipments = state.customsShipments || [];

  // Generate demo/live container tracking items based on shipments
  const [containers, setContainers] = useState<ContainerTrackingRecord[]>([
    {
      id: 'cnt-101',
      shipmentId: 'ship-001',
      shipmentCode: 'IMP-2026-0041',
      clientName: 'شركة النيل للصناعات الهندسية ش.م.م',
      containerNumber: 'MSCU-9482910',
      containerType: '40HQ',
      shippingLine: 'MSC Mediterranean Shipping',
      arrivalDate: '2026-02-28',
      dischargeDate: '2026-03-01',
      freeDaysAllowed: 14,
      dailyDemurrageRateUsd: 80,
      status: 'WARNING',
      customsBrokerName: 'مكتب الحاج مصطفى الشناوي للتخليص',
      customsBrokerPhone: '01012345678',
      clientPhone: '01123456789',
    },
    {
      id: 'cnt-102',
      shipmentId: 'ship-002',
      shipmentCode: 'IMP-2026-0039',
      clientName: 'مؤسسة الأهرام للكيماويات والمستلزمات',
      containerNumber: 'CMAU-7821943',
      containerType: '20FT',
      shippingLine: 'CMA CGM Line',
      arrivalDate: '2026-02-18',
      dischargeDate: '2026-02-20',
      freeDaysAllowed: 14,
      dailyDemurrageRateUsd: 50,
      status: 'EXPIRED_PENALTY',
      customsBrokerName: 'مجموعة السلام لخدمات الشحن',
      customsBrokerPhone: '01298765432',
      clientPhone: '01055566677',
    },
    {
      id: 'cnt-103',
      shipmentId: 'ship-003',
      shipmentCode: 'IMP-2026-0044',
      clientName: 'الدولية للمعدات الكهربائية الحديثة',
      containerNumber: 'MAEU-3918204',
      containerType: '40FT',
      shippingLine: 'Maersk Line Egypt',
      arrivalDate: '2026-03-04',
      dischargeDate: '2026-03-05',
      freeDaysAllowed: 21,
      dailyDemurrageRateUsd: 90,
      status: 'SAFE',
      customsBrokerName: 'المركز المصري للتخليص الجمركي',
      customsBrokerPhone: '01511223344',
      clientPhone: '01233445566',
    },
  ]);

  const [selectedContainerForAlert, setSelectedContainerForAlert] = useState<ContainerTrackingRecord | null>(null);
  const [alertRecipient, setAlertRecipient] = useState<'CLIENT' | 'BROKER' | 'BOTH'>('BOTH');
  const [usdExchangeRate, setUsdExchangeRate] = useState<number>(50.25);

  // Calculate Days Remaining or Overdue
  const calculatedContainers = useMemo(() => {
    const today = new Date();
    return containers.map((c) => {
      const discharge = new Date(c.dischargeDate);
      const expiryDate = new Date(discharge);
      expiryDate.setDate(discharge.getDate() + c.freeDaysAllowed);

      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let calculatedStatus: ContainerTrackingRecord['status'] = c.status;
      let overdueDays = 0;
      let penaltyUsd = 0;

      if (diffDays < 0) {
        calculatedStatus = 'EXPIRED_PENALTY';
        overdueDays = Math.abs(diffDays);
        penaltyUsd = overdueDays * c.dailyDemurrageRateUsd;
      } else if (diffDays <= 4) {
        calculatedStatus = 'WARNING';
      } else {
        calculatedStatus = 'SAFE';
      }

      const penaltyEgp = penaltyUsd * usdExchangeRate;

      return {
        ...c,
        calculatedStatus,
        expiryDateStr: expiryDate.toISOString().split('T')[0],
        diffDays,
        overdueDays,
        penaltyUsd,
        penaltyEgp,
      };
    });
  }, [containers, usdExchangeRate]);

  // Key Aggregations
  const totalPenaltyUsd = calculatedContainers.reduce((sum, c) => sum + c.penaltyUsd, 0);
  const totalPenaltyEgp = calculatedContainers.reduce((sum, c) => sum + c.penaltyEgp, 0);
  const penaltyCount = calculatedContainers.filter((c) => c.calculatedStatus === 'EXPIRED_PENALTY').length;
  const warningCount = calculatedContainers.filter((c) => c.calculatedStatus === 'WARNING').length;
  const safeCount = calculatedContainers.filter((c) => c.calculatedStatus === 'SAFE').length;

  const handleSendWhatsAppAlert = (c: any) => {
    const isOverdue = c.diffDays < 0;
    const msg = encodeURIComponent(
      `🚨 *تنبيه حارس أرضيات الموانئ وحاويات الشحن (Demurrage Alert)*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 *العميل:* ${c.clientName}\n` +
      `🚢 *الشحنة:* ${c.shipmentCode} | *الخط الملاحي:* ${c.shippingLine}\n` +
      `📦 *رقم الحاوية:* ${c.containerNumber} (${c.containerType})\n` +
      `📅 *تاريخ التفريغ بالميناء:* ${c.dischargeDate}\n` +
      `⏳ *فترة السماح المجانية:* ${c.freeDaysAllowed} يوم (تنتهي في: ${c.expiryDateStr})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      (isOverdue
        ? `⚠️ *الحالة: تجاوز فترة السماح بـ (${c.overdueDays}) يوم!*\n` +
          `💵 *غرامة الأرضيات المتراكمة:* $${c.penaltyUsd.toLocaleString()} دولار (${c.penaltyEgp.toLocaleString()} ج.م)\n` +
          `📌 *المطلوب:* سرعة سداد الرسوم وإنهاء الكشف وسحب الحاوية لتفادي تفاقم الغرامات اليومية.`
        : `🔔 *الحالة: متبقي (${c.diffDays}) أيام فقط على بدء احتساب غرامات الأرضيات بالدولار!*\n` +
          `📌 *المطلوب:* حث المخلص على سرعة إنهاء إجراءات الفحص والإفراج الجمركي.`) +
      `\n━━━━━━━━━━━━━━━━━━━━\n` +
      `مكتب المحاسب القانوني ومراقب الحسابات / محمد جميل مرعي`
    );

    const targetPhone = alertRecipient === 'CLIENT' ? c.clientPhone : c.customsBrokerPhone;
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('0') ? `20${cleanPhone.substring(1)}` : cleanPhone;

    window.open(`https://wa.me/${internationalPhone}?text=${msg}`, '_blank');
    showToast(`تم فتح تطبيق WhatsApp لتوجيه إنذار الحاوية [${c.containerNumber}] فوراً`);
    setSelectedContainerForAlert(null);
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  رادار حراسة أرضيات الموانئ وغرامات الحاويات (Demurrage & Detention Sentinel)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
                  Smart Free-Time Watcher
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                مراقبة استباقية بالثواني لفترات السماح المجانية للحاويات (Free Time) الممنوحة من الخطوط الملاحية بالموانئ المصرية،
                واحتساب غرامات الأرضيات (Demurrage) المتراكمة بالدولار الأمريكي والجنيه، مع إرسال إنذارات WhatsApp فورية للمخلص والعميل قبل فرض الغرامات.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-left">
              <div className="text-[10px] text-slate-400">سعر صرف غرامات الموانئ</div>
              <div className="text-sm font-black text-amber-400 font-mono flex items-center gap-1">
                <span>$1 = </span>
                <input
                  type="number"
                  step="0.05"
                  value={usdExchangeRate}
                  onChange={(e) => setUsdExchangeRate(Number(e.target.value) || 50)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-center text-white"
                />
                <span>ج.م</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-bold">غرامات أرضيات متراكمة (مستحقة)</span>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            ${totalPenaltyUsd.toLocaleString()} <span className="text-xs text-slate-400">USD</span>
          </div>
          <div className="text-xs text-rose-300 font-bold mt-1">
            ≈ {totalPenaltyEgp.toLocaleString()} ج.م (تستنزف السيولة)
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold">حاويات في مرحلة الخطر (متبقي ≤ 4 أيام)</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{warningCount} حاوية</div>
          <div className="text-xs text-slate-400 mt-1">تتطلب تسريع الكشف والمعاينة</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold">حاويات داخل فترة السماح الآمنة</span>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{safeCount} حاوية</div>
          <div className="text-xs text-slate-400 mt-1">تتبع المسار الطبيعي للإفراج</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs font-bold">إجمالي الحاويات النشطة بالموانئ</span>
            <Package className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">{calculatedContainers.length} حاوية</div>
          <div className="text-xs text-slate-400 mt-1">عبر ميناء الإسكندرية، السخنة، ودمياط</div>
        </div>
      </div>

      {/* Containers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Ship className="w-5 h-5 text-cyan-400" />
              <span>جدول التتبع الزمني للحاويات وفترات السماح (Free-Time Log)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة يومية دقيقة لاحتساب رسوم وغرامات التأخير اليومية طبقاً للوائح الخط الملاحي
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                showToast('تمت إعادة مزامنة مؤشرات فترات السماح مع تواريخ الموانئ');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث المؤقتات</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">رقم الحاوية والنوع</th>
                <th className="p-3.5">الشحنة والعميل</th>
                <th className="p-3.5">الخط الملاحي</th>
                <th className="p-3.5">تاريخ التفريغ</th>
                <th className="p-3.5">فترة السماح</th>
                <th className="p-3.5">تاريخ انتهاء السماح</th>
                <th className="p-3.5">الوضع الزمني والغرامة</th>
                <th className="p-3.5 text-center">إجراء الإنذار السريع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {calculatedContainers.map((c) => {
                const isOverdue = c.calculatedStatus === 'EXPIRED_PENALTY';
                const isWarning = c.calculatedStatus === 'WARNING';

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isOverdue ? 'bg-rose-950/10' : isWarning ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="font-mono font-black text-white text-sm">{c.containerNumber}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">
                        {c.containerType}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{c.clientName}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{c.shipmentCode}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-300 font-semibold">{c.shippingLine}</div>
                      <div className="text-[10px] text-slate-400">${c.dailyDemurrageRateUsd} / يوم بعد السماح</div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-300">{c.dischargeDate}</td>

                    <td className="p-3.5 font-mono font-bold text-slate-200">
                      {c.freeDaysAllowed} يوم سماح
                    </td>

                    <td className="p-3.5 font-mono font-bold text-amber-300">{c.expiryDateStr}</td>

                    <td className="p-3.5">
                      {isOverdue ? (
                        <div className="space-y-1">
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-black inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>تجاوز ({c.overdueDays}) يوم</span>
                          </span>
                          <div className="text-xs font-mono font-bold text-rose-400">
                            ${c.penaltyUsd.toLocaleString()} ({c.penaltyEgp.toLocaleString()} ج.م)
                          </div>
                        </div>
                      ) : isWarning ? (
                        <div className="space-y-1">
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>متبقي {c.diffDays} أيام فقط</span>
                          </span>
                          <div className="text-[11px] text-amber-400">توشك الغرامة على البدء</div>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>آمن (متبقي {c.diffDays} يوم)</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedContainerForAlert(c)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 mx-auto transition cursor-pointer ${
                          isOverdue
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 animate-pulse'
                            : isWarning
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إنذار WhatsApp</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHATSAPP ALERT MODAL */}
      {selectedContainerForAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-right">
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 p-4 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <BellRing className="w-5 h-5" />
                <span>إرسال إنذار أرضيات وغرامات الحاوية عبر WhatsApp</span>
              </div>
              <button
                onClick={() => setSelectedContainerForAlert(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">الحاوية:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedContainerForAlert.containerNumber} ({selectedContainerForAlert.containerType})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">العميل:</span>
                  <span className="font-bold text-cyan-400">{selectedContainerForAlert.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المخلص الجمركي:</span>
                  <span className="font-bold text-slate-200">{selectedContainerForAlert.customsBrokerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الخط الملاحي:</span>
                  <span className="font-bold text-slate-200">{selectedContainerForAlert.shippingLine}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-bold block">إرسال الإنذار إلى:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAlertRecipient('BROKER')}
                    className={`p-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      alertRecipient === 'BROKER'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div>المخلص الجمركي</div>
                    <div className="text-[10px] font-mono mt-1">{selectedContainerForAlert.customsBrokerPhone}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertRecipient('CLIENT')}
                    className={`p-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      alertRecipient === 'CLIENT'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div>مدير استيراد العميل</div>
                    <div className="text-[10px] font-mono mt-1">{selectedContainerForAlert.clientPhone}</div>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  سيقوم النظام بفتح محادثة WhatsApp مباشرة مع الطرف المحدد وتضمين أرقام الحاوية، الشحنة، وقيمة غرامات التأخير اليومية والمتراكمة مع التوجيه المهني.
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedContainerForAlert(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                onClick={() => handleSendWhatsAppAlert(selectedContainerForAlert)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>إرسال عبر WhatsApp فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
