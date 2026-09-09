import React from 'react';
import { Layers, CheckCircle2, SlidersHorizontal, Hash, AlertCircle } from 'lucide-react';

export interface PageRangeConfig {
  mode: 'ALL' | 'RANGE' | 'CUSTOM';
  fromPage: number;
  toPage: number;
  customPagesString?: string; // e.g. "1, 3, 5-7"
  showPageNumbers: boolean;
  resequencePageNumbers?: boolean; // When true, renumbers footers 1..N based on selected pages
}

interface PageRangeSelectorProps {
  totalPages: number;
  config: PageRangeConfig;
  onChange: (newConfig: PageRangeConfig) => void;
  pageTitles?: { pageNumber: number; title: string }[];
  className?: string;
  compact?: boolean;
}

export const PageRangeSelector: React.FC<PageRangeSelectorProps> = ({
  totalPages,
  config,
  onChange,
  pageTitles = [],
  className = '',
  compact = false,
}) => {
  const safeTotal = Math.max(1, totalPages);

  const handleModeChange = (mode: 'ALL' | 'RANGE' | 'CUSTOM') => {
    onChange({
      ...config,
      mode,
      fromPage: mode === 'ALL' ? 1 : config.fromPage,
      toPage: mode === 'ALL' ? safeTotal : config.toPage,
    });
  };

  const handleFromChange = (val: number) => {
    const num = Math.min(Math.max(1, val || 1), safeTotal);
    const validTo = Math.max(num, config.toPage);
    onChange({
      ...config,
      fromPage: num,
      toPage: Math.min(validTo, safeTotal),
    });
  };

  const handleToChange = (val: number) => {
    const num = Math.min(Math.max(1, val || 1), safeTotal);
    const validFrom = Math.min(num, config.fromPage);
    onChange({
      ...config,
      fromPage: Math.max(1, validFrom),
      toPage: num,
    });
  };

  // Quick preset helper
  const selectQuickRange = (from: number, to: number) => {
    onChange({
      ...config,
      mode: 'RANGE',
      fromPage: Math.max(1, from),
      toPage: Math.min(to, safeTotal),
    });
  };

  // Calculate selected count
  let selectedCount = safeTotal;
  if (config.mode === 'RANGE') {
    selectedCount = Math.max(0, config.toPage - config.fromPage + 1);
  } else if (config.mode === 'CUSTOM') {
    // parse custom
    const parsed = parseCustomPageString(config.customPagesString || '', safeTotal);
    selectedCount = parsed.length;
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 text-xs shadow-xs space-y-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>تحديد نطاق وترقيم الصفحات للطباعة والمعاينة والتصدير</span>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-full font-bold">
                (إجمالي: {safeTotal} صفحة)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              اختر طباعة كافة الصفحات أو تحديد أوراق محددة من صفحة كذا إلى صفحة كذا
            </p>
          </div>
        </div>

        {/* Selected count badge */}
        <div className="flex items-center gap-2">
          <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">
            الصفحات المحددة للطباعة:
          </span>
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono font-black rounded-lg text-xs">
            {selectedCount} من {safeTotal} صفحة
          </span>
        </div>
      </div>

      {/* Mode Selection Radios / Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('ALL')}
          className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
            config.mode === 'ALL'
              ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${config.mode === 'ALL' ? 'text-white' : 'text-slate-400'}`} />
          <span>كافة الصفحات (1 - {safeTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('RANGE')}
          className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
            config.mode === 'RANGE'
              ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className={`w-3.5 h-3.5 ${config.mode === 'RANGE' ? 'text-white' : 'text-slate-400'}`} />
          <span>نطاق مخصص (من .. إلى ..)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('CUSTOM')}
          className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
            config.mode === 'CUSTOM'
              ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          <Hash className={`w-3.5 h-3.5 ${config.mode === 'CUSTOM' ? 'text-white' : 'text-slate-400'}`} />
          <span>تحديد مخصص (مثل: 1, 3, 5-7)</span>
        </button>
      </div>

      {/* Sub-controls based on mode */}
      {config.mode === 'RANGE' && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2.5 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-800 dark:text-slate-200">من صفحة:</label>
              <input
                type="number"
                min={1}
                max={config.toPage}
                value={config.fromPage}
                onChange={(e) => handleFromChange(parseInt(e.target.value, 10))}
                className="w-16 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold text-blue-900 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-800 dark:text-slate-200">إلى صفحة:</label>
              <input
                type="number"
                min={config.fromPage}
                max={safeTotal}
                value={config.toPage}
                onChange={(e) => handleToChange(parseInt(e.target.value, 10))}
                className="w-16 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold text-blue-900 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">اختيار سريع:</span>
              <button
                type="button"
                onClick={() => selectQuickRange(1, 1)}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                الغلاف فقط (ص 1)
              </button>
              {safeTotal >= 2 && (
                <button
                  type="button"
                  onClick={() => selectQuickRange(2, Math.min(4, safeTotal))}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  القوائم فقط (ص 2-{Math.min(4, safeTotal)})
                </button>
              )}
              {safeTotal >= 4 && (
                <button
                  type="button"
                  onClick={() => selectQuickRange(1, Math.min(3, safeTotal))}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  أول 3 صفحات
                </button>
              )}
            </div>
          </div>

          {/* Quick Page Navigator Overview */}
          {pageTitles.length > 0 && (
            <div className="pt-2 border-t border-blue-100 dark:border-blue-900 flex flex-wrap gap-1.5 text-[10px]">
              {pageTitles.map((p) => {
                const isSelected = p.pageNumber >= config.fromPage && p.pageNumber <= config.toPage;
                return (
                  <button
                    type="button"
                    key={p.pageNumber}
                    onClick={() => selectQuickRange(p.pageNumber, p.pageNumber)}
                    className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white border-blue-700 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ص {p.pageNumber}: {p.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {config.mode === 'CUSTOM' && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 shrink-0">أرقام الصفحات:</label>
            <input
              type="text"
              placeholder={`مثال: 1, 2, 4-6 (من 1 إلى ${safeTotal})`}
              value={config.customPagesString || ''}
              onChange={(e) => onChange({ ...config, customPagesString: e.target.value })}
              className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>يمكنك كتابة أرقام الصفحات مفصولة بفواصل أو شرطات مثل: 1, 3, 5-8</span>
          </div>
        </div>
      )}

      {/* Page number footer and resequencing options */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={config.showPageNumbers}
              onChange={(e) => onChange({ ...config, showPageNumbers: e.target.checked })}
              className="rounded accent-blue-700 w-4 h-4 cursor-pointer"
            />
            <span>إظهار الترقيم التلقائي أسفل الورقة المطبوعة (مثل: صفحة [س] من [ص])</span>
          </label>

          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            تطبيق على أوامر الطباعة A4 وتصدير PDF/PNG
          </span>
        </div>

        {/* Dynamic Resequencing Toggle based on selected pages */}
        <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
          <input
            type="checkbox"
            id="resequence-toggle-input"
            checked={config.resequencePageNumbers !== false}
            onChange={(e) => onChange({ ...config, resequencePageNumbers: e.target.checked })}
            className="rounded accent-emerald-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
          />
          <label htmlFor="resequence-toggle-input" className="cursor-pointer space-y-0.5">
            <div className="font-black text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5">
              <span>إعادة ترتيب وترقيم تذييل الصفحات تلقائياً بناءً على الصفحات المحددة</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 rounded font-mono font-bold">
                Dynamic Pagination
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
              عند التفعيل واختيار صفحات محددة (مثلاً 3 صفحات)، يُعاد ترقيم تذييل الأوراق المطبوعة تسلسلياً (1 من 3، 2 من 3، 3 من 3) بدلاً من الاحتفاظ بأرقام الأوراق الأصلية.
            </p>
          </label>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility to parse custom page string like "1, 3, 5-8" into an array of page numbers
 */
export function parseCustomPageString(input: string, maxPages: number): number[] {
  if (!input || !input.trim()) {
    // Default to all pages if empty
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const pagesSet = new Set<number>();
  const parts = input.split(/[,،]/);

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pagesSet.add(i);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pagesSet.add(p);
      }
    }
  }

  const result = Array.from(pagesSet).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: maxPages }, (_, i) => i + 1);
}

/**
 * Helper to check if a specific page number is included in the page range config
 */
export function isPageIncluded(
  pageNumber: number,
  config: PageRangeConfig,
  totalPages: number
): boolean {
  if (config.mode === 'ALL') {
    return true;
  }
  if (config.mode === 'RANGE') {
    return pageNumber >= config.fromPage && pageNumber <= config.toPage;
  }
  if (config.mode === 'CUSTOM') {
    const parsed = parseCustomPageString(config.customPagesString || '', totalPages);
    return parsed.includes(pageNumber);
  }
  return true;
}

/**
 * Convert array of page numbers into compressed range string like "1, 3, 5-7"
 */
export function formatPagesToRangeString(pages: number[]): string {
  if (pages.length === 0) return '';
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = start;

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = curr;
      prev = curr;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(', ');
}

/**
 * Toggle a page in custom page string
 */
export function togglePageInCustomString(currentStr: string, pageNum: number, maxPages: number): string {
  const currentPages = new Set(parseCustomPageString(currentStr, maxPages));
  if (currentPages.has(pageNum)) {
    currentPages.delete(pageNum);
  } else {
    currentPages.add(pageNum);
  }
  const sorted = Array.from(currentPages).sort((a, b) => a - b);
  return formatPagesToRangeString(sorted);
}

