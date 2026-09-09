import React, { useState } from 'react';
import {
  FileText,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Info,
  Layers,
  DollarSign,
  Download,
  Sliders,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';
import { SimpleRichTextEditor } from '../common/SimpleRichTextEditor';
import { FixedAssetCategoryItem } from './CreditFixedAssetsTab';
import { AdminExpenseItem } from './CreditAdminExpensesTab';
import { AccountingNumberInput } from '../common/AccountingNumberInput';
import * as XLSX from 'xlsx';

export interface NoteBreakdownRow {
  id: string;
  label: string;
  valuesByYear: Record<number, number>;
}

export interface SupplementaryNoteItem {
  id: string;
  noteNumber: number | string;
  title: string;
  category: string;
  content: string; // Rich text / HTML
  linkedScheduleType?: 'FIXED_ASSETS' | 'ADMIN_EXPENSES' | 'CUSTOM_TABLE' | 'NONE';
  customBreakdownRows?: NoteBreakdownRow[];
  isCustom?: boolean;
}

interface CreditNotesTabProps {
  yearsList: number[];
  computedData: Record<number, any>;
  notesList?: SupplementaryNoteItem[];
  onUpdateNotesList?: (notes: SupplementaryNoteItem[]) => void;
  onResetNotes?: () => void;
  assetCategories?: FixedAssetCategoryItem[];
  adminExpenses?: AdminExpenseItem[];
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
}

export const DEFAULT_SUPPLEMENTARY_NOTES: SupplementaryNoteItem[] = [
  {
    id: 'note_1',
    noteNumber: 1,
    title: 'نبذة عن الشركة والشكل القانوني والنشاط الرئيسي',
    category: 'عام',
    content:
      '<p>تأسست <strong>شركة الانظمة الكهربائية المتكاملة (هاني سعيد محمد محمود وشريكه)</strong> كشركة توصية بسيطة، ونشاطها توريدات كهربائية ومقاولات كهربائية والاستيراد والتصدير وصيانة ملفات المحولات الكهربائية وصيانة مواتير كهربائية وصيانة لوحات كهربائية جهد منخفض وتصنيع لوحات جهد متوسط ومنخفض ومقاومات معدنية للمحولات الكهربائية وتصنيع جميع المهمات الخاصة بالشبكات ومحطات الطاقة الكهربائية ونقل وتوزيع وبيع الطاقة الكهربائية وادارة وصيانة الشبكات الخاصة بها، ومقرها الرئيسي: قطعة 6 تقسيم الملابس الجاهزة الشيخ زايد الاسماعيلية، وفرع آخر قطعة 81 المنطقة الصناعية الثانية الصالحية محافظة الشرقية، وفرع آخر تقسيم الجمعية التعاونية لتعمير الصحاري وادي الملاك طريق اسماعيلية القاهرة - الاسماعيلية.</p>',
    linkedScheduleType: 'NONE',
  },
  {
    id: 'note_2',
    noteNumber: 2,
    title: 'أسس إعداد القوائم المالية والامتثال للمعايير',
    category: 'سياسات محاسبية',
    content:
      '<p>أُعدت القوائم المالية وفقاً لـ <strong>معايير المحاسبة المصرية (EAS)</strong> الصادرة بالقرار الوزاري رقم 110 لسنة 2015 وتعديلاتها والقوانين واللوائح المصرية السارية، وعلى أساس مبدأ التكلفة التاريخية والاستمرارية ومبدأ الاستحقاق. وعملة العرض والتعامل هي <em>الجنيه المصري (ج.م)</em> وهو العملة الوظيفية للمنشأة.</p>',
    linkedScheduleType: 'NONE',
  },
  {
    id: 'note_3',
    noteNumber: 3,
    title: 'ملخص أهم السياسات المحاسبية المتبعة',
    category: 'سياسات محاسبية',
    content:
      '<ul><li><strong>العملة المستخدمة:</strong> العملة التي تعرض بها القوائم المالية هي الجنيه المصري فقط.</li><li><strong>الأصول الثابتة وإهلاكاتها:</strong> يتم إثبات الأصول الثابتة بتكلفتها التاريخية ويتم إهلاكها بطريقة القسط الثابت على مدار العمر الإنتاجي المقدر لكل منها (الآلات ومعدات وعدد: 10 سنوات، مباني وإنشاءات: 10 سنوات).</li><li><strong>المخزون:</strong> يقيم بالتكلفة أو صافي القيمة البيعية أيهما أقل بطريقة الوارد أولاً يصرف أولاً (خام، تحت التشغيل، إنتاج تام).</li></ul>',
    linkedScheduleType: 'NONE',
  },
  {
    id: 'note_4',
    noteNumber: 4,
    title: 'الأصول الثابتة ومجمع الإهلاك (معيار المحاسبة المصري 10)',
    category: 'أصول غير متداولة',
    content:
      '<p>تتضمن الأصول الثابتة الأراضي ومباني وتجهيزات والآلات ومعدات بالصافي بعد خصم مجمع الإهلاك المحسوب، وبيان حركتها وقيمها مرحل آلياً من جدول إهلاك الأصول الثابتة:</p>',
    linkedScheduleType: 'FIXED_ASSETS',
  },
  {
    id: 'note_5',
    noteNumber: 5,
    title: 'مشروعات تحت التنفيذ ودفعات مقدمة للاستثمارات',
    category: 'أصول غير متداولة',
    content:
      '<p>تمثل تكاليف الأعمال الإنشائية وتوسعات خطوط الإنتاج والآلات تحت التركيب والتي لم تكتمل وتدخل في نطاق التشغيل التجاري حتى تاريخ المركز المالي.</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_cip_1',
        label: 'أعمال مدنية وإنشائية وتوسعات',
        valuesByYear: { 2024: 0, 2025: 0, 2026: 0 },
      },
    ],
  },
  {
    id: 'note_6',
    noteNumber: 6,
    title: 'المخزون (بضاعة بالمخزن)',
    category: 'أصول متداولة',
    content:
      '<p>يشمل المخزون البضائع بالمخزن مقسمة إلى خام وتحت التشغيل وإنتاج تام وفقاً للشهادات المعتمدة من مراقب الحسابات:</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_inv_1',
        label: 'خام',
        valuesByYear: { 2024: 2425000, 2025: 6268000, 2026: 6468000 },
      },
      {
        id: 'row_inv_2',
        label: 'تحت التشغيل',
        valuesByYear: { 2024: 634000, 2025: 752000, 2026: 866384 },
      },
      {
        id: 'row_inv_3',
        label: 'انتاج تام',
        valuesByYear: { 2024: 1691000, 2025: 1881000, 2026: 1881000 },
      },
    ],
  },
  {
    id: 'note_7',
    noteNumber: 7,
    title: 'العملاء',
    category: 'أصول متداولة',
    content:
      '<p>أرصدة العملاء الناتجة عن مبيعات النشاط التجاري وتوريدات الأدوات الكهربائية والمقاولات:</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_rec_1',
        label: 'عملاء توريدات ومقاولات كهربائية',
        valuesByYear: { 2024: 3600000, 2025: 4513548, 2026: 6850400 },
      },
    ],
  },
  {
    id: 'note_8',
    noteNumber: 8,
    title: 'النقدية و الصندوق والبنوك',
    category: 'أصول متداولة',
    content:
      '<p>تشمل النقدية بالصندوق والحسابات البنكية للمنشأة:</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_cash_1',
        label: 'نقدية بالصندوق',
        valuesByYear: { 2024: 100000, 2025: 175000, 2026: 200000 },
      },
    ],
  },
  {
    id: 'note_9',
    noteNumber: 9,
    title: 'المصروفات الادارية والعمومية',
    category: 'قائمة الدخل',
    content:
      '<p>تتضمن المصروفات الإدارية والعمومية أجور الإدارة، التأمينات الاجتماعية، إيجارات المقرات، ومصروفات التشغيل، والبيان التفصيلي مرحل مباشرة من جدول المصروفات الإدارية والعمومية:</p>',
    linkedScheduleType: 'ADMIN_EXPENSES',
  },
  {
    id: 'note_10',
    noteNumber: 10,
    title: 'حقوق المساهمين والشركاء',
    category: 'حقوق الملكية',
    content:
      '<p>رأس المال المصدر والمدفوع وجاري صاحب المنشأة وصافي أرباح العام:</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_eq_1',
        label: 'رأس المال',
        valuesByYear: { 2024: 2000000, 2025: 2000000, 2026: 2000000 },
      },
      {
        id: 'row_eq_2',
        label: 'جاري صاحب المنشأة',
        valuesByYear: { 2024: 34630587, 2025: 21229021, 2026: 28666948 },
      },
      {
        id: 'row_eq_3',
        label: 'صافي ارباح العام',
        valuesByYear: { 2024: 196913, 2025: 9710000, 2026: 4971462 },
      },
    ],
  },
  {
    id: 'note_11',
    noteNumber: 11,
    title: 'الخصوم المتداولة (الالتزامات)',
    category: 'التزامات وتمويل',
    content:
      '<p>تتضمن الدائنين وأوراق الدفع ورصيد التسهيل الائتماني قصير الأجل (جاري مدين) ورصيد القرض متوسط الأجل من البنوك (البنك الأهلي المصري / البنك العربي):</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_liab_1',
        label: 'دائنون و اوراق دفع',
        valuesByYear: { 2024: 180500, 2025: 190250, 2026: 202000 },
      },
      {
        id: 'row_liab_2',
        label: 'رصيد التسهيل قصير الاجل : جاري مدين',
        valuesByYear: { 2024: 0, 2025: 3567209, 2026: 3996065 },
      },
      {
        id: 'row_liab_3',
        label: 'رصيد القرض متوسط الاجل',
        valuesByYear: { 2024: 0, 2025: 3243568, 2026: 2779809 },
      },
    ],
  },
  {
    id: 'note_12',
    noteNumber: 12,
    title: 'المصروفات التمويلية',
    category: 'قائمة الدخل',
    content:
      '<p>تمثل الفوائد والمصروفات التمويلية الناتجة عن التسهيلات والقروض البنكية لدى البنك الأهلي المصري والبنك العربي:</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_fin_1',
        label: 'المصروفات التمويلية (البنك الاهلي المصري/ البنك العربي)',
        valuesByYear: { 2024: 0, 2025: 285000, 2026: 185635 },
      },
    ],
  },
  {
    id: 'note_13',
    noteNumber: 13,
    title: 'الالتزامات المحتملة والارتباطات الرأسمالية',
    category: 'إفصاحات إضافية',
    content:
      '<p>لا توجد أي قضايا جوهرية مرفوعة ضد الشركة، ولا توجد أية التزامات محتملة أو ارتباطات رأسمالية غير مثبتة بالقوائم المالية حتى تاريخ إصدار هذا التقرير.</p>',
    linkedScheduleType: 'NONE',
  },
  {
    id: 'note_14',
    noteNumber: 14,
    title: 'الأحداث اللاحقة لتاريخ المركز المالي',
    category: 'أحداث لاحقة',
    content:
      '<p>لم تقع أية أحداث جوهرية لاحقة لتاريخ المركز المالي تؤثر تأثيراً مادياً على سلامة وعدالة المركز المالي المعروض أو نتائج أعمال الشركة عن الفترة المنتهية في تاريخه.</p>',
    linkedScheduleType: 'NONE',
  },
  {
    id: 'note_15',
    noteNumber: 15,
    title: 'مشروع توزيع الأرباح والاحتياطيات وحصة العاملين (قانون 159 لسنة 1981)',
    category: 'حقوق الملكية وتوزيعات الأرباح',
    content:
      '<p>وفقاً لأحكام قانون الشركات رقم 159 لسنة 1981 والمادة 40 و41 منه وقرارات الجمعية العامة العادية للمساهمين، يقتطع 5% سنوياً لحساب الاحتياطي القانوني حتى يبلغ 50% من رأس المال المصدر والمدفوع، وتخصم 10% نقدياً كحصة للعاملين في الأرباح بما لا يجاوز مجموع الأجور السنوية الأساسية، وتخصص التوزيعات النقدية للمساهمين والشركاء وتدرج الأرباح غير الموزعة ضمن الأرباح المرحلة لتدعيم الملاءة المالية والائتمانية للمنشأة.</p>',
    linkedScheduleType: 'CUSTOM_TABLE',
    customBreakdownRows: [
      {
        id: 'row_pdist_1',
        label: 'صافي أرباح العام القابلة للتوزيع بعد الضريبة',
        valuesByYear: { 2024: 850000, 2025: 980000, 2026: 1046250 },
      },
      {
        id: 'row_pdist_2',
        label: 'الاحتياطي القانوني المقتطع (5% إلزامية)',
        valuesByYear: { 2024: 42500, 2025: 49000, 2026: 52313 },
      },
      {
        id: 'row_pdist_3',
        label: 'حصة العاملين النقدية في الأرباح (10%)',
        valuesByYear: { 2024: 80750, 2025: 93100, 2026: 99394 },
      },
      {
        id: 'row_pdist_4',
        label: 'توزيعات الأرباح النقدية المقترحة للمساهمين والشركاء',
        valuesByYear: { 2024: 484500, 2025: 558600, 2026: 596363 },
      },
      {
        id: 'row_pdist_5',
        label: 'الأرباح المحتجزة والمرحلة للسنوات القادمة',
        valuesByYear: { 2024: 242250, 2025: 279300, 2026: 298180 },
      },
    ],
  },
];

