import React, { useState } from 'react';
import {
  FolderArchive,
  Building2,
  Search,
  CheckCircle2,
  FolderPlus,
  FileText,
  UserCheck,
  X,
  Sparkles,
  ShieldCheck,
  Tag,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { ClientArchiveRecord, JournalEntry } from '../../types';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export interface ClientReportEntrySummary {
  serialNumber?: string;
  description: string;
  currency?: string;
  exchangeRate?: number;
  totalDebit: number;
  totalCredit?: number;
  linesCount?: number;
  date: string;
}

interface ClientSelectionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state?: DatabaseState;
  clients?: ClientArchiveRecord[];
  activeClientId?: string;
  entrySummary?: ClientReportEntrySummary;
  entryData?: {
    date: string;
    description: string;
    currency?: string;
    exchangeRate?: number;
    totalDebit: number;
    totalCredit?: number;
    lines?: any[];
    serialNumber?: string;
  };
  onConfirm: (client: ClientArchiveRecord, folderName: string, notes?: string, setAsActive?: boolean) => void;
  title?: string;
}

export const ClientSelectionReportModal: React.FC<ClientSelectionReportModalProps> = ({
  isOpen,
  onClose,
  state,
  clients,
  activeClientId,
  entrySummary,
  entryData,
  onConfirm,
  title = 'حفظ وتوثيق القيد كتقرير رسمي بملف العميل في الأرشيف',
}) => {
  const allClients = clients || state?.clients || db.getState().clients || [];
  const currentActiveId = activeClientId || state?.activeClientContext?.clientId || db.getState().activeClientContext?.clientId;
  const initialSelectedClientId = currentActiveId || (allClients.length > 0 ? allClients[0].id : '');

  const [selectedClientId, setSelectedClientId] = useState<string>(initialSelectedClientId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('سندات القيود والتقارير المالية');
  const [customFolderName, setCustomFolderName] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [setAsActiveClient, setSetAsActiveClient] = useState(true);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);

  if (!isOpen) return null;

  const displayEntry = entrySummary || entryData || {
    description: 'قيد محاسبي معتمد',
    totalDebit: 0,
    totalCredit: 0,
    currency: 'EGP',
    date: new Date().toISOString().slice(0, 10),
  };

  const selectedClient = allClients.find((c) => c.id === selectedClientId);

  const filteredClients = allClients.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.clientCode || '').toLowerCase().includes(term) ||
      (c.taxCardNo && c.taxCardNo.includes(term)) ||
      (c.commercialRegistrationNo && c.commercialRegistrationNo.includes(term)) ||
      (c.activityType && c.activityType.toLowerCase().includes(term))
    );
  });

  const availableFolders = [
    'سندات القيود والتقارير المالية',
    'دفاتر الأستاذ واليومية العامة',
    'القوائم المالية والحسابات الختامية',
    'المستندات المحاسبية الدورية',
    ...(selectedClient?.folders?.map((f) => f.name) || []),
  ];
  // Deduplicate
  const uniqueFolders = Array.from(new Set(availableFolders));

  const handleConfirm = () => {
    if (!selectedClient) {
      alert('يرجى اختيار العميل من القائمة لربط القيد بملفه بالأرشيف');
      return;
    }

    const folderToUse = isCreatingNewFolder && customFolderName.trim() ? customFolderName.trim() : selectedFolder;

    onConfirm(selectedClient, folderToUse, reportNotes, setAsActiveClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/40 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-xs">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{title}</h3>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">
                ربط القيد المحاسبي بالملف النشط للعميل وتوثيقه كتقرير معتمد في الأرشيف الإلكتروني
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">
          {/* Quick Summary of Journal Entry to be Archived */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-xs">
                  {displayEntry.serialNumber ? `قيد رقم: ${displayEntry.serialNumber}` : 'قيد يومية جديد'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">({displayEntry.date})</span>
                {displayEntry.currency && displayEntry.currency !== 'EGP' && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold">
                    {displayEntry.currency}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-1">{displayEntry.description || 'بدون بيان'}</p>
            </div>
            <div className="text-left shrink-0">
              <div className="text-[10px] text-slate-500 font-bold">إجمالي المبلغ:</div>
              <div className="font-mono font-black text-emerald-950 text-sm">
                {formatEgyptianCurrency(displayEntry.totalDebit)}
              </div>
            </div>
          </div>

          {/* 1. Client Selection with Live Search */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                اختر العميل لربطه بالقيد والأرشيف *
              </span>
              <span className="text-[11px] text-slate-500">
                ({filteredClients.length} عميل متاح في الأرشيف)
              </span>
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم العميل، كود الملف، البطاقة الضريبية، السجل التجاري..."
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Client List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-slate-400">لا يوجد عميل يطابق معايير البحث</div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = client.id === selectedClientId;
                  const isPermanent =
                    (client.relationshipType || (client.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY')) ===
                    'PERMANENT';

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full text-right p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                          : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold">{client.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-sm font-semibold shrink-0 ${
                              isPermanent
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPermanent ? 'دائم' : 'مؤقت'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-3">
                          <span className="font-mono">{client.clientCode}</span>
                          {client.taxCardNo && <span>ب.ض: {client.taxCardNo}</span>}
                          {client.activityType && <span className="truncate">{client.activityType}</span>}
                        </div>
                      </div>

                      <div className="shrink-0 pl-1">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Target Archive Folder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4 text-teal-700" />
                مجلد حفظ التقرير في أرشيف العميل
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewFolder(!isCreatingNewFolder)}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{isCreatingNewFolder ? 'اختيار من المجلدات الحالية' : 'إنشاء مجلد مخصص'}</span>
              </button>
            </div>

            {isCreatingNewFolder ? (
              <input
                type="text"
                value={customFolderName}
                onChange={(e) => setCustomFolderName(e.target.value)}
                placeholder="اكتب اسم المجلد الجديد (مثال: قيود الربع الأول 2026)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
            ) : (
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
              >
                {uniqueFolders.map((fld) => (
                  <option key={fld} value={fld}>
                    📂 {fld}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Report Notes / Purpose */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات توثيق التقرير (اختياري)</label>
            <input
              type="text"
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              placeholder="مثال: تم إعداد القيد وإرفاقه بملف إقفال الربع المالي للمراجعة الضريبية..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* 4. Active Context Checkbox */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
              <input
                type="checkbox"
                checked={setAsActiveClient}
                onChange={(e) => setSetAsActiveClient(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>تعيين هذا العميل كـ "العميل النشط" الحالي في المنظومة</span>
            </label>
            <span className="text-[10px] text-slate-500">يتيح التصفية التلقائية لسجلات هذا العميل فوراً</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedClient}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileCheck className="w-4 h-4" />
            <span>تأكيد الربط وتوثيق التقرير بالأرشيف</span>
          </button>
        </div>
      </div>
    </div>
  );
};
