import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  Plus,
  CheckCircle2,
  Filter,
  Search,
  Building,
  Briefcase,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { db, DatabaseState } from '../../db/localDatabase';
import { ClientArchiveRecord } from '../../types';
import { QuickCompanyModal } from './QuickCompanyModal';

interface CompanyHeaderSelectorProps {
  state: DatabaseState;
  selectedClientId?: string | null;
  onSelectClient?: (client: ClientArchiveRecord | null) => void;
  title?: string;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
}

export const CompanyHeaderSelector: React.FC<CompanyHeaderSelectorProps> = ({
  state,
  selectedClientId,
  onSelectClient,
  title = 'الشركة المستهدفة في العمليات:',
  allowAllOption = true,
  allOptionLabel = 'عرض شامل (كافة الشركات والقيود العامة)',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentClientId = selectedClientId !== undefined ? selectedClientId : state.activeClientContext?.clientId;
  const activeClient = state.clients.find((c) => c.id === currentClientId);

  const q = (searchTerm || '').toLowerCase().trim();
  const filteredClients = (state.clients || []).filter(
    (c) =>
      !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.taxCardNo && c.taxCardNo.includes(searchTerm)) ||
      (c.clientCode && c.clientCode.toLowerCase().includes(q)) ||
      (c.activity && c.activity.toLowerCase().includes(q))
  );

  const handleSelect = (client: ClientArchiveRecord | null) => {
    db.setActiveClient(client ? client.id : null, { autoFilter: true });
    if (onSelectClient) {
      onSelectClient(client);
    }
    setIsOpen(false);
  };

  const handleCompanyCreated = (newClient: ClientArchiveRecord) => {
    db.setActiveClient(newClient.id, { autoFilter: true });
    if (onSelectClient) {
      onSelectClient(newClient);
    }
  };

  return (
    <>
      <div className={`relative inline-block text-right ${className}`}>
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-block">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all border border-slate-700/60"
            >
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[280px] truncate">
                <span className="truncate">
                  {activeClient ? activeClient.name : allOptionLabel}
                </span>
                {activeClient?.taxCardNo && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded-sm shrink-0">
                    {activeClient.taxCardNo}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              title="إضافة وتأسيس شركة جديدة"
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-80 sm:w-96 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3 animate-in fade-in zoom-in-95 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                اختيار وتحديد الشركة النشطة
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsQuickAddOpen(true);
                }}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>شركة جديدة</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الشركة، الرقم الضريبي، أو الكود..."
                className="w-full text-xs pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
              {allowAllOption && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`w-full text-right p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    !currentClientId
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>{allOptionLabel}</span>
                  </div>
                  {!currentClientId && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </button>
              )}

              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  لا توجد نتائج مطابقة للبحث
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = client.id === currentClientId;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelect(client)}
                      className={`w-full text-right p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-bold'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold line-clamp-1">{client.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>الضريبي: {client.taxCardNo || 'غير مسجل'}</span>
                        <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-sm">
                          {client.clientCode}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <QuickCompanyModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onCompanyCreated={handleCompanyCreated}
      />
    </>
  );
};
