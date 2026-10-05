import React, { useState } from 'react';
import { Printer, X, Layout, QrCode } from 'lucide-react';
import { PrintExportSettingsPanel } from './PrintExportSettingsPanel';
import { PrintExportSettingsUnit } from './PrintExportSettingsUnit';

interface PrintExportControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialSubTab?: 'HEADER_LOGO_REPORTS' | 'QR_SEAL_MARGINS';
}

export const PrintExportControlModal: React.FC<PrintExportControlModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialSubTab = 'HEADER_LOGO_REPORTS',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'HEADER_LOGO_REPORTS' | 'QR_SEAL_MARGINS'>(initialSubTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعدادات وأساليب الطباعة والتصدير والـ QR</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصيص ترويسة التقارير، إضافة شعار المكتب، وتنسيق الورق الافتراضي (A4/Portrait/Landscape) لكل تقرير
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Switcher Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('HEADER_LOGO_REPORTS')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'HEADER_LOGO_REPORTS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>الترويسة والشعار وتنسيق الورق لكل تقرير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('QR_SEAL_MARGINS')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'QR_SEAL_MARGINS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>باركود التحقق (QR) والأختام والعلامة المائية</span>
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeSubTab === 'HEADER_LOGO_REPORTS' ? (
            <PrintExportSettingsUnit showHeader={false} onSaved={onSaved} />
          ) : (
            <PrintExportSettingsPanel onSaved={onSaved} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">التعديلات تُحفظ وتُطبق تلقائياً محلياً على كافة شاشات ومستندات المنظومة.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            تم وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
