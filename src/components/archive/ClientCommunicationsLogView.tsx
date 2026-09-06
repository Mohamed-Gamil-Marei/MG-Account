import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Calendar,
  CheckCheck,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  User,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  FileSpreadsheet,
  Receipt,
  FileCheck2,
  Clock,
  Sparkles,
  Phone,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ClientArchiveRecord, WhatsAppMessage, WhatsAppEventCategory } from '../../types';
import { db } from '../../db/localDatabase';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface ClientCommunicationsLogViewProps {
  client: ClientArchiveRecord;
  onOpenNotifyModal?: () => void;
  onOpenDocShareModal?: () => void;
}

export const ClientCommunicationsLogView: React.FC<ClientCommunicationsLogViewProps> = ({
  client,
  onOpenNotifyModal,
  onOpenDocShareModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'OUTGOING' | 'INCOMING'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Retrieve client's WhatsApp messages from local database
  const allMessages = db.getWhatsAppMessages(client.id);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return allMessages
      .filter((msg) => {
        const matchesSearch =
          msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (msg.mediaPayload?.title && msg.mediaPayload.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (msg.mediaPayload?.referenceCode && msg.mediaPayload.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          filterCategory === 'ALL' || msg.category === filterCategory;

        const matchesDirection =
          filterDirection === 'ALL' || msg.direction === filterDirection;

        return matchesSearch && matchesCategory && matchesDirection;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allMessages, searchQuery, filterCategory, filterDirection]);

  // Statistics
  const totalSent = allMessages.filter((m) => m.direction === 'OUTGOING').length;
  const totalReceived = allMessages.filter((m) => m.direction === 'INCOMING').length;
  const totalInvoicesSent = allMessages.filter((m) => m.category === 'INVOICE' || m.mediaPayload?.type === 'INVOICE').length;
  const totalReceiptsSent = allMessages.filter((m) => m.category === 'TREASURY_RECEIPT' || m.mediaPayload?.type === 'RECEIPT').length;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteMessage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا السجل من محفوظات التواصل للرقابة؟')) {
      db.deleteWhatsAppMessage(id);
    }
  };

  const getCategoryBadge = (cat?: WhatsAppEventCategory) => {
    switch (cat) {
      case 'INVOICE':
        return { label: 'فاتورة / مطالبة أتعاب', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Receipt };
      case 'TREASURY_RECEIPT':
        return { label: 'إيصال وسند قبض', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: CheckCheck };
      case 'TAX_DECLARATION':
        return { label: 'إقرار ضريبي معتمد', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: FileCheck2 };
      case 'TAX_DEADLINE_REMINDER':
        return { label: 'تذكير موعد ضريبي', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock };
      case 'PROCEDURE_UPDATE':
        return { label: 'مستجدات إجراء', bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: FileSpreadsheet };
      case 'CERTIFICATE':
        return { label: 'شهادة دخل / مالي', bg: 'bg-teal-50 text-teal-800 border-teal-200', icon: ShieldCheck };
      case 'BOT_AUTO_REPLY':
      case 'INTERACTIVE_BOT_MENU':
        return { label: 'رد بوت آلي', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Bot };
      case 'GENERAL':
      default:
        return { label: 'رسالة وتواصل عام', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: MessageSquare };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">سجل التواصل والرقابة المهنية (WhatsApp Audit Trail)</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                {allMessages.length} مراسلة موثقة
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              توثيق تاريخي كامل لكافة الرسائل والإشعارات والمستندات المالية المرسلة لشركة {client.name} لضمان الشفافية والمتابعة.
            </p>
          </div>
        </div>

        {/* Quick Action Trigger Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          {onOpenDocShareModal && (
            <button
              onClick={onOpenDocShareModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال مستند مالي عبر واتساب</span>
            </button>
          )}

          {onOpenNotifyModal && (
            <button
              onClick={onOpenNotifyModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs border border-white/20 transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>إشعار سريع بالقوالب</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">إجمالي الصادر (مكتب)</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{totalSent}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">الوارد من العميل</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{totalReceived}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">فواتير ومطالبات</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{totalInvoicesSent}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">إيصالات وسندات قبض</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{totalReceiptsSent}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في محتوى الرسائل، الأرقام المرجعية، أو المبالغ..."
            className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterDirection === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterDirection('OUTGOING')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterDirection === 'OUTGOING' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              صادر 📤
            </button>
            <button
              onClick={() => setFilterDirection('INCOMING')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterDirection === 'INCOMING' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              وارد 📥
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">جميع التصنيفات</option>
            <option value="INVOICE">فواتير ومطالبات أتعاب</option>
            <option value="TREASURY_RECEIPT">سندات قبض وإيصالات</option>
            <option value="TAX_DECLARATION">إقرارات ضريبية</option>
            <option value="TAX_DEADLINE_REMINDER">تذكيرات المواعيد</option>
            <option value="PROCEDURE_UPDATE">مستجدات المعاملات</option>
            <option value="CERTIFICATE">شهادات مهنية</option>
            <option value="GENERAL">مراسلات عامة</option>
          </select>
        </div>
      </div>

      {/* Communications Timeline List */}
      {filteredMessages.length > 0 ? (
        <div className="space-y-3">
          {filteredMessages.map((msg) => {
            const isOutgoing = msg.direction === 'OUTGOING';
            const categoryMeta = getCategoryBadge(msg.category);
            const CategoryIcon = categoryMeta.icon;

            return (
              <div
                key={msg.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isOutgoing
                    ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                    : 'bg-slate-50/80 border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryMeta.bg}`}
                    >
                      <CategoryIcon className="w-3 h-3" />
                      <span>{categoryMeta.label}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOutgoing ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isOutgoing ? '📤 صادر من المكتب' : '📥 وارد من العميل'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      بواسطة: {msg.sender === 'AUDITOR' ? 'المحاسب القانوني' : msg.sender === 'OFFICE_BOT' ? 'المساعد الآلي (Bot)' : 'العميل'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{msg.timestamp}</span>
                    </span>

                    {/* Quick Copy */}
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                      title="نسخ نص الرسالة"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete entry */}
                    <button
                      onClick={(e) => handleDeleteMessage(msg.id, e)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="حذف من السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Media / Attachment Box if exists */}
                {msg.mediaPayload && (
                  <div className="mb-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/40 border border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        {msg.mediaPayload.type === 'INVOICE' ? (
                          <Receipt className="w-4 h-4" />
                        ) : msg.mediaPayload.type === 'RECEIPT' ? (
                          <CheckCheck className="w-4 h-4" />
                        ) : (
                          <FileCheck2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {msg.mediaPayload.title || 'مستند مالي مرفق'}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono mt-0.5">
                          {msg.mediaPayload.referenceCode && (
                            <span>كود المرجع: <b>{msg.mediaPayload.referenceCode}</b></span>
                          )}
                          {msg.mediaPayload.receiptNumber && (
                            <span>رقم السند: <b>{msg.mediaPayload.receiptNumber}</b></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {msg.mediaPayload.amount !== undefined && (
                      <div className="text-left bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">القيمة المالية</span>
                        <span className="font-bold text-emerald-800 text-xs font-mono">
                          {formatEgyptianCurrency(msg.mediaPayload.amount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/50 p-3 rounded-xl border border-slate-100 select-text">
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h5 className="text-xs font-bold text-slate-700">لا توجد سجلات تواصل تطابق البحث</h5>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            لم يتم تسجيل أي محادثات أو إشعارات مطابقة لمعايير الفلترة المحددة. يمكنك إرسال إشعار أو مستند الآن للتوثيق.
          </p>
          {onOpenDocShareModal && (
            <button
              onClick={onOpenDocShareModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال مستند مالي للعميل الآن</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