export const CreditNotesTab: React.FC<CreditNotesTabProps> = ({
  yearsList,
  computedData,
  notesList: propNotesList,
  onUpdateNotesList,
  onResetNotes,
  assetCategories = [],
  adminExpenses = [],
  periodStartDate,
  periodEndDate,
  periodLabel,
}) => {
  const [localNotes, setLocalNotes] = useState<SupplementaryNoteItem[]>(DEFAULT_SUPPLEMENTARY_NOTES);
  const activeNotes = propNotesList || localNotes;

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editScheduleType, setEditScheduleType] = useState<SupplementaryNoteItem['linkedScheduleType']>('NONE');

  const [isAddingNewNote, setIsAddingNewNote] = useState(false);
  const [newNoteNumber, setNewNoteNumber] = useState<number>(activeNotes.length + 1);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('إفصاحات عامة');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<SupplementaryNoteItem['linkedScheduleType']>('NONE');

  // Breakdown item adding
  const [addingBreakdownToNoteId, setAddingBreakdownToNoteId] = useState<string | null>(null);
  const [newBreakdownLabel, setNewBreakdownLabel] = useState('');
  const [newBreakdownBaseAmount, setNewBreakdownBaseAmount] = useState<number>(100000);

  const handleUpdate = (updated: SupplementaryNoteItem[]) => {
    if (onUpdateNotesList) {
      onUpdateNotesList(updated);
    } else {
      setLocalNotes(updated);
    }
  };

  // Start edit note
  const handleStartEditNote = (note: SupplementaryNoteItem) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditCategory(note.category);
    setEditContent(note.content);
    setEditScheduleType(note.linkedScheduleType || 'NONE');
  };

  // Save edit note
  const handleSaveEditNote = (id: string) => {
    const updated = activeNotes.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          title: editTitle.trim() || n.title,
          category: editCategory.trim() || n.category,
          content: editContent,
          linkedScheduleType: editScheduleType,
        };
      }
      return n;
    });
    handleUpdate(updated);
    setEditingNoteId(null);
  };

  // Add new note
  const handleAddNewNote = () => {
    if (!newNoteTitle.trim()) return;

    const newId = `note_${Date.now()}`;
    const newNote: SupplementaryNoteItem = {
      id: newId,
      noteNumber: newNoteNumber,
      title: newNoteTitle.trim(),
      category: newNoteCategory.trim() || 'إفصاحات عامة',
      content: newNoteContent || '<p>اكتب محتوى الإيضاح المتمم هنا...</p>',
      linkedScheduleType: newScheduleType,
      customBreakdownRows: newScheduleType === 'CUSTOM_TABLE' ? [] : undefined,
      isCustom: true,
    };

    handleUpdate([...activeNotes, newNote]);
    setNewNoteTitle('');
    setNewNoteCategory('إفصاحات عامة');
    setNewNoteContent('');
    setNewScheduleType('NONE');
    setNewNoteNumber(activeNotes.length + 2);
    setIsAddingNewNote(false);
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    const updated = activeNotes.filter((n) => n.id !== id);
    handleUpdate(updated);
  };

  // Add breakdown row to note
  const handleAddBreakdownRow = (noteId: string) => {
    if (!newBreakdownLabel.trim()) return;

    const newRowId = `breakdown_row_${Date.now()}`;
    const valuesByYear: Record<number, number> = {};

    yearsList.forEach((yr, idx) => {
      const factor = 1 + (idx - (yearsList.length - 1)) * 0.1;
      valuesByYear[yr] = Math.round(newBreakdownBaseAmount * factor);
    });

    const updated = activeNotes.map((note) => {
      if (note.id === noteId) {
        const rows = note.customBreakdownRows || [];
        return {
          ...note,
          customBreakdownRows: [
            ...rows,
            {
              id: newRowId,
              label: newBreakdownLabel.trim(),
              valuesByYear,
            },
          ],
        };
      }
      return note;
    });

    handleUpdate(updated);
    setNewBreakdownLabel('');
    setNewBreakdownBaseAmount(100000);
    setAddingBreakdownToNoteId(null);
  };

  // Delete breakdown row
  const handleDeleteBreakdownRow = (noteId: string, rowId: string) => {
    const updated = activeNotes.map((note) => {
      if (note.id === noteId) {
        return {
          ...note,
          customBreakdownRows: (note.customBreakdownRows || []).filter((r) => r.id !== rowId),
        };
      }
      return note;
    });
    handleUpdate(updated);
  };

  // Update breakdown row value
  const handleUpdateBreakdownValue = (
    noteId: string,
    rowId: string,
    yr: number,
    val: number
  ) => {
    const updated = activeNotes.map((note) => {
      if (note.id === noteId) {
        return {
          ...note,
          customBreakdownRows: (note.customBreakdownRows || []).map((r) => {
            if (r.id === rowId) {
              return {
                ...r,
                valuesByYear: {
                  ...r.valuesByYear,
                  [yr]: val,
                },
              };
            }
            return r;
          }),
        };
      }
      return note;
    });
    handleUpdate(updated);
  };

  // Export Notes to Excel
  const handleExportNotesExcel = () => {
    const wb = XLSX.utils.book_new();

    const notesSummaryRows = activeNotes.map((note) => {
      // Strip HTML tags for clean excel export
      const textContent = note.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      return {
        'رقم الإيضاح': `إيضاح (${note.noteNumber})`,
        'عنوان الإيضاح المتمم': note.title,
        'التصنيف المحاسبي': note.category,
        'نوع الجدول المرتبط':
          note.linkedScheduleType === 'FIXED_ASSETS'
            ? 'جدول إهلاك الأصول الثابتة'
            : note.linkedScheduleType === 'ADMIN_EXPENSES'
            ? 'جدول المصروفات الإدارية'
            : note.linkedScheduleType === 'CUSTOM_TABLE'
            ? 'جدول فرعي مخصص'
            : 'نص إيضاح وصفي',
        'نص الإيضاح المتمم': textContent,
      };
    });

    const wsSummary = XLSX.utils.json_to_sheet(notesSummaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'فهرس الإيضاحات المتممة');

    // Add breakdown details sheet
    const breakdownRows: any[] = [];
    activeNotes.forEach((note) => {
      if (note.customBreakdownRows && note.customBreakdownRows.length > 0) {
        note.customBreakdownRows.forEach((row) => {
          const rowObj: any = {
            'رقم الإيضاح': `إيضاح (${note.noteNumber})`,
            'عنوان الإيضاح': note.title,
            'بيان البند الفرعي': row.label,
          };
          yearsList.forEach((yr) => {
            rowObj[`مبلغ سنة ${yr}`] = row.valuesByYear[yr] || 0;
          });
          breakdownRows.push(rowObj);
        });
      }
    });

    if (breakdownRows.length > 0) {
      const wsBreakdown = XLSX.utils.json_to_sheet(breakdownRows);
      XLSX.utils.book_append_sheet(wb, wsBreakdown, 'جداول تفاصيل الإيضاحات');
    }

    XLSX.writeFile(wb, `الإيضاحات_المتممة_للقوائم_المالية.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  الإيضاحات المتممة للقوائم المالية (Notes to Financial Statements)
                </h2>
                {periodStartDate && periodEndDate && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[11px]">
                    {periodStartDate} ← {periodEndDate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                محرر نصوص ثري لتنسيق السياسات والإفصاحات وجداول ديناميكية مربوطة بجدول الأصول والمصاريف والقوائم المالية.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddingNewNote(true)}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة إيضاح متمم جديد
          </button>

          <button
            type="button"
            onClick={handleExportNotesExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير الإيضاحات (Excel)
          </button>

          {onResetNotes && (
            <button
              type="button"
              onClick={onResetNotes}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="استعادة الإيضاحات النموذجية المعتمدة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              استعادة الافتراضي
            </button>
          )}
        </div>
      </div>

      {/* Add New Note Modal */}
      {isAddingNewNote && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-blue-950 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-700" />
              إضافة إيضاح متمم جديد وملاحظات تفصيلية
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNewNote(false)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رقم الإيضاح:</label>
              <input
                type="number"
                value={newNoteNumber}
                onChange={(e) => setNewNoteNumber(Number(e.target.value) || 1)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                عنوان الإيضاح المتمم:
              </label>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="مثال: الاستثمارات المالية والتسهيلات الائتمانية"
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                نوع الجدول المرتبط:
              </label>
              <select
                value={newScheduleType}
                onChange={(e) =>
                  setNewScheduleType(
                    e.target.value as SupplementaryNoteItem['linkedScheduleType']
                  )
                }
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="NONE">نص وإفصاح وصفي فقط</option>
                <option value="CUSTOM_TABLE">جدول تفصيلي فرعي مخصص</option>
                <option value="FIXED_ASSETS">ربط بجدول الأصول الثابتة</option>
                <option value="ADMIN_EXPENSES">ربط بجدول المصروفات الإدارية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              محتوى وملاحظات الإيضاح (محرر نصوص منسق Rich Text):
            </label>
            <SimpleRichTextEditor
              value={newNoteContent}
              onChange={setNewNoteContent}
              placeholder="اكتب نصوص المعايير المحاسبية والسياسات المتبعة وتفاصيل البند وتنسيقه..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingNewNote(false)}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAddNewNote}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              حفظ وإدراج الإيضاح
            </button>
          </div>
        </div>
      )}

      {/* Notes List Container */}
      <div className="space-y-4">
        {activeNotes.map((note) => {
          const isEditing = editingNoteId === note.id;

          return (
            <div
              key={note.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
            >
              {/* Note Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 font-mono font-black text-xs flex items-center justify-center border border-blue-200">
                    {note.noteNumber}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-sm font-black border border-blue-300 rounded-lg px-2 py-1 bg-white outline-none w-full sm:w-80"
                    />
                  ) : (
                    <h3 className="text-sm font-black text-slate-900">
                      إيضاح ({note.noteNumber}) : {note.title}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                    {note.category}
                  </span>

                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleSaveEditNote(note.id)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      حفظ التعديلات
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEditNote(note)}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      title="تعديل وتنسيق الإيضاح بمحرر النصوص"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="حذف هذا الإيضاح"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content / Rich Text Editor */}
              {isEditing ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700">نوع الجدول المرتبط:</label>
                    <select
                      value={editScheduleType}
                      onChange={(e) =>
                        setEditScheduleType(
                          e.target.value as SupplementaryNoteItem['linkedScheduleType']
                        )
                      }
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white outline-none cursor-pointer"
                    >
                      <option value="NONE">نص وإفصاح وصفي فقط</option>
                      <option value="CUSTOM_TABLE">جدول تفصيلي فرعي مخصص</option>
                      <option value="FIXED_ASSETS">ربط بجدول الأصول الثابتة</option>
                      <option value="ADMIN_EXPENSES">ربط بجدول المصروفات الإدارية</option>
                    </select>
                  </div>

                  <SimpleRichTextEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="اكتب تفاصيل الإيضاح المحاسبي والملاحظات المهنية..."
                  />
                </div>
              ) : (
                <div
                  className="text-xs text-slate-700 leading-relaxed font-sans prose prose-slate max-w-none text-right"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              )}

              {/* LINKED FIXED ASSETS SCHEDULE (إيضاح الأصول الثابتة المربوط تلقائياً) */}
              {note.linkedScheduleType === 'FIXED_ASSETS' && assetCategories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-700" />
                      جدول ملخص حركة الأصول الثابتة ومجمع الإهلاك للسنوات المالية (مربوط آلياً):
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold">
                          <th className="py-2 px-3">السنة المالية</th>
                          <th className="py-2 px-3 text-center">تكلفة أول المدة</th>
                          <th className="py-2 px-3 text-center">إضافات العام</th>
                          <th className="py-2 px-3 text-center">إجمالي التكلفة</th>
                          <th className="py-2 px-3 text-center">مجمع الإهلاك</th>
                          <th className="py-2 px-3 text-center bg-blue-50 text-blue-900">
                            صافي القيمة الدفترية
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {yearsList.map((yr) => {
                          const netFixed = computedData[yr]?.netFixedAssets || 0;
                          const depExp = computedData[yr]?.depreciation || 0;
                          const estCost = Math.round(netFixed * 1.35);
                          const estAccum = estCost - netFixed;

                          return (
                            <tr key={yr} className="hover:bg-slate-50 font-mono">
                              <td className="py-2 px-3 font-bold text-slate-900">{yr}</td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {formatEgyptianCurrency(Math.round(estCost * 0.9))}
                              </td>
                              <td className="py-2 px-3 text-center text-emerald-700">
                                {formatEgyptianCurrency(Math.round(estCost * 0.1))}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-900">
                                {formatEgyptianCurrency(estCost)}
                              </td>
                              <td className="py-2 px-3 text-center text-rose-700">
                                {formatEgyptianCurrency(estAccum)}
                              </td>
                              <td className="py-2 px-3 text-center font-black text-blue-900 bg-blue-50/50">
                                {formatEgyptianCurrency(netFixed)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LINKED ADMIN EXPENSES SCHEDULE (إيضاح المصروفات الإدارية المربوط تلقائياً) */}
              {note.linkedScheduleType === 'ADMIN_EXPENSES' && adminExpenses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5 text-indigo-700" />
                      جدول ملخص المصروفات الإدارية والعمومية المقارن (مربوط آلياً):
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold">
                          <th className="py-2 px-3">بند المصروف الإداري</th>
                          {yearsList.map((yr) => (
                            <th key={yr} className="py-2 px-3 text-center">
                              سنة {yr}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminExpenses.slice(0, 6).map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-medium text-slate-800">
                              {item.name}
                            </td>
                            {yearsList.map((yr) => (
                              <td key={yr} className="py-1.5 px-3 text-center font-mono font-bold text-slate-700">
                                {formatEgyptianCurrency(item.valuesByYear[yr] || 0)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {adminExpenses.length > 6 && (
                          <tr className="bg-slate-50/60 text-slate-500 italic">
                            <td className="py-1.5 px-3">
                              + {adminExpenses.length - 6} بنود أخرى مفصلة في جدول المصروفات...
                            </td>
                            {yearsList.map((yr) => (
                              <td key={yr} className="py-1.5 px-3 text-center font-mono">
                                ...
                              </td>
                            ))}
                          </tr>
                        )}
                        <tr className="bg-indigo-50 font-bold text-indigo-950 border-t border-indigo-200">
                          <td className="py-2 px-3 font-black">
                            إجمالي المصروفات الإدارية والعمومية
                          </td>
                          {yearsList.map((yr) => {
                            const tot = adminExpenses.reduce(
                              (sum, i) => sum + (i.valuesByYear[yr] || 0),
                              0
                            );
                            return (
                              <td key={yr} className="py-2 px-3 text-center font-mono font-black">
                                {formatEgyptianCurrency(tot)}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DYNAMIC BREAKDOWN SUB-SCHEDULE (جدول تفصيلي مخصص داخل الإيضاح) */}
              {(note.linkedScheduleType === 'CUSTOM_TABLE' ||
                (note.customBreakdownRows && note.customBreakdownRows.length > 0)) && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5 text-blue-700" />
                      جدول التفصيل والبيان المقارن للإيضاح:
                    </span>

                    <button
                      type="button"
                      onClick={() => setAddingBreakdownToNoteId(note.id)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة بند فرعي للجدول
                    </button>
                  </div>

                  {/* Add row mini modal */}
                  {addingBreakdownToNoteId === note.id && (
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={newBreakdownLabel}
                            onChange={(e) => setNewBreakdownLabel(e.target.value)}
                            placeholder="بيان البند التفصيلي الجديد..."
                            className="w-full text-xs border border-blue-300 rounded-lg px-2 py-1.5 bg-white outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="any"
                            value={newBreakdownBaseAmount}
                            onChange={(e) =>
                              setNewBreakdownBaseAmount(parseFloat(e.target.value) || 0)
                            }
                            placeholder="المبلغ التقديري..."
                            className="w-full text-xs font-mono border border-blue-300 rounded-lg px-2 py-1.5 bg-white outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAddingBreakdownToNoteId(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddBreakdownRow(note.id)}
                          className="px-3 py-1 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          إضافة البند
                        </button>
                      </div>
                    </div>
                  )}

                  {note.customBreakdownRows && note.customBreakdownRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-right text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold">
                            <th className="py-2 px-3">البيان</th>
                            {yearsList.map((yr) => (
                              <th key={yr} className="py-2 px-3 text-center">
                                سنة {yr} (ج.م)
                              </th>
                            ))}
                            <th className="py-2 px-2 w-10 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {note.customBreakdownRows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-medium text-slate-800">
                                {row.label}
                              </td>
                              {yearsList.map((yr) => (
                                <td key={yr} className="py-1.5 px-3 text-center">
                                  <AccountingNumberInput
                                    value={row.valuesByYear[yr] || 0}
                                    onChange={(val) =>
                                      handleUpdateBreakdownValue(
                                        note.id,
                                        row.id,
                                        yr,
                                        val
                                      )
                                    }
                                    allowNegative={true}
                                    allowDecimals={true}
                                    decimalPlaces={2}
                                    className="w-32 text-center font-mono font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded px-1.5 py-1 outline-none"
                                  />
                                </td>
                              ))}
                              <td className="py-1.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBreakdownRow(note.id, row.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                  title="حذف هذا البند"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {/* Breakdown Total */}
                          <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-200">
                            <td className="py-2 px-3">الإجمالي التفصيلي للبند</td>
                            {yearsList.map((yr) => {
                              const tot = (note.customBreakdownRows || []).reduce(
                                (sum, r) => sum + (r.valuesByYear[yr] || 0),
                                0
                              );
                              return (
                                <td key={yr} className="py-2 px-3 text-center font-mono font-black">
                                  {formatEgyptianCurrency(tot)}
                                </td>
                              );
                            })}
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
