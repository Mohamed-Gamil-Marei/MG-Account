import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Save,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Table as TableIcon,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SupplementaryNoteItem, NoteBreakdownRow } from './CreditNotesTab';
import { SimpleRichTextEditor } from '../common/SimpleRichTextEditor';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { AccountingNumberInput } from '../common/AccountingNumberInput';
import { FixedAssetCategoryItem } from './CreditFixedAssetsTab';
import { AdminExpenseItem } from './CreditAdminExpensesTab';

interface DisclosureDetailModalProps {
  note: SupplementaryNoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (updatedNote: SupplementaryNoteItem) => void;
  yearsList: number[];
  assetCategories?: FixedAssetCategoryItem[];
  adminExpenses?: AdminExpenseItem[];
}

export const DisclosureDetailModal: React.FC<DisclosureDetailModalProps> = ({
  note,
  isOpen,
  onClose,
  onSaveNote,
  yearsList,
  assetCategories = [],
  adminExpenses = [],
}) => {
  if (!isOpen || !note) return null;

  const [isEditingMode, setIsEditingMode] = useState(false);
  const [noteNumber, setNoteNumber] = useState<number | string>(note.noteNumber);
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category);
  const [content, setContent] = useState(note.content);
  const [breakdownRows, setBreakdownRows] = useState<NoteBreakdownRow[]>(note.customBreakdownRows || []);

  const [newRowLabel, setNewRowLabel] = useState('');
  const [newRowBaseVal, setNewRowBaseVal] = useState<number>(100000);

  useEffect(() => {
    if (note) {
      setNoteNumber(note.noteNumber);
      setTitle(note.title);
      setCategory(note.category);
      setContent(note.content);
      setBreakdownRows(note.customBreakdownRows || []);
      setIsEditingMode(false);
    }
  }, [note]);

  const handleSave = () => {
    const updated: SupplementaryNoteItem = {
      ...note,
      noteNumber,
      title,
      category,
      content,
      customBreakdownRows: breakdownRows,
    };
    onSaveNote(updated);
    setIsEditingMode(false);
  };

  const handleAddBreakdownRow = () => {
    if (!newRowLabel.trim()) return;
    const newId = `row_${Date.now()}`;
    const valuesByYear: Record<number, number> = {};
    yearsList.forEach((yr, idx) => {
      const growth = 1 + (idx - (yearsList.length - 1)) * 0.1;
      valuesByYear[yr] = Math.round(newRowBaseVal * Math.max(0.5, growth));
    });

    setBreakdownRows([...breakdownRows, { id: newId, label: newRowLabel.trim(), valuesByYear }]);
    setNewRowLabel('');
  };

  const handleUpdateRowValue = (rowId: string, year: number, val: number) => {
    setBreakdownRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return { ...r, valuesByYear: { ...r.valuesByYear, [year]: val } };
        }
        return r;
      })
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setBreakdownRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-black font-mono">
              إيضاح ({noteNumber})
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-400">التصنيف: {category} | الإيضاحات المتممة للقوائم المالية</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingMode(!isEditingMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isEditingMode
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingMode ? 'وضع التعديل المباشر' : 'تعديل الإيضاح'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 dark:text-slate-200">
          {/* Editable Header Fields in Edit Mode */}
          {isEditingMode ? (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  تحرير مسمى وتصنيف الإيضاح المتمم:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الإيضاح:</label>
                  <input
                    type="text"
                    value={noteNumber}
                    onChange={(e) => setNoteNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان الإيضاح:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تصنيف البند:</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  إيضاح متمم معتمد للقوائم المالية وفقاً لمعايير المحاسبة المصرية (EAS) وقانون الشركات.
                </span>
              </div>
              <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg font-bold font-mono">
                {category}
              </span>
            </div>
          )}

          {/* Text / HTML Content Area */}
          <div className="space-y-2">
            <label className="font-black text-slate-900 dark:text-slate-100 block text-xs">
              النص المحاسبي والسياسات والإفصاحات المتممة:
            </label>

            {isEditingMode ? (
              <SimpleRichTextEditor
                value={content}
                onChange={(newHtml) => setContent(newHtml)}
                minHeight="180px"
              />
            ) : (
              <div
                className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 leading-relaxed text-slate-800 dark:text-slate-200 prose dark:prose-invert max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </div>

          {/* Linked Schedule Table or Breakdown Rows */}
          {note.linkedScheduleType === 'FIXED_ASSETS' ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-purple-600" />
                  <span>جدول حركة وإهلاك الأصول الثابتة المربوط آلياً (معيار 10):</span>
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">فئة الأصل الثابت</th>
                      <th className="p-2.5 text-center">نسبة الإهلاك</th>
                      <th className="p-2.5 text-left font-mono">تكلفة نهاية المدة</th>
                      <th className="p-2.5 text-left font-mono">إهلاك العام</th>
                      <th className="p-2.5 text-left font-mono">صافي القيمة الدفترية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {assetCategories.map((cat) => {
                      const latestYr = yearsList[yearsList.length - 1] || 2026;
                      const yrData = cat.valuesByYear?.[latestYr] || { costStart: 0, additions: 0, disposals: 0, accumStart: 0 };
                      const costEnd = (yrData.costStart || 0) + (yrData.additions || 0) - (yrData.disposals || 0);
                      const depExpense = yrData.customDepExpense !== undefined ? yrData.customDepExpense : (cat.depRate > 0 ? Math.round(costEnd * (cat.depRate / 100)) : 0);
                      const accumEnd = (yrData.accumStart || 0) + depExpense;
                      const netVal = Math.max(0, costEnd - accumEnd);

                      return (
                        <tr key={cat.id}>
                          <td className="p-2.5 font-bold">{cat.name}</td>
                          <td className="p-2.5 text-center font-mono">{cat.depRate}%</td>
                          <td className="p-2.5 text-left font-mono">{formatEgyptianCurrency(costEnd)}</td>
                          <td className="p-2.5 text-left font-mono text-purple-700 font-bold">{formatEgyptianCurrency(depExpense)}</td>
                          <td className="p-2.5 text-left font-mono font-black text-emerald-700">{formatEgyptianCurrency(netVal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : note.linkedScheduleType === 'ADMIN_EXPENSES' ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-purple-600" />
                  <span>جدول المصروفات الإدارية والعمومية المربوط آلياً:</span>
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">بند المصروف الإداري</th>
                      <th className="p-2.5">التصنيف</th>
                      {yearsList.map((y) => (
                        <th key={y} className="p-2.5 text-left font-mono">سنة {y} (ج.م)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {adminExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-2.5 font-bold">{exp.name}</td>
                        <td className="p-2.5 text-slate-500">{exp.category}</td>
                        {yearsList.map((y) => (
                          <td key={y} className="p-2.5 text-left font-mono font-bold">
                            {formatEgyptianCurrency(exp.valuesByYear?.[y] || 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Custom Breakdown Table */
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-purple-600" />
                  <span>جدول تفاصيل ومكونات الإيضاح المتمم المقارنة:</span>
                </h4>

                {isEditingMode && (
                  <span className="text-[11px] text-amber-700 font-bold">يمكنك تعديل القيم والصفوف أدناه بحرية</span>
                )}
              </div>

              {breakdownRows.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-right text-xs divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-2.5">بيان المكونات والتفاصيل</th>
                        {yearsList.map((y) => (
                          <th key={y} className="p-2.5 text-left font-mono">سنة {y} (ج.م)</th>
                        ))}
                        {isEditingMode && <th className="p-2.5 text-center w-12"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {breakdownRows.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2.5 font-bold">{r.label}</td>
                          {yearsList.map((y) => (
                            <td key={y} className="p-2.5 text-left font-mono">
                              {isEditingMode ? (
                                <AccountingNumberInput
                                  value={r.valuesByYear?.[y] || 0}
                                  onChange={(val) => handleUpdateRowValue(r.id, y, val)}
                                  allowNegative={true}
                                  allowDecimals={true}
                                  decimalPlaces={2}
                                  className="w-full text-left px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded font-mono font-bold text-blue-900 dark:text-blue-200"
                                />
                              ) : (
                                formatEgyptianCurrency(r.valuesByYear?.[y] || 0)
                              )}
                            </td>
                          ))}
                          {isEditingMode && (
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(r.id)}
                                className="text-red-400 hover:text-red-700 p-1 cursor-pointer"
                                title="حذف هذا الصف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* Totals Row */}
                      <tr className="bg-purple-50/70 dark:bg-purple-950/40 font-black text-purple-950 dark:text-purple-200">
                        <td className="p-2.5">إجمالي بيان الإيضاح المتمم</td>
                        {yearsList.map((y) => {
                          const tot = breakdownRows.reduce((acc, r) => acc + (r.valuesByYear?.[y] || 0), 0);
                          return (
                            <td key={y} className="p-2.5 text-left font-mono">
                              {formatEgyptianCurrency(tot)}
                            </td>
                          );
                        })}
                        {isEditingMode && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-slate-500 text-center text-xs">
                  لا توجد مصفوفة جداول رقمية مخصصة لهذا الإيضاح، يمكنك إضافة صفوف تفصيلية أدناه.
                </div>
              )}

              {/* Add New Row Controls in Edit Mode */}
              {isEditingMode && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-end gap-3 pt-3">
                  <div className="flex-1 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      إضافة صف تفصيلي جديد للإيضاح:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: اعتمادات مستندية قائمة ومفتوحة للشركة"
                      value={newRowLabel}
                      onChange={(e) => setNewRowLabel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div className="w-full sm:w-44 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      المبلغ التقديري الأساسي:
                    </label>
                    <AccountingNumberInput
                      value={newRowBaseVal}
                      onChange={(val) => setNewRowBaseVal(val)}
                      allowNegative={true}
                      allowDecimals={true}
                      decimalPlaces={2}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBreakdownRow}
                    className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إدراج الصف</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              التغييرات تُحفظ مباشرة بالملف الائتماني والتقرير الشامل للشركة
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              إغلاق
            </button>

            {isEditingMode && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>حفظ اعتمادات الإيضاح</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
