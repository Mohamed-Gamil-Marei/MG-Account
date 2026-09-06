import React, { useState } from 'react';
import {
  Building2,
  Users,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRightLeft,
  X,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Clock,
  Briefcase,
} from 'lucide-react';
import { DatabaseState, db } from '../../db/localDatabase';
import { ClientArchiveRecord, ClientRelationshipType } from '../../types';

interface ClientSelectorProps {
  state: DatabaseState;
  onClientChange?: (clientId: string | null) => void;
  showAutoFilterToggle?: boolean;
  variant?: 'compact' | 'expanded' | 'banner';
  className?: string;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  state,
  onClientChange,
  showAutoFilterToggle = true,
  variant = 'banner',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PERMANENT' | 'TEMPORARY'>('ALL');

  const activeContext = state.activeClientContext;
  const activeClient: ClientArchiveRecord | undefined = state.clients.find(
    (c) => c.id === activeContext?.clientId
  );

  const filteredClients = state.clients.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.taxCardNo && c.taxCardNo.includes(searchTerm)) ||
      (c.commercialRegistrationNo && c.commercialRegistrationNo.includes(searchTerm));

    const relType: ClientRelationshipType =
      c.relationshipType || (c.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY');

    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'PERMANENT' && relType === 'PERMANENT') ||
      (filterType === 'TEMPORARY' && relType === 'TEMPORARY');

    return matchesSearch && matchesFilter;
  });

  const handleSelectClient = (clientId: string | null) => {
    db.setActiveClient(clientId);
    if (onClientChange) {
      onClientChange(clientId);
    }
    setIsOpen(false);
  };

  const handleToggleAutoFilter = () => {
    db.toggleActiveClientAutoFilter();
  };

  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-xs"
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="max-w-[150px] truncate text-slate-800 dark:text-slate-200">
            {activeClient ? activeClient.name : 'جميع ملفات العملاء'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-3 animate-in fade-in zoom-in-95">
            <div className="mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في سجلات العملاء..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1">
              <button
                onClick={() => handleSelectClient(null)}
                className={`w-full text-right p-2 rounded-xl text-xs flex items-center justify-between ${
                  !activeContext?.clientId
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 font-bold border border-indigo-200'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>جميع العملاء (عرض شامل لكافة السجلات)</span>
                {!activeContext?.clientId && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
              {filteredClients.map((client) => {
                const isCurrent = client.id === activeContext?.clientId;
                const isPermanent =
                  (client.relationshipType || (client.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY')) === 'PERMANENT';
                return (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client.id)}
                    className={`w-full text-right p-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-300 dark:border-indigo-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{client.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-sm shrink-0 ${
                            isPermanent
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {isPermanent ? 'دائم' : 'مؤقت'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{client.clientCode}</div>
                    </div>
                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Banner (Default on top of Hubs)
  const isPermanent =
    activeClient &&
    (activeClient.relationshipType || (activeClient.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY')) === 'PERMANENT';

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 border border-slate-200 dark:border-slate-800 shadow-2xs mb-3.5 transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left Section: Active Client Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/50">
            <Building2 className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
              العميل النشط:
            </span>
            {activeClient ? (
              <>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activeClient.name}
                </h3>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  {activeClient.clientCode}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                    isPermanent
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {isPermanent ? 'دائم' : 'مؤقت'}
                </span>
                {activeClient.taxCardNo && (
                  <span className="text-[10px] text-slate-400 font-mono hidden lg:inline-block">
                    (بطاقة: {activeClient.taxCardNo})
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                عرض شامل (كافة الشركات والقيود)
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Actions & Dropdown trigger */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {showAutoFilterToggle && activeClient && (
            <button
              onClick={handleToggleAutoFilter}
              title="تصفية تلقائية لعرض القيود والتقارير الخاصة بهذا العميل فقط"
              className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeContext?.autoFilterAccountingData
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span className="text-[11px]">
                {activeContext?.autoFilterAccountingData ? 'تصفية مفعلة' : 'عرض الكل'}
              </span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>تغيير</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isOpen && (
              <div className="absolute left-0 sm:right-auto md:left-0 top-full mt-2 w-84 sm:w-96 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3.5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      اختيار الكيان / العميل من الأرشيف
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter and Search */}
                <div className="space-y-2 mb-2.5">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث بالاسم، الكود، السجل أو البطاقة..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${
                        filterType === 'ALL'
                          ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200'
                      }`}
                    >
                      الكل ({state.clients.length})
                    </button>
                    <button
                      onClick={() => setFilterType('PERMANENT')}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${
                        filterType === 'PERMANENT'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      عملاء دائمون
                    </button>
                    <button
                      onClick={() => setFilterType('TEMPORARY')}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${
                        filterType === 'TEMPORARY'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 border-amber-200'
                      }`}
                    >
                      عملاء مؤقتون
                    </button>
                  </div>
                </div>

                {/* Clients List */}
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                  <button
                    onClick={() => handleSelectClient(null)}
                    className={`w-full text-right p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                      !activeContext?.clientId
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 font-bold border border-indigo-300 dark:border-indigo-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div>
                      <span className="font-bold">عرض شامل (بدون تخصيص عميل)</span>
                      <p className="text-[10px] text-slate-400">إظهار كافة القيود والعمليات المجمعة</p>
                    </div>
                    {!activeContext?.clientId && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </button>

                  {filteredClients.map((client) => {
                    const isCurrent = client.id === activeContext?.clientId;
                    const clientRelType =
                      client.relationshipType || (client.clientType === 'PRIMARY' ? 'PERMANENT' : 'TEMPORARY');
                    const isPerm = clientRelType === 'PERMANENT';

                    return (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client.id)}
                        className={`w-full text-right p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-400 dark:border-indigo-600 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pl-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate text-slate-900 dark:text-slate-100">
                              {client.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 ${
                                isPerm
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200'
                              }`}
                            >
                              {isPerm ? 'دائم' : 'مؤقت'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>كود: {client.clientCode}</span>
                            {client.taxCardNo && <span>| ضريبي: {client.taxCardNo}</span>}
                          </div>
                        </div>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}

                  {filteredClients.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      لا يوجد عملاء يطابقون معايير البحث
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
