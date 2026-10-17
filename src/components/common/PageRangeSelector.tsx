import React from 'react';

export interface PageRangeConfig {
  mode: 'ALL' | 'RANGE' | 'CUSTOM' | 'CURRENT' | 'FIRST_ONLY';
  fromPage: number;
  toPage: number;
  customPagesString: string;
  showPageNumbers: boolean;
  resequencePageNumbers?: boolean;
}

export function parseCustomPagesString(customStr: string, totalPages: number): Set<number> {
  const result = new Set<number>();
  if (!customStr || !customStr.trim()) return result;
  const parts = customStr.split(',');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(totalPages, Math.max(start, end));
        for (let p = s; p <= e; p++) result.add(p);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        result.add(p);
      }
    }
  }
  return result;
}

export function isPageIncluded(pageNumber: number, config: PageRangeConfig, totalPages = 100): boolean {
  if (!config || config.mode === 'ALL') return true;
  if (config.mode === 'FIRST_ONLY') return pageNumber === 1;
  if (config.mode === 'RANGE') {
    const from = Math.max(1, config.fromPage || 1);
    const to = Math.min(totalPages, config.toPage || totalPages);
    return pageNumber >= from && pageNumber <= to;
  }
  if (config.mode === 'CUSTOM') {
    const set = parseCustomPagesString(config.customPagesString, totalPages);
    return set.size === 0 ? true : set.has(pageNumber);
  }
  return true;
}

export function formatPagesToRangeString(pages: number[]): string {
  const sorted = Array.from(new Set(pages.filter((p) => p >= 1))).sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = cur;
      prev = cur;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(', ');
}

export function togglePageInCustomString(
  currentCustomStr: string,
  pageNumber: number,
  totalPages: number
): string {
  const set = parseCustomPagesString(currentCustomStr, totalPages);
  if (set.has(pageNumber)) {
    set.delete(pageNumber);
  } else {
    set.add(pageNumber);
  }
  return formatPagesToRangeString(Array.from(set));
}

export interface PageRangeSelectorProps {
  config: PageRangeConfig;
  totalPages: number;
  onChange: (nextConfig: PageRangeConfig) => void;
}

export const PageRangeSelector: React.FC<PageRangeSelectorProps> = ({
  config,
  totalPages,
  onChange,
}) => {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...config, mode: 'ALL' })}
          className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
            config.mode === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          كل الصفحات ({totalPages})
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...config, mode: 'RANGE' })}
          className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
            config.mode === 'RANGE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          نطاق مخصص
        </button>
      </div>
    </div>
  );
};
