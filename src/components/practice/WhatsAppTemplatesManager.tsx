import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Edit3,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Sparkles,
  FileText,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../../db/localDatabase';
import { WhatsAppMessageTemplate } from '../../types';

export const WhatsAppTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<WhatsAppMessageTemplate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  // Load templates from database
  const loadTemplates = () => {
    const list = db.getWhatsAppTemplates();
    setTemplates(list);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tmpl) => {
      const matchesSearch =
        tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.templateBody.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (categoryFilter !== 'ALL' && tmpl.category !== categoryFilter) return false;
      return true;
    });
  }, [templates, searchQuery, categoryFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      db.deleteWhatsAppTemplate(id);
      loadTemplates();
    }
  };

  const handleResetToDefault = () => {
    if (confirm('هل أنت متأكد من استعادة قوالب الرسائل الرسمية الافتراضية؟ سيتم تحديث جميع الصيغ المعتمدة.')) {
      db.resetWhatsAppTemplatesToDefault();
      loadTemplates();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    }
  };

  const handleSaveEditedTemplate = () => {
    if (!selectedTemplateForEdit) return;
    db.saveWhatsAppTemplate(selectedTemplateForEdit);
    loadTemplates();
    setIsEditModalOpen(false);
    setSelectedTemplateForEdit(null);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const insertVariable = (variableKey: string) => {
    if (!selectedTemplateForEdit) return;
    setSelectedTemplateForEdit({
      ...selectedTemplateForEdit,
      templateBody: selectedTemplateForEdit.templateBody + ` {${variableKey}}`,
    });
  };

  return (
    <div className="space-y-4">
      {savedBanner && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ وتحديث قوالب الرسائل بنجاح.</span>
        </div>
      )}

      {/* Top Filter & Control Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في أسماء ونصوص القوالب..."
            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 outline-none"
          />
        </div>

        {/* Categories & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">جميع التصنيفات</option>
            <option value="INVOICE">فواتير ومطالبات أتعاب</option>
            <option value="TREASURY_RECEIPT">سندات قبض وخزينة</option>
            <option value="TAX_DEADLINE_REMINDER">تذكيرات المواعيد الضريبية</option>
            <option value="TAX_DECLARATION">إقرارات ضريبية</option>
            <option value="CERTIFICATE">شهادات مهنية</option>
            <option value="GENERAL">مراسلات عامة</option>
          </select>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            title="استعادة القوالب الرسمية المعتمدة"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplateForEdit({
                id: `tmpl-${Date.now()}`,
                code: 'CUSTOM',
                title: 'قالب إشعار جديد مخصص',
                category: 'GENERAL',
                subject: 'إشعار مالي وإداري',
                templateBody: `السادة / *{CLIENT_NAME}*\nعناية: {CONTACT_PERSON} المحترمين\nتحية طيبة وبعد،،\n\nنحيط سيادتكم علماً بما يلي بخصوص شركتكم:\n\n📋 *البيان:* {DOC_TITLE}\n📅 *التاريخ:* {DATE}`,
                isDefault: false,
                isActive: true,
              });
              setIsEditModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة قالب</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{tmpl.title}</h4>
                    {tmpl.isDefault && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        رسمي
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    كود: <b>{tmpl.code}</b> | الموضوع: {tmpl.subject}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedTemplateForEdit(tmpl);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                    title="تعديل القالب"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopy(tmpl.templateBody, tmpl.id)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="نسخ نص القالب"
                  >
                    {copiedId === tmpl.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {!tmpl.isDefault && (
                    <button
                      onClick={() => handleDelete(tmpl.id)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="حذف القالب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body Preview */}
              <div className="mt-2.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text max-h-40 overflow-y-auto">
                {tmpl.templateBody}
              </div>
            </div>

            {/* Card Footer */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>يدعم التعبئة الديناميكية للمبالغ والبيانات</span>
              <button
                onClick={() => {
                  setSelectedTemplateForEdit(tmpl);
                  setIsEditModalOpen(true);
                }}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                تعديل القالب ←
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Template Modal */}
      {isEditModalOpen && selectedTemplateForEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>تعديل صيغة القالب المعتمد</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  عنوان القالب:
                </label>
                <input
                  type="text"
                  value={selectedTemplateForEdit.title}
                  onChange={(e) =>
                    setSelectedTemplateForEdit({ ...selectedTemplateForEdit, title: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    كود القالب:
                  </label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.code}
                    onChange={(e) =>
                      setSelectedTemplateForEdit({ ...selectedTemplateForEdit, code: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    موضوع الرسالة:
                  </label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.subject}
                    onChange={(e) =>
                      setSelectedTemplateForEdit({ ...selectedTemplateForEdit, subject: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Variable Chips */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                  إدراج متغير ديناميكي بنقرة واحدة:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'CLIENT_NAME', label: 'اسم العميل' },
                    { key: 'CONTACT_PERSON', label: 'الشخص المسؤول' },
                    { key: 'TAX_NUMBER', label: 'رقم التسجيل' },
                    { key: 'DOC_TITLE', label: 'عنوان المعاملة' },
                    { key: 'AMOUNT', label: 'المبلغ' },
                    { key: 'DATE', label: 'التاريخ' },
                    { key: 'SIGNATURE', label: 'توقيع المكتب' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-700 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono cursor-pointer"
                    >
                      +{v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  نص القالب (يدعم تنسيقات واتساب: *عريض*، _مائل_):
                </label>
                <textarea
                  rows={6}
                  value={selectedTemplateForEdit.templateBody}
                  onChange={(e) =>
                    setSelectedTemplateForEdit({ ...selectedTemplateForEdit, templateBody: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTemplate}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
