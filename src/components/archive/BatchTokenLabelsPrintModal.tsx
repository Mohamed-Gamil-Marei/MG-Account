import React, { useState } from 'react';
import {
  X,
  Printer,
  Scissors,
  CheckSquare,
  Square,
  KeyRound,
  Building,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { ClientArchiveRecord } from '../../types';
import { DatabaseState } from '../../db/localDatabase';
import { PrintService } from '../../services/PrintService';

interface BatchTokenLabelsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientArchiveRecord[];
  officeProfile: DatabaseState['officeProfile'];
}

export const BatchTokenLabelsPrintModal: React.FC<BatchTokenLabelsPrintModalProps> = ({
  isOpen,
  onClose,
  clients,
  officeProfile,
}) => {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    clients.map((c) => c.id)
  );
  const [printPinOnLabels, setPrintPinOnLabels] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.taxCardNo?.includes(searchTerm)
  );

  const selectedClientsList = clients.filter((c) =>
    selectedClientIds.includes(c.id)
  );

  const handleToggleSelectAll = () => {
    if (selectedClientIds.length === filteredClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map((c) => c.id));
    }
  };

  const handleToggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePrintLabels = () => {
    PrintService.printElementById('batch-token-labels-a4-sheet', {
      title: `ليبلات_توقيعات_وتوكنات_العملاء_${new Date().toISOString().slice(0, 10)}`,
      pageSize: 'A4',
      orientation: 'portrait',
    });
  };

  const officePhone = officeProfile?.phone || '01003335360';
  const auditorName = officeProfile?.auditorName || 'محمد جميل مرعي';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-950/40">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                طباعة ليبلات ميدالية التوكن الجماعية (A4 Bulk Keyring Labels)
              </h3>
              <p className="text-xs text-slate-400">
                طباعة مقاس قياسي (4.8 سم × 2.0 سم) للعملاء المحددية مع خطوط القص والدليل البصري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintLabels}
              disabled={selectedClientsList.length === 0}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقة A4 ({selectedClientsList.length} ليبل)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls & Filter */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم العميل أو الكود..."
              className="w-full px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              {selectedClientIds.length === filteredClients.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>تحديد الكل ({filteredClients.length})</span>
            </button>

            <label className="flex items-center gap-2 text-xs font-bold text-amber-200 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/30 cursor-pointer">
              <input
                type="checkbox"
                checked={printPinOnLabels}
                onChange={(e) => setPrintPinOnLabels(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span>اطبع الرقم السري على الليبلات (غير مفعّل افتراضياً)</span>
            </label>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/60 flex flex-col items-center">
          
          {/* A4 Sheet Container */}
          <div
            id="batch-token-labels-a4-sheet"
            className="w-full max-w-[210mm] min-h-[296mm] bg-white text-slate-900 shadow-2xl p-[10mm] relative flex flex-col font-sans border border-slate-300 print:border-none print:shadow-none print:p-[8mm]"
            dir="rtl"
            style={{ fontFamily: 'Cairo, Tahoma, sans-serif' }}
          >
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-2 mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-sm font-black text-slate-950">
                  {officeProfile.firmName || officeProfile.officeName || 'مكتب المحاسب القانوني ومراقب الحسابات'}
                </h1>
                <p className="text-[10px] text-slate-600 font-bold">
                  كشف ليبلات ميدالية مفاتيح التوكنات والختم الإلكتروني للعملاء
                </p>
              </div>
              <div className="text-left text-[10px] text-slate-600 font-mono">
                <div>عدد الليبلات: <strong>{selectedClientsList.length}</strong></div>
                <div>المقاس: <strong>48mm × 20mm</strong></div>
              </div>
            </div>

            {/* Labels Grid: 4 columns for A4 */}
            {selectedClientsList.length === 0 ? (
              <div className="my-auto text-center py-12 text-slate-400 text-xs font-bold">
                يرجى تحديد عميل واحد على الأقل لطباعة ليبلات التوكن
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 items-start">
                {selectedClientsList.map((client) => {
                  const tokenCreds = client.portalCredentials?.eSignatureToken;
                  const tokenType = tokenCreds?.tokenType || 'E_SEAL';
                  const typeLabel =
                    tokenType === 'E_SEAL'
                      ? 'ختم'
                      : tokenType === 'E_SIGNATURE'
                      ? 'توقيع'
                      : 'ختم وتوقيع';
                  const pinVal = printPinOnLabels ? (tokenCreds?.pin || '••••••') : '••••••';
                  const expiry = tokenCreds?.expiryDate || '—';

                  return (
                    <div
                      key={client.id}
                      className="border border-dashed border-slate-400 p-1 bg-slate-50/50 rounded flex flex-col justify-between"
                      style={{
                        width: '48mm',
                        height: '21mm',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div className="border border-slate-900 rounded p-1 bg-white flex flex-col justify-between h-full">
                        <div className="flex items-start justify-between border-b border-slate-900 pb-0.5 leading-none">
                          <span className="text-[8px] font-black truncate max-w-[34mm] text-slate-950">
                            {client.name}
                          </span>
                          <span className="text-[7px] font-mono font-bold bg-slate-900 text-white px-1 rounded-sm">
                            {typeLabel}
                          </span>
                        </div>

                        <div className="my-auto text-center py-0.5">
                          <div className="text-[7px] text-slate-600 font-bold leading-none mb-0.5">
                            PIN التوكن ({expiry}):
                          </div>
                          <div className="text-[11px] font-mono font-black text-rose-700 tracking-wider leading-none">
                            {pinVal}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[6.5px] text-slate-600 pt-0.5 border-t border-slate-300 leading-none">
                          <span className="font-mono">{officePhone}</span>
                          <span>{auditorName.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-slate-300 text-[9px] text-slate-500 flex items-center justify-between">
              <span>✂️ يرجى قص كل مستطيل بحسب خطوط القص المنقطة وتثبيته داخل ميدالية المفاتيح.</span>
              <span className="font-mono">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>طباعة موحدة ومضمونة لليبلات التوكنات لعملاء المكتب</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
