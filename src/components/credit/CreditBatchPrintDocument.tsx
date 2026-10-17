import React from 'react';
import { PageRangeConfig, isPageIncluded } from '../common/PageRangeSelector';
import { FiscalYearData } from './CreditYearlyEditor';
import { FixedAssetCategoryItem } from './CreditFixedAssetsTab';
import { CreditMemoConfig, CustomCreditRatioItem } from './CreditScoringKpisTab';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

export type CreditPrintScope =
  | 'COMPLETE_DOSSIER'
  | 'SELECTED_YEAR'
  | 'SELECTED_YEAR_WITH_COMPARISON'
  | 'SELECTED_YEAR_STANDALONE'
  | 'CUSTOM_YEARS_MATRIX'
  | 'ALL_YEARS_BATCH'
  | 'AUDITOR_REPORT_ONLY'
  | 'BALANCE_SHEET_ONLY'
  | 'INCOME_STATEMENT_ONLY'
  | 'CASH_FLOW_ONLY'
  | 'NOTES_ONLY'
  | 'KPIS_ONLY'
  | 'TAX_CERT_ONLY';

export interface ClientProfileData {
  companyName: string;
  legalForm: string;
  commercialRegNo: string;
  taxRegNo: string;
  taxFileNo?: string;
  taxOffice: string;
  socialInsuranceNo: string;
  address?: string;
  activity: string;
  capital?: number;
  representedBy?: string;
  [key: string]: any;
}

export interface PrintablePageMeta {
  id: string;
  pageNumber: number;
  title: string;
  subtitle?: string;
  category?: string;
}

export function getDossierPageMetas(
  scope: CreditPrintScope,
  selectedYear: number,
  _yearsList: number[],
  _customYearsList?: number[],
  comparisonYear?: number | null,
  includeComparison?: boolean
): PrintablePageMeta[] {
  const compSuffix = includeComparison && comparisonYear ? ` (مقارن مع ${comparisonYear})` : '';
  if (scope === 'BALANCE_SHEET_ONLY') {
    return [{ id: 'p-bs', pageNumber: 1, title: `قائمة المركز المالي ${selectedYear}${compSuffix}` }];
  }
  if (scope === 'INCOME_STATEMENT_ONLY') {
    return [{ id: 'p-is', pageNumber: 1, title: `قائمة الدخل الشامل ${selectedYear}${compSuffix}` }];
  }
  return [
    { id: 'p-1', pageNumber: 1, title: `تقرير مراقب الحسابات المستقل (${selectedYear})` },
    { id: 'p-2', pageNumber: 2, title: `قائمة المركز المالي في 31 ديسمبر ${selectedYear}${compSuffix}` },
    { id: 'p-3', pageNumber: 3, title: `قائمة الدخل والأرباح والخسائر عن عام ${selectedYear}${compSuffix}` },
    { id: 'p-4', pageNumber: 4, title: `قائمة التدفقات النقدية والتغير في حقوق الملكية (${selectedYear})` },
    { id: 'p-5', pageNumber: 5, title: `الإيضاحات المتممة للقوائم المالية والمؤشرات الائتمانية (${selectedYear})` },
  ];
}

export interface CreditBatchPrintDocumentProps {
  printScope: CreditPrintScope;
  selectedYear: number;
  comparisonYear: number | null;
  includeComparisonColumn: boolean;
  yearsList: number[];
  customYearsList: number[];
  yearsData: Record<number, FiscalYearData>;
  computedData: Record<number, any>;
  officeProfile: any;
  assetCategories: FixedAssetCategoryItem[];
  adminExpenseItems: any[];
  notesList: any[];
  clientProfile: ClientProfileData;
  showHeaderClientBanner?: boolean;
  pageRangeConfig: PageRangeConfig;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  creditMemoConfig?: CreditMemoConfig;
  customCreditRatios?: CustomCreditRatioItem[];
  creditRatioNames?: Record<string, string>;
  hiddenCreditRatioIds?: string[];
}

export const CreditBatchPrintDocument: React.FC<CreditBatchPrintDocumentProps> = ({
  printScope,
  selectedYear,
  yearsList,
  customYearsList,
  comparisonYear,
  includeComparisonColumn,
  computedData,
  officeProfile,
  clientProfile,
  pageRangeConfig,
}) => {
  const metas = getDossierPageMetas(
    printScope,
    selectedYear,
    yearsList,
    customYearsList,
    comparisonYear,
    includeComparisonColumn
  );
  const includedMetas = metas.filter((m) => isPageIncluded(m.pageNumber, pageRangeConfig, metas.length));
  const yrData = computedData[selectedYear] || {};

  return (
    <div id="credit-dossier-printable-root" className="space-y-6" dir="rtl">
      {includedMetas.map((meta, idx) => (
        <div
          key={meta.id}
          id={`page-sheet-${meta.pageNumber}`}
          className="bg-white text-slate-900 p-8 border border-slate-300 shadow-sm w-[210mm] min-h-[297mm] mx-auto flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">
                  {officeProfile?.firmName || 'مكتب المحاسب القانوني محمد جميل مرعي'}
                </div>
                <div className="text-xs text-slate-600">
                  {officeProfile?.auditorName || 'محمد جميل مرعي'} • {officeProfile?.licenseNumber || 'س.م.م 43122'}
                </div>
              </div>
              <div className="text-left text-xs">
                <div className="font-bold text-slate-900">{clientProfile.companyName}</div>
                <div className="text-slate-600">س.ت: {clientProfile.commercialRegNo} | ب.ض: {clientProfile.taxRegNo}</div>
              </div>
            </div>

            <h2 className="text-base font-black text-center bg-slate-100 py-2 rounded-lg border border-slate-300">
              {meta.title}
            </h2>

            <div className="text-xs space-y-2 pt-2">
              <div className="flex justify-between p-2 border-b border-slate-200">
                <span className="font-bold">صافي المبيعات والإيرادات:</span>
                <span className="font-mono font-bold">{formatEgyptianCurrency(yrData.sales || 0, true)}</span>
              </div>
              <div className="flex justify-between p-2 border-b border-slate-200">
                <span className="font-bold">مجمل الربح:</span>
                <span className="font-mono font-bold">{formatEgyptianCurrency(yrData.grossProfit || 0, true)}</span>
              </div>
              <div className="flex justify-between p-2 border-b border-slate-200">
                <span className="font-bold">صافي الربح القابل للتوزيع:</span>
                <span className="font-mono font-bold">{formatEgyptianCurrency(yrData.netProfit || 0, true)}</span>
              </div>
              <div className="flex justify-between p-2 border-b border-slate-200">
                <span className="font-bold">إجمالي الأصول:</span>
                <span className="font-mono font-bold">{formatEgyptianCurrency(yrData.totalAssets || 0, true)}</span>
              </div>
            </div>
          </div>

          {pageRangeConfig.showPageNumbers && (
            <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
              <span>معتمد لأغراض الائتمان البنكي • معايير المحاسبة المصرية (EAS)</span>
              <span className="font-mono">
                صفحة {pageRangeConfig.resequencePageNumbers !== false ? idx + 1 : meta.pageNumber} من{' '}
                {pageRangeConfig.resequencePageNumbers !== false ? includedMetas.length : metas.length}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
