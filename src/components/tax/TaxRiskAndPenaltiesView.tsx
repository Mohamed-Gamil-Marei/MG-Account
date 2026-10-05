import React, { useState } from 'react';
import { Clock, AlertTriangle, ShieldAlert, Sparkles, Scale, Layers } from 'lucide-react';
import { DatabaseState } from '../../db/localDatabase';
import { TaxPenaltySimulatorView } from '../TaxPenaltySimulatorView';
import { TaxExposureSimulatorView } from '../TaxExposureSimulatorView';

interface TaxRiskAndPenaltiesViewProps {
  state: DatabaseState;
  initialMode?: 'PENALTIES' | 'EXPOSURE';
}

export const TaxRiskAndPenaltiesView: React.FC<TaxRiskAndPenaltiesViewProps> = ({
  state,
  initialMode = 'PENALTIES',
}) => {
  const [subMode, setSubMode] = useState<'PENALTIES' | 'EXPOSURE'>(initialMode);

  return (
    <div className="space-y-3" dir="rtl">
      {/* Top Unified Switcher Pill */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              مركز تقييم المخاطر والغرامات الضريبية الموحد
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              حساب غرامات التأخير والمادتين 70 و 71 مع فحص نقاط التعرض الضريبي للعميل
            </p>
          </div>
        </div>

        {/* Sub-Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSubMode('PENALTIES')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subMode === 'PENALTIES'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>حاسبة الغرامات ومقابل التأخير (مادة 110 و 70)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('EXPOSURE')}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subMode === 'EXPOSURE'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>مصفوفة فحص المخاطر والتعرض الضريبي</span>
          </button>
        </div>
      </div>

      {/* Render Selected Engine */}
      <div>
        {subMode === 'PENALTIES' ? (
          <TaxPenaltySimulatorView state={state} />
        ) : (
          <TaxExposureSimulatorView state={state} />
        )}
      </div>
    </div>
  );
};
