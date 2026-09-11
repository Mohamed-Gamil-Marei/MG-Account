import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Check,
  Save,
  ExternalLink,
  Building2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';

interface ClientPhoneEdit {
  phone: string;
  contactPerson: string;
  isDirty: boolean;
}

interface WhatsAppClientPhonesDirectoryProps {
  state: DatabaseState;
  onNavigateToArchive?: (clientId?: string) => void;
}

export const WhatsAppClientPhonesDirectory: React.FC<WhatsAppClientPhonesDirectoryProps> = ({
  state,
  onNavigateToArchive,
}) => {
  const [clientPhoneEdits, setClientPhoneEdits] = useState<Record<string, ClientPhoneEdit>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'HAS_PHONE' | 'MISSING_PHONE'>('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Initialize edits
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

  const handlePhoneChange = (clientId: string, field: 'phone' | 'contactPerson', value: string) => {
    setClientPhoneEdits((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: value,
        isDirty: true,
      },
    }));
  };

  const handleSaveSingle = (clientId: string) => {
    const edit = clientPhoneEdits[clientId];
    if (!edit) return;
    const client = state.clients.find((c) => c.id === clientId);
    if (!client) return;

    db.updateClient(clientId, {
      phone: edit.phone.trim(),
      contactPerson: edit.contactPerson.trim(),
    });

    setClientPhoneEdits((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], isDirty: false },
    }));

    setFeedback(`تم حفظ بيانات هاتف العميل "${client.name}" بنجاح.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const dirtyClientsCount = useMemo(() => {
    return (Object.values(clientPhoneEdits) as ClientPhoneEdit[]).filter((e) => e.isDirty).length;
  }, [clientPhoneEdits]);

  const handleBatchSave = () => {
    let count = 0;
    (Object.entries(clientPhoneEdits) as [string, ClientPhoneEdit][]).forEach(([clientId, edit]) => {
      if (edit.isDirty) {
        db.updateClient(clientId, {
          phone: edit.phone.trim(),
          contactPerson: edit.contactPerson.trim(),
        });
        count++;
      }
    });

    setClientPhoneEdits((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id]) next[id].isDirty = false;
      });
      return next;
    });

    setFeedback(`تم حفظ أرقام وتعديلات ${count} من العملاء بنجاح.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredClients = useMemo(() => {
    return state.clients.filter((c) => {
      const edit = clientPhoneEdits[c.id] || { phone: c.phone || '', contactPerson: c.contactPerson || '' };
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(q)) ||
        edit.phone.includes(q) ||
        edit.contactPerson.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterStatus === 'HAS_PHONE') return !!edit.phone.trim();
      if (filterStatus === 'MISSING_PHONE') return !edit.phone.trim();
      return true;
    });
  }, [state.clients, clientPhoneEdits, searchQuery, filterStatus]);

  return (
    <div className="space-y-3.5">
      {feedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Control Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الشركة، الكود، أو رقم الهاتف..."
            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 outline-none"
          />
        </div>

        {/* Filter Pills & Batch Save */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              الكل ({state.clients.length})
            </button>
            <button
              onClick={() => setFilterStatus('HAS_PHONE')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterStatus === 'HAS_PHONE'
                  ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              أرقام مسجلة ({state.clients.filter((c) => !!c.phone).length})
            </button>
            <button
              onClick={() => setFilterStatus('MISSING_PHONE')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterStatus === 'MISSING_PHONE'
                  ? 'bg-white dark:bg-slate-700 text-rose-800 dark:text-rose-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              بدون هاتف ({state.clients.filter((c) => !c.phone).length})
            </button>
          </div>

          {dirtyClientsCount > 0 && (
            <button
              onClick={handleBatchSave}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات ({dirtyClientsCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                <th className="p-3">العميل / الشركة</th>
                <th className="p-3">الشخص المسؤول / المالية</th>
                <th className="p-3">رقم هاتف WhatsApp المعتمد</th>
                <th className="p-3">شبكة المحمول</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredClients.map((client) => {
                const edit = clientPhoneEdits[client.id] || {
                  phone: client.phone || '',
                  contactPerson: client.contactPerson || '',
                  isDirty: false,
                };
                const phone = edit.phone;

                // Network indicator
                let networkBadge = { label: 'غير محدد', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' };
                if (phone.startsWith('010') || phone.startsWith('2010')) {
                  networkBadge = { label: 'فودافون (Vodafone)', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' };
                } else if (phone.startsWith('011') || phone.startsWith('2011')) {
                  networkBadge = { label: 'اتصالات (e& Egypt)', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' };
                } else if (phone.startsWith('012') || phone.startsWith('2012')) {
                  networkBadge = { label: 'أورنج (Orange)', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' };
                } else if (phone.startsWith('015') || phone.startsWith('2015')) {
                  networkBadge = { label: 'المصرية للاتصالات (WE)', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' };
                } else if (phone.length > 5) {
                  networkBadge = { label: 'دولي / أرضي', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' };
                }

                return (
                  <tr
                    key={client.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      edit.isDirty ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Name */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 font-bold text-xs">
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

                    {/* Contact Person */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={edit.contactPerson}
                        onChange={(e) => handlePhoneChange(client.id, 'contactPerson', e.target.value)}
                        placeholder="اسم المسؤول المالي"
                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:bg-white dark:focus:bg-slate-900 outline-none"
                      />
                    </td>

                    {/* Phone Input */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-full">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <input
                            type="text"
                            value={edit.phone}
                            onChange={(e) => handlePhoneChange(client.id, 'phone', e.target.value)}
                            placeholder="010XXXXXXXX"
                            className="w-full bg-transparent font-mono font-bold text-xs outline-none text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        {edit.isDirty && (
                          <button
                            onClick={() => handleSaveSingle(client.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                            title="حفظ التعديل لهذا العميل"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Network Badge */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${networkBadge.color}`}>
                        {networkBadge.label}
                      </span>
                    </td>

                    {/* Action Tools */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {edit.phone && (
                          <a
                            href={`https://wa.me/${edit.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1"
                            title="فتح في واتساب ويب"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>واتساب</span>
                          </a>
                        )}

                        {onNavigateToArchive && (
                          <button
                            onClick={() => onNavigateToArchive(client.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="عرض ملف العميل في الأرشيف"
                          >
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
  );
};
