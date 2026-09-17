import React, { useState } from 'react';
import { Award, CheckCircle, Percent, FileSpreadsheet, ShieldCheck, Printer, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { numberToArabicWords } from '../../utils/numberToWordsArabic';
import { SupplementaryNoteItem, DEFAULT_SUPPLEMENTARY_NOTES } from './CreditNotesTab';
import { DisclosureDetailModal } from './DisclosureDetailModal';
import { UnifiedSelectDropdown } from '../common/UnifiedSelectDropdown';

interface CreditProfitDistributionTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  officeProfile: any;
  supplementaryNotes?: SupplementaryNoteItem[];
  onUpdateNotesList?: (notes: SupplementaryNoteItem[]) => void;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  isolatedYear?: number;
}

export const CreditProfitDistributionTab: React.FC<CreditProfitDistributionTabProps> = ({
  yearsList,
  computedData,
  officeProfile,
  supplementaryNotes = DEFAULT_SUPPLEMENTARY_NOTES,
  onUpdateNotesList,
  periodStartDate,
  periodEndDate,
  periodLabel,
  isolatedYear,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(
    isolatedYear || yearsList[yearsList.length - 1] || 2026
  );
  const [legalReserveRatio, setLegalReserveRatio] = useState<number>(5); // 5% Legal Reserve
  const [statutoryReserveRatio, setStatutoryReserveRatio] = useState<number>(5); // 5% Statutory Reserve
  const [employeesShareRatio, setEmployeesShareRatio] = useState<number>(10); // 10% Employees Share
  const [boardBonusRatio, setBoardBonusRatio] = useState<number>(5); // 5% Board Remuneration
  const [dividendsRatio, setDividendsRatio] = useState<number>(60); // 60% Cash Dividends
  const [retainedRatio, setRetainedRatio] = useState<number>(15); // 15% Carried Forward

  // Modal State for Disclosure Detail
  const [selectedNoteModal, setSelectedNoteModal] = useState<SupplementaryNoteItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeData = computedData[selectedYear] || {};
  const netProfit = activeData.netProfit || 1046250;

  // Find Note 15 or legal reserve notes
  const profitDistNote = supplementaryNotes.find((n) => Number(n.noteNumber) === 15) || supplementaryNotes[supplementaryNotes.length - 1];

  const handleOpenNoteModal = (noteNum: number) => {
    const target = supplementaryNotes.find((n) => Number(n.noteNumber) === noteNum) || profitDistNote;
    if (target) {
      setSelectedNoteModal(target);
      setIsModalOpen(true);
    }
  };

  const handleSaveNoteFromModal = (updatedNote: SupplementaryNoteItem) => {
    if (onUpdateNotesList) {
      const updatedList = supplementaryNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      onUpdateNotesList(updatedList);
    }
  };

  // Compute breakdown
  const legalReserve = Math.round(netProfit * (legalReserveRatio / 100));
  const statutoryReserve = Math.round(netProfit * (statutoryReserveRatio / 100));
  const distributableProfit1 = netProfit - legalReserve - statutoryReserve;

  const employeesShare = Math.round(distributableProfit1 * (employeesShareRatio / 100));
  const boardBonus = Math.round(distributableProfit1 * (boardBonusRatio / 100));
  const shareholdersDividends = Math.round(distributableProfit1 * (dividendsRatio / 100));
  const retainedEarnings = Math.max(0, distributableProfit1 - employeesShare - boardBonus - shareholdersDividends);

  return (
    <div className="space-y-6">
      {/* Top Header & Year Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-700" />
            <h3 className="font-black text-slate-900 text-sm">
              مذكرة ومشروع توزيع الأرباح المقترح (وفقاً لقانون الشركات رقم 159 لسنة 1981)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            حساب الاحتياطيات القانونية وحصة العاملين (10%) وتوزيعات المساهمين والأرباح المرحلة للسنة المالية {selectedYear}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <UnifiedSelectDropdown<number>
            id="profit-dist-year-dropdown"
            label="سنة المشروع"
            value={selectedYear}
            options={yearsList.map((y) => ({
              id: y,
              label: `مشروع أرباح ${y}`,
              sublabel: `توزيعات قانون 159 لسنة ${y}`,
            }))}
            onChange={(y) => setSelectedYear(y)}
          />
        </div>
      </div>

      {/* Ratios Editor Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-bold text-xs text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-1.5">
          <Percent className="w-4 h-4 text-purple-600" />
          تحديد نسب التوزيع القانونية واللائحية:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="flex justify-between items-center font-bold text-slate-700 mb-1">
              <span>الاحتياطي القانوني (إلزامي 5%):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={legalReserveRatio}
                  onChange={(e) => setLegalReserveRatio(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 text-center font-mono text-purple-900 border border-slate-200 rounded text-xs bg-slate-50 focus:bg-white outline-none"
                />
                <span>%</span>
              </div>
            </div>
            <input
              type="range"
              step="any"
              min="0"
              max="20"
              value={legalReserveRatio}
              onChange={(e) => setLegalReserveRatio(parseFloat(e.target.value) || 0)}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center font-bold text-slate-700 mb-1">
              <span>الاحتياطي النظامي / الرأسمالي:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={statutoryReserveRatio}
                  onChange={(e) => setStatutoryReserveRatio(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 text-center font-mono text-purple-900 border border-slate-200 rounded text-xs bg-slate-50 focus:bg-white outline-none"
                />
                <span>%</span>
              </div>
            </div>
            <input
              type="range"
              step="any"
              min="0"
              max="25"
              value={statutoryReserveRatio}
              onChange={(e) => setStatutoryReserveRatio(parseFloat(e.target.value) || 0)}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center font-bold text-slate-700 mb-1">
              <span>حصة العاملين في الأرباح (10%):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={employeesShareRatio}
                  onChange={(e) => setEmployeesShareRatio(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 text-center font-mono text-emerald-800 border border-slate-200 rounded text-xs bg-slate-50 focus:bg-white outline-none"
                />
                <span>%</span>
              </div>
            </div>
            <input
              type="range"
              step="any"
              min="0"
              max="25"
              value={employeesShareRatio}
              onChange={(e) => setEmployeesShareRatio(parseFloat(e.target.value) || 0)}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center font-bold text-slate-700 mb-1">
              <span>توزيعات المساهمين والشركاء (%):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={dividendsRatio}
                  onChange={(e) => setDividendsRatio(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 text-center font-mono text-blue-900 border border-slate-200 rounded text-xs bg-slate-50 focus:bg-white outline-none"
                />
                <span>%</span>
              </div>
            </div>
            <input
              type="range"
              step="any"
              min="0"
              max="100"
              value={dividendsRatio}
              onChange={(e) => setDividendsRatio(parseFloat(e.target.value) || 0)}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Distribution Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-sm">
                جدول بيان مشروع توزيع الأرباح {periodEndDate ? `عن الفترة المنتهية في ${periodEndDate}` : `لسنة ${selectedYear}`}
              </h3>
              <p className="text-[11px] text-slate-300">
                {periodStartDate && periodEndDate
                  ? `عن الفترة من ${periodStartDate} إلى ${periodEndDate} — مقدم للعرض على الجمعية العامة العادية`
                  : 'مقدم للعرض على الجمعية العامة العادية للمساهمين'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-300">
            صافي الربح القابل للتوزيع: {formatEgyptianCurrency(netProfit)}
          </span>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">بيان بنود مشروع التوزيع</th>
                  <th className="p-3 text-center">النسبة %</th>
                  <th className="p-3 text-left font-mono">المبلغ المعتمد (ج.م)</th>
                  <th className="p-3">السند القانوني والمحاسبي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="bg-purple-50/60 font-black text-purple-950">
                  <td className="p-3">صافي أرباح العام المالي بعد ضريبة الدخل</td>
                  <td className="p-3 text-center font-mono">100%</td>
                  <td className="p-3 text-left font-mono text-sm">{formatEgyptianCurrency(netProfit)}</td>
                  <td className="p-3 text-slate-500">قائمة الدخل الشامل المعتمدة</td>
                </tr>

                <tr>
                  <td className="p-3 pr-6">يخصم: الاحتياطي القانوني</td>
                  <td className="p-3 text-center font-mono">{legalReserveRatio}%</td>
                  <td className="p-3 text-left font-mono font-bold text-red-700">({formatEgyptianCurrency(legalReserve)})</td>
                  <td className="p-3 text-slate-600">المادة 40 من القانون رقم 159 لسنة 1981</td>
                </tr>

                <tr>
                  <td className="p-3 pr-6">يخصم: الاحتياطي النظامي والرأسمالي</td>
                  <td className="p-3 text-center font-mono">{statutoryReserveRatio}%</td>
                  <td className="p-3 text-left font-mono font-bold text-red-700">({formatEgyptianCurrency(statutoryReserve)})</td>
                  <td className="p-3 text-slate-600">النظام الأساسي وعقد تأسيس الشركة</td>
                </tr>

                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="p-3">صافي الأرباح القابلة للتوزيع للمرحلة الأولى</td>
                  <td className="p-3 text-center font-mono">-</td>
                  <td className="p-3 text-left font-mono">{formatEgyptianCurrency(distributableProfit1)}</td>
                  <td className="p-3 text-slate-500">وعاء التوزيع على المساهمين والعاملين</td>
                </tr>

                <tr>
                  <td className="p-3 pr-6 text-emerald-900 font-bold">يخصم: حصة العاملين في الأرباح (نقدياً)</td>
                  <td className="p-3 text-center font-mono">{employeesShareRatio}%</td>
                  <td className="p-3 text-left font-mono font-bold text-emerald-800">{formatEgyptianCurrency(employeesShare)}</td>
                  <td className="p-3 text-slate-600">المادة 41 من القانون 159/1981 (10% بما لا يجاوز أجور سنة)</td>
                </tr>

                <tr>
                  <td className="p-3 pr-6 text-blue-900 font-bold">يخصم: توزيعات الأرباح النقدية للمساهمين والشركاء</td>
                  <td className="p-3 text-center font-mono">{dividendsRatio}%</td>
                  <td className="p-3 text-left font-mono font-bold text-blue-900">{formatEgyptianCurrency(shareholdersDividends)}</td>
                  <td className="p-3 text-slate-600">حصة أصحاب رأس المال والأسهم</td>
                </tr>

                <tr>
                  <td className="p-3 pr-6 text-amber-900">يخصم: مكافأة أعضاء مجلس الإدارة</td>
                  <td className="p-3 text-center font-mono">{boardBonusRatio}%</td>
                  <td className="p-3 text-left font-mono font-bold text-amber-900">{formatEgyptianCurrency(boardBonus)}</td>
                  <td className="p-3 text-slate-600">وفقاً لقرارات الجمعية العامة العادية</td>
                </tr>

                <tr className="bg-emerald-50 font-black text-emerald-950 text-sm">
                  <td className="p-3">الأرباح المحتجزة والمرحلة للعام المالي القادم</td>
                  <td className="p-3 text-center font-mono">{retainedRatio}%</td>
                  <td className="p-3 text-left font-mono">{formatEgyptianCurrency(retainedEarnings)}</td>
                  <td className="p-3 text-slate-600">تدعيم الملاءة المالية والمركز الائتماني للشركة</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <strong>ملاحظة الاعتماد المهني والإيضاح المتمم:</strong> يقر مراقب الحسابات بأن مشروع توزيع الأرباح أعلاه قد تم إعداده وفقاً لأحكام القانون رقم 159 لسنة 1981 ولائحته التنفيذية، وتعديلات القانون رقم 4 لسنة 2018، والنظام الأساسي للشركة.
            </div>

            <button
              type="button"
              onClick={() => handleOpenNoteModal(15)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>عرض / تعديل إيضاح متمم (15)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Disclosure Detail Modal */}
      {selectedNoteModal && (
        <DisclosureDetailModal
          note={selectedNoteModal}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaveNote={handleSaveNoteFromModal}
          yearsList={yearsList}
        />
      )}
    </div>
  );
};
