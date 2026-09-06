import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Settings,
  Send,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Phone,
  Building,
  Sparkles,
  ExternalLink,
  HelpCircle,
  FileSpreadsheet,
  Receipt,
  FileCheck2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Globe,
  Sliders,
  Users,
  Code,
  Laptop,
  CheckCheck,
  Share2,
  Info,
} from 'lucide-react';
import { db, DatabaseState } from '../db/localDatabase';
import {
  ClientArchiveRecord,
  WhatsAppBotSettings,
  WhatsAppMessageTemplate,
  WhatsAppEventCategory,
} from '../types';
import { formatEgyptianCurrency } from '../utils/qrCodeGenerator';
import { numberToArabicWords } from '../utils/numberToWordsArabic';

interface WhatsAppSettingsViewProps {
  onNavigateToArchive?: (clientId?: string) => void;
  onNavigateToBot?: () => void;
}

export const WhatsAppSettingsView: React.FC<WhatsAppSettingsViewProps> = ({
  onNavigateToArchive,
  onNavigateToBot,
}) => {
  const [state, setState] = useState<DatabaseState>(db.getState());
  const [activeSubTab, setActiveSubTab] = useState<'API_CONFIG' | 'CLIENT_PHONES' | 'TEMPLATES'>('API_CONFIG');

  // WhatsApp Bot & API Settings state
  const [settings, setSettings] = useState<WhatsAppBotSettings>(db.getWhatsAppBotSettings());
  const [isSavedBannerVisible, setIsSavedBannerVisible] = useState(false);

  // Client Phones local edit state (clientId -> { phone, contactPerson, isDirty })
  const [clientPhoneEdits, setClientPhoneEdits] = useState<
    Record<string, { phone: string; contactPerson: string; isDirty: boolean }>
  >({});
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientFilterStatus, setClientFilterStatus] = useState<'ALL' | 'HAS_PHONE' | 'MISSING_PHONE'>('ALL');

  // Templates state
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>(
    settings.templates && settings.templates.length > 0 ? settings.templates : db.getWhatsAppTemplates()
  );
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<WhatsAppMessageTemplate | null>(null);
  const [isEditingTemplateModalOpen, setIsEditingTemplateModalOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('ALL');

  // Test WhatsApp Link Box
  const [testPhone, setTestPhone] = useState('01003335360');
  const [testMessage, setTestMessage] = useState('تجربة إرسال إشعار رسمي من مكتب المحاسب القانوني عبر منظومة واتساب.');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync with DB
  useEffect(() => {
    const unsub = db.subscribe(() => {
      const freshState = db.getState();
      setState(freshState);
      const freshSettings = db.getWhatsAppBotSettings();
      setSettings(freshSettings);
      setTemplates(freshSettings.templates || []);
    });
    return unsub;
  }, []);

  // Initialize client edits from state
  useEffect(() => {
    const initialEdits: Record<string, { phone: string; contactPerson: string; isDirty: boolean }> = {};
    state.clients.forEach((c) => {
      initialEdits[c.id] = {
        phone: c.phone || '',
        contactPerson: c.contactPerson || '',
        isDirty: false,
      };
    });
    setClientPhoneEdits(initialEdits);
  }, [state.clients]);

  // Save Main WhatsApp API Settings
  const handleSaveSettings = () => {
    const updated = db.updateWhatsAppBotSettings({
      ...settings,
      templates: templates,
    });
    setSettings(updated);
    setIsSavedBannerVisible(true);
    setTimeout(() => setIsSavedBannerVisible(false), 3500);
  };

  // Reset to default settings
  const handleResetSettings = () => {
    if (confirm('هل أنت متأكد من استعادة الإعدادات والقوالب الافتراضية لمنظومة واتساب؟')) {
      db.resetWhatsAppTemplatesToDefault();
      const fresh = db.getWhatsAppBotSettings();
      setSettings(fresh);
      setTemplates(fresh.templates || []);
      setIsSavedBannerVisible(true);
      setTimeout(() => setIsSavedBannerVisible(false), 3000);
    }
  };

  // Handle Client phone inline edit change
  const handleClientPhoneChange = (clientId: string, field: 'phone' | 'contactPerson', value: string) => {
    setClientPhoneEdits((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: value,
        isDirty: true,
      },
    }));
  };

  // Save single client phone
  const handleSaveSingleClientPhone = (clientId: string) => {
    const editData = clientPhoneEdits[clientId];
    if (!editData) return;

    db.batchUpdateClientPhones([
      {
        clientId,
        phone: editData.phone.trim(),
        contactPerson: editData.contactPerson.trim(),
      },
    ]);

    setClientPhoneEdits((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        isDirty: false,
      },
    }));
  };

  // Batch Save all edited client phones
  const handleBatchSaveClientPhones = () => {
    const dirtyItems = (Object.entries(clientPhoneEdits) as [string, { phone: string; contactPerson: string; isDirty: boolean }][]).filter(
      ([_, data]) => data.isDirty
    );
    if (dirtyItems.length === 0) {
      alert('لا توجد تعديلات معلقة للحفظ.');
      return;
    }

    const updates = dirtyItems.map(([clientId, data]) => ({
      clientId,
      phone: data.phone.trim(),
      contactPerson: data.contactPerson.trim(),
    }));

    const count = db.batchUpdateClientPhones(updates);

    setClientPhoneEdits((prev) => {
      const next = { ...prev };
      dirtyItems.forEach(([id]) => {
        if (next[id]) next[id].isDirty = false;
      });
      return next;
    });

    alert(`تم بنجاح حفظ وتثبيت أرقام هواتف ${count} عميل في قاعدة البيانات.`);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return state.clients.filter((c) => {
      const edits = clientPhoneEdits[c.id] || { phone: c.phone || '', contactPerson: c.contactPerson || '' };
      const currentPhone = edits.phone;
      const currentContact = edits.contactPerson;

      const matchesSearch =
        c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
        currentPhone.includes(clientSearchQuery) ||
        currentContact.toLowerCase().includes(clientSearchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (clientFilterStatus === 'HAS_PHONE') {
        return !!currentPhone && currentPhone.trim().length > 0;
      }
      if (clientFilterStatus === 'MISSING_PHONE') {
        return !currentPhone || currentPhone.trim().length === 0;
      }

      return true;
    });
  }, [state.clients, clientPhoneEdits, clientSearchQuery, clientFilterStatus]);

  // Dirty count
  const dirtyClientsCount = (Object.values(clientPhoneEdits) as { phone: string; contactPerson: string; isDirty: boolean }[]).filter(
    (d) => d.isDirty
  ).length;

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        t.templateBody.toLowerCase().includes(templateSearchQuery.toLowerCase());

      const matchesCat = templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [templates, templateSearchQuery, templateCategoryFilter]);

  // Handle Template Save
  const handleSaveTemplateModal = (tmpl: WhatsAppMessageTemplate) => {
    db.saveWhatsAppTemplate(tmpl);
    const updated = db.getWhatsAppTemplates();
    setTemplates(updated);
    setIsEditingTemplateModalOpen(false);
    setSelectedTemplateForEdit(null);
  };

  // Handle Template Delete
  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      db.deleteWhatsAppTemplate(id);
      setTemplates(db.getWhatsAppTemplates());
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Test Dispatch Helper
  const handleTestWhatsAppDispatch = (phoneToTest: string, textToTest: string) => {
    if (!phoneToTest) {
      alert('يرجى كتابة رقم هاتف تجريبي أولاً.');
      return;
    }

    const clean = phoneToTest.replace(/[^0-9]/g, '');
    const code = settings.defaultCountryCode || '20';
    const waPhone = clean.startsWith('0')
      ? code + clean.slice(1)
      : clean.startsWith(code)
      ? clean
      : clean;

    const baseUrl = settings.customApiBaseUrl || 'https://api.whatsapp.com/send';
    const encoded = encodeURIComponent(textToTest);

    let targetUrl = '';
    if (baseUrl.includes('wa.me')) {
      targetUrl = `https://wa.me/${waPhone}?text=${encoded}`;
    } else if (baseUrl.includes('api.whatsapp.com')) {
      targetUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encoded}`;
    } else if (baseUrl.includes('web.whatsapp.com')) {
      targetUrl = `https://web.whatsapp.com/send?phone=${waPhone}&text=${encoded}`;
    } else {
      // Custom endpoint
      targetUrl = `${baseUrl}?phone=${waPhone}&text=${encoded}`;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Helper to format simulated text using variables
  const formatSampleSimulatedText = (rawTemplate: string) => {
    const sampleClient = state.clients[0] || {
      name: 'شركة النيل للصناعات الهندسية (ش.م.م)',
      contactPerson: 'المهندس / أحمد محمود',
    };
    const officeName = state.officeProfile.firmName || 'مكتب المحاسب القانوني ومراقب الحسابات';
    const auditorName = state.officeProfile.auditorName || 'أ/ محمد جميل مرعي';
    const officePhone = state.officeProfile.phone || '01003335360';
    const sampleAmount = 25000;

    let res = rawTemplate;
    res = res.replace(/{CLIENT_NAME}/g, sampleClient.name);
    res = res.replace(/{CONTACT_PERSON}/g, sampleClient.contactPerson || 'الإدارة المالية');
    res = res.replace(/{AMOUNT}/g, formatEgyptianCurrency(sampleAmount));
    res = res.replace(/{AMOUNT_WORDS}/g, numberToArabicWords(sampleAmount));
    res = res.replace(/{BALANCE_DUE}/g, formatEgyptianCurrency(15000));
    res = res.replace(/{DOC_TITLE}/g, 'أتعاب مراجعة الحسابات والفحص الضريبي');
    res = res.replace(/{REF_CODE}/g, 'INV-2026-0089');
    res = res.replace(/{DATE}/g, new Date().toISOString().slice(0, 10));
    res = res.replace(/{PERIOD}/g, 'السنة المالية 2026');
    res = res.replace(/{OFFICE_NAME}/g, officeName);
    res = res.replace(/{AUDITOR_NAME}/g, auditorName);
    res = res.replace(/{OFFICE_PHONE}/g, officePhone);

    if (settings.autoAppendOfficeSignature) {
      res += `\n\n📌 *${officeName}*\nالمحاسب القانوني: *${auditorName}*\nهاتف التواصل: ${officePhone}`;
    }

    return res;
  };

  return (
    <div className="space-y-5 text-right font-sans">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-emerald-800/80 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-lg border border-emerald-400/30">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">إعدادات ربط WhatsApp API وقوالب الرسائل ودليل الهواتف</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  WhatsApp Direct & API Engine
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
                ضبط وتخصيص رابط الـ API الأساسي للواتساب، حفظ وتثبيت أرقام هواتف العملاء الافتراضية، وإدارة قوالب الرسائل الجاهزة لكشوف الحسابات والمطالبات المالية لربطها فورياً بهاتف وتطبيق المكتب.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
            <button
              onClick={handleResetSettings}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer"
              title="استعادة الإعدادات والقوالب الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>استعادة الافتراضيات</span>
            </button>

            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>

        {/* Saved Toast Banner */}
        {isSavedBannerVisible && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/30 border border-emerald-400/50 text-emerald-100 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <CheckCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>تم حفظ وتحديث إعدادات ربط واتساب والقوالب بنجاح في قاعدة البيانات المحلية.</span>
          </div>
        )}

        {/* Sub-Tabs Nav */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-5 border-t border-emerald-800/80 mt-5">
          <button
            onClick={() => setActiveSubTab('API_CONFIG')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeSubTab === 'API_CONFIG'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold block">1. إعدادات رابط الـ API ونمط الإرسال</span>
                <span className="text-[10px] opacity-75 font-normal">ضبط الرابط، كود الدولة، والتوقيع</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
              {settings.apiDispatchMode || 'DIRECT_WEB_API'}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('CLIENT_PHONES')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeSubTab === 'CLIENT_PHONES'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-teal-600" />
              <div>
                <span className="text-xs font-bold block">2. دليل أرقام هواتف العملاء الافتراضية</span>
                <span className="text-[10px] opacity-75 font-normal">تثبيت وتحديث أرقام الواتساب للشركات</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-mono">
              {state.clients.length} عميل
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('TEMPLATES')}
            className={`p-3 rounded-2xl text-right transition-all flex items-center justify-between cursor-pointer ${
              activeSubTab === 'TEMPLATES'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold block">3. إدارة قوالب الرسائل الجاهزة</span>
                <span className="text-[10px] opacity-75 font-normal">كشوف الحسابات، الفواتير، الإقرارات</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
              {templates.length} قالب
            </span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: API & GATEWAY CONFIGURATION */}
      {activeSubTab === 'API_CONFIG' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Config Form (2 cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              {/* Dispatch Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-100 block mb-2">
                  اختر نمط وطريقة إرسال رسائل WhatsApp:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setSettings((s) => ({ ...s, apiDispatchMode: 'DIRECT_WEB_API' }))}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between ${
                      settings.apiDispatchMode === 'DIRECT_WEB_API'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">الرابط المباشر (موصى به)</span>
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            settings.apiDispatchMode === 'DIRECT_WEB_API' ? 'text-emerald-600' : 'text-slate-300'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        يفتح تطبيق واتساب على الهاتف أو WhatsApp Web مباشرة بدون اشتراكات أو خوادم وسيطة.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 mt-2 block">
                      مجاني 100% وفوري
                    </span>
                  </div>

                  <div
                    onClick={() => setSettings((s) => ({ ...s, apiDispatchMode: 'META_CLOUD_API' }))}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between ${
                      settings.apiDispatchMode === 'META_CLOUD_API'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Meta Cloud API الرسمي</span>
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            settings.apiDispatchMode === 'META_CLOUD_API' ? 'text-blue-600' : 'text-slate-300'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        ربط سحابي عبر خوادم شركة Meta للمكاتب الكبرى مع توثيق العلامة التجارية ورقم مخصص.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400 mt-2 block">
                      ربط مطورين (Developers)
                    </span>
                  </div>

                  <div
                    onClick={() => setSettings((s) => ({ ...s, apiDispatchMode: 'CUSTOM_GATEWAY' }))}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between ${
                      settings.apiDispatchMode === 'CUSTOM_GATEWAY'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">بوابة وسيطة (Gateway)</span>
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            settings.apiDispatchMode === 'CUSTOM_GATEWAY' ? 'text-purple-600' : 'text-slate-300'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        ربط مع مزود خارجي مثل UltraMsg أو Twilio أو WATI أو سيرفر محلي.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-purple-700 dark:text-purple-400 mt-2 block">
                      Webhook / REST API
                    </span>
                  </div>
                </div>
              </div>

              {/* Base API URL Settings */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                    رابط WhatsApp API الأساسي (Base Dispatch URL):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({ ...s, customApiBaseUrl: 'https://api.whatsapp.com/send' }))
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold cursor-pointer"
                    >
                      api.whatsapp.com
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, customApiBaseUrl: 'https://wa.me' }))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold cursor-pointer"
                    >
                      wa.me
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({ ...s, customApiBaseUrl: 'https://web.whatsapp.com/send' }))
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold cursor-pointer"
                    >
                      web.whatsapp.com
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <input
                    type="text"
                    value={settings.customApiBaseUrl || 'https://api.whatsapp.com/send'}
                    onChange={(e) => setSettings((s) => ({ ...s, customApiBaseUrl: e.target.value }))}
                    placeholder="https://api.whatsapp.com/send"
                    className="w-full bg-transparent font-mono text-xs text-slate-900 dark:text-slate-100 outline-none font-bold text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Country Code & Number Formatting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-100 block mb-1">
                    كود الدولة الافتراضي للأرقام (Country Code):
                  </label>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500 font-mono">+</span>
                    <input
                      type="text"
                      value={settings.defaultCountryCode || '20'}
                      onChange={(e) => setSettings((s) => ({ ...s, defaultCountryCode: e.target.value }))}
                      placeholder="20 (مصر)"
                      className="w-full bg-transparent font-mono text-xs font-bold outline-none"
                    />
                    <span className="text-[11px] text-slate-400 font-bold">مصر (EG)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-100 block mb-1">
                    اسم المساعد / البوت في المحادثات:
                  </label>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <input
                      type="text"
                      value={settings.botName || 'المساعد المحاسبي الذكي'}
                      onChange={(e) => setSettings((s) => ({ ...s, botName: e.target.value }))}
                      placeholder="المساعد المحاسبي الذكي"
                      className="w-full bg-transparent text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Meta Cloud API Extended Form (If selected) */}
              {settings.apiDispatchMode === 'META_CLOUD_API' && (
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Code className="w-4 h-4" />
                    <span>بيانات الاعتماد السحابية (Meta Developers Cloud Keys):</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Phone Number ID:
                      </label>
                      <input
                        type="text"
                        value={settings.metaCloudApiConfig?.phoneNumberId || ''}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            metaCloudApiConfig: { ...s.metaCloudApiConfig, phoneNumberId: e.target.value },
                          }))
                        }
                        placeholder="10982347589234"
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        WABA ID (حساب الأعمال):
                      </label>
                      <input
                        type="text"
                        value={settings.metaCloudApiConfig?.wabaId || ''}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            metaCloudApiConfig: { ...s.metaCloudApiConfig, wabaId: e.target.value },
                          }))
                        }
                        placeholder="29834710928374"
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Permanent Access Token (الرمز الدائم):
                      </label>
                      <input
                        type="password"
                        value={settings.metaCloudApiConfig?.accessToken || ''}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            metaCloudApiConfig: { ...s.metaCloudApiConfig, accessToken: e.target.value },
                          }))
                        }
                        placeholder="EAAB..."
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles & Options */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={settings.autoFormatEgyptianNumbers !== false}
                    onChange={(e) => setSettings((s) => ({ ...s, autoFormatEgyptianNumbers: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      التنسيق التلقائي لأرقام المحمول المصرية
                    </span>
                    <span className="text-[10px] text-slate-500">
                      تحويل الأرقام التي تبدأ بـ (010, 011, 012, 015) تلقائياً إلى صيغة واتساب الدولية (2010...)
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={settings.autoAppendOfficeSignature !== false}
                    onChange={(e) => setSettings((s) => ({ ...s, autoAppendOfficeSignature: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      إلحاق توقيع المكتب وبيانات المحاسب القانوني في نهاية الرسائل
                    </span>
                    <span className="text-[10px] text-slate-500">
                      إضافة اسم المكتب، اسم المحاسب القانوني، وهاتف التواصل أسفل كل إشعار مالي أو مطالبة
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={settings.isAutoReplyEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, isAutoReplyEnabled: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      تفعيل روبوت ومحاكي الرد الآلي الذكي (WhatsApp Bot Simulator)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      الرد التلقائي على استفسارات مواقف الإقرارات، الفواتير، وسندات القبض في النظام
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Live Link Tester Panel (1 col) */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-5 text-white border border-slate-800 shadow-md space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white">اختبار وتجربة الرابط المباشر (Link Test)</h3>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  يمكنك تجربة فتح محادثة WhatsApp مباشرة باستخدام الرابط المهيأ والتأكد من توافقه مع جهازك وهاتفك.
                </p>

                <div className="space-y-3 mt-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">رقم الهاتف للاختبار:</label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="01003335360"
                      className="w-full p-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">نص الرسالة التجريبية:</label>
                    <textarea
                      rows={3}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full p-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTestWhatsAppDispatch(testPhone, testMessage)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>فتح واختبار WhatsApp الآن</span>
                </button>
                <span className="text-[10px] text-slate-400 text-center block">
                  سيتم فتح تطبيق واتساب أو واتساب ويب في نافذة جديدة
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CLIENT DEFAULT PHONES DIRECTORY */}
      {activeSubTab === 'CLIENT_PHONES' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="بحث باسم الشركة، الكود، أو رقم الهاتف..."
                className="w-full pl-3 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 outline-none font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setClientFilterStatus('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    clientFilterStatus === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  الكل ({state.clients.length})
                </button>
                <button
                  onClick={() => setClientFilterStatus('HAS_PHONE')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    clientFilterStatus === 'HAS_PHONE'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  أرقام مسجلة ({state.clients.filter((c) => !!c.phone).length})
                </button>
                <button
                  onClick={() => setClientFilterStatus('MISSING_PHONE')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    clientFilterStatus === 'MISSING_PHONE'
                      ? 'bg-white dark:bg-slate-700 text-rose-800 dark:text-rose-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  بدون هاتف ({state.clients.filter((c) => !c.phone).length})
                </button>
              </div>

              {dirtyClientsCount > 0 && (
                <button
                  onClick={handleBatchSaveClientPhones}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات ({dirtyClientsCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Clients Phone Directory Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                    <th className="p-3.5">العميل / الشركة</th>
                    <th className="p-3.5">الشخص المسؤول / المالية</th>
                    <th className="p-3.5">رقم هاتف WhatsApp الافتراضي</th>
                    <th className="p-3.5">شبكة المحمول / التحقق</th>
                    <th className="p-3.5 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredClients.map((client) => {
                    const editData = clientPhoneEdits[client.id] || {
                      phone: client.phone || '',
                      contactPerson: client.contactPerson || '',
                      isDirty: false,
                    };
                    const phone = editData.phone;

                    // Network indicator
                    let networkBadge = { label: 'غير محدد', color: 'bg-slate-100 text-slate-700' };
                    if (phone.startsWith('010') || phone.startsWith('2010')) {
                      networkBadge = { label: 'فودافون (Vodafone)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
                    } else if (phone.startsWith('011') || phone.startsWith('2011')) {
                      networkBadge = { label: 'اتصالات (e& Egypt)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                    } else if (phone.startsWith('012') || phone.startsWith('2012')) {
                      networkBadge = { label: 'أورنج (Orange)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
                    } else if (phone.startsWith('015') || phone.startsWith('2015')) {
                      networkBadge = { label: 'المصرية للاتصالات (WE)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
                    } else if (phone.length > 5) {
                      networkBadge = { label: 'دولي / أرضي', color: 'bg-blue-50 text-blue-700 border-blue-200' };
                    }

                    return (
                      <tr
                        key={client.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          editData.isDirty ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        {/* Company Name */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 font-bold text-xs">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {client.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {client.clientCode} | {client.legalStructure || 'شركة تجارية'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Person Input */}
                        <td className="p-3.5">
                          <input
                            type="text"
                            value={editData.contactPerson}
                            onChange={(e) => handleClientPhoneChange(client.id, 'contactPerson', e.target.value)}
                            placeholder="اسم المسؤول أو المدير المالي"
                            className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:bg-white dark:focus:bg-slate-900 outline-none"
                          />
                        </td>

                        {/* Phone Number Input */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-full">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <input
                                type="text"
                                value={editData.phone}
                                onChange={(e) => handleClientPhoneChange(client.id, 'phone', e.target.value)}
                                placeholder="010XXXXXXXX"
                                className="w-full bg-transparent font-mono font-bold text-xs outline-none text-slate-900 dark:text-slate-100"
                              />
                            </div>
                            {editData.isDirty && (
                              <button
                                onClick={() => handleSaveSingleClientPhone(client.id)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                                title="حفظ رقم هذا العميل"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Network Badge */}
                        <td className="p-3.5">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${networkBadge.color}`}
                          >
                            {networkBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Direct WhatsApp Test Button */}
                            <button
                              disabled={!phone}
                              onClick={() =>
                                handleTestWhatsAppDispatch(
                                  phone,
                                  `السادة / *${client.name}*\nتحية طيبة من مكتب المحاسب القانوني ومراقب الحسابات.\nنحيطكم علماً بأن قناة التواصل المباشرة عبر واتساب نشطة ومعتمدة طرفنا.`
                                )
                              }
                              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                                phone
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title="فتح محادثة واتساب تجريبية مع العميل"
                            >
                              <Send className="w-3 h-3" />
                              <span>واتساب</span>
                            </button>

                            {/* View In Archive */}
                            {onNavigateToArchive && (
                              <button
                                onClick={() => onNavigateToArchive(client.id)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="عرض ملف وسجل العميل في الأرشيف"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>الأرشيف</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: WHATSAPP MESSAGE TEMPLATES MANAGER */}
      {activeSubTab === 'TEMPLATES' && (
        <div className="space-y-4">
          {/* Templates Control Header */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                placeholder="بحث في أسماء ونصوص القوالب..."
                className="w-full pl-3 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 outline-none font-medium"
              />
            </div>

            {/* Category Filter & New Template Button */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              <select
                value={templateCategoryFilter}
                onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">جميع التصنيفات</option>
                <option value="INVOICE">فواتير ومطالبات أتعاب</option>
                <option value="TREASURY_RECEIPT">سندات قبض وخزينة</option>
                <option value="TAX_DEADLINE_REMINDER">تذكيرات المواعيد الضريبية</option>
                <option value="TAX_DECLARATION">إقرارات ضريبية</option>
                <option value="CERTIFICATE">شهادات مهنية</option>
                <option value="GENERAL">كشوف حسابات ومراسلات عامة</option>
              </select>

              <button
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
                  setIsEditingTemplateModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قالب جديد</span>
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((tmpl) => {
              const isDefault = tmpl.isDefault;
              const formattedSim = formatSampleSimulatedText(tmpl.templateBody);

              return (
                <div
                  key={tmpl.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{tmpl.title}</h4>
                          {isDefault && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              رسمي
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          كود القالب: <b>{tmpl.code}</b> | الموضوع: {tmpl.subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTemplateForEdit(tmpl);
                            setIsEditingTemplateModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          title="تعديل القالب والمتغيرات"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleCopy(tmpl.templateBody, tmpl.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="نسخ نص القالب"
                        >
                          {copiedText === tmpl.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {!isDefault && (
                          <button
                            onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="حذف القالب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text shadow-2xs max-h-48 overflow-y-auto">
                      {tmpl.templateBody}
                    </div>
                  </div>

                  {/* Footer Stats / Test */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      يدعم التعبئة الديناميكية للمبالغ وأسماء الشركات
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTemplateForEdit(tmpl);
                        setIsEditingTemplateModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      تعديل ومعاينة حية ←
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TEMPLATE EDIT MODAL */}
      {isEditingTemplateModalOpen && selectedTemplateForEdit && (
        <TemplateEditModal
          template={selectedTemplateForEdit}
          isOpen={isEditingTemplateModalOpen}
          onClose={() => {
            setIsEditingTemplateModalOpen(false);
            setSelectedTemplateForEdit(null);
          }}
          onSave={handleSaveTemplateModal}
          formatSimulatedText={formatSampleSimulatedText}
        />
      )}
    </div>
  );
};

// Modal for Editing / Creating a WhatsApp Template
interface TemplateEditModalProps {
  template: WhatsAppMessageTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tmpl: WhatsAppMessageTemplate) => void;
  formatSimulatedText: (rawText: string) => string;
}

const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  template,
  isOpen,
  onClose,
  onSave,
  formatSimulatedText,
}) => {
  const [title, setTitle] = useState(template.title);
  const [code, setCode] = useState(template.code);
  const [subject, setSubject] = useState(template.subject);
  const [category, setCategory] = useState<WhatsAppEventCategory>(template.category || 'GENERAL');
  const [body, setBody] = useState(template.templateBody);
  const [copiedSim, setCopiedSim] = useState(false);

  if (!isOpen) return null;

  const insertTag = (tag: string) => {
    setBody((prev) => prev + ` ${tag}`);
  };

  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      alert('يرجى التأكد من كتابة عنوان ونص القالب.');
      return;
    }
    onSave({
      ...template,
      title: title.trim(),
      code: code.trim(),
      subject: subject.trim(),
      category,
      templateBody: body,
      updatedAt: new Date().toISOString().slice(0, 16),
    });
  };

  const simulatedText = formatSimulatedText(body);

  const dynamicTags = [
    { tag: '{CLIENT_NAME}', label: 'اسم الشركة' },
    { tag: '{CONTACT_PERSON}', label: 'اسم المسؤول' },
    { tag: '{AMOUNT}', label: 'المبلغ المالي' },
    { tag: '{AMOUNT_WORDS}', label: 'المبلغ بالحروف' },
    { tag: '{BALANCE_DUE}', label: 'الرصيد المتبقي' },
    { tag: '{DOC_TITLE}', label: 'بيان المستند' },
    { tag: '{REF_CODE}', label: 'الرقم المرجعي' },
    { tag: '{DATE}', label: 'التاريخ' },
    { tag: '{PERIOD}', label: 'الفترة الضريبية/المالية' },
    { tag: '{OFFICE_NAME}', label: 'اسم المكتب' },
    { tag: '{AUDITOR_NAME}', label: 'المحاسب القانوني' },
    { tag: '{OFFICE_PHONE}', label: 'هاتف المكتب' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 text-right">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Edit3 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تعديل وتخصيص قالب رسالة واتساب</h3>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                تخصيص الصياغة المهنية وإدراج المتغيرات الذكية للربط المحاسبي المباشر.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                اسم وعنوان القالب:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مطالبة أتعاب وفاتورة مهنية"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                الكود المرجعي للقالب:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="INVOICE_CLAIM"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                التصنيف والنوع:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WhatsAppEventCategory)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="INVOICE">مطالبة أتعاب / فاتورة</option>
                <option value="TREASURY_RECEIPT">سند قبض خزينة</option>
                <option value="TAX_DEADLINE_REMINDER">تذكير موعد ضريبي</option>
                <option value="TAX_DECLARATION">إقرار ضريبي</option>
                <option value="CERTIFICATE">شهادة مهنية</option>
                <option value="GENERAL">كشف حساب / عام</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              الموضوع / العنوان المرجعي للسجل:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مطالبة بأتعاب الخدمات المحاسبية والضريبية"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          {/* Variable Tags Palette */}
          <div className="p-3 bg-indigo-50/50 dark:bg-slate-800/50 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-2">
            <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 block">
              المتغيرات الديناميكية الذكية (اضغط على المتغير لإدراجه داخل نص القالب):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {dynamicTags.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => insertTag(t.tag)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-100 hover:text-indigo-900 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-bold border border-indigo-200 dark:border-slate-600 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="font-mono text-indigo-600 dark:text-indigo-300">{t.tag}</span>
                  <span className="text-slate-500 text-[9px]">({t.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Two-Pane Editor & Realtime Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Editor */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                محرر نص القالب (Template Code):
              </label>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-900 dark:text-slate-100 leading-relaxed outline-none focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            {/* Realtime Simulation Preview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>معاينة حية مع تعويض البيانات الواقعية:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(simulatedText);
                    setCopiedSim(true);
                    setTimeout(() => setCopiedSim(false), 2000);
                  }}
                  className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedSim ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSim ? 'تم النسخ' : 'نسخ المعاينة'}</span>
                </button>
              </div>
              <div className="p-3.5 bg-emerald-950/5 dark:bg-slate-950 rounded-2xl border border-emerald-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-text shadow-inner h-[240px] overflow-y-auto">
                {simulatedText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ القالب</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
