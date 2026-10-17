export interface TaxConfiguration {
  corporateTaxRate: number;
  vatStandardRate: number;
  vatScheduleRate: number;
  whtGoodsRate: number;
  whtServicesRate: number;
  whtConsultingRate: number;
  solidarityContributionRate: number;
  dividendTaxRateListed: number;
  dividendTaxRateUnlisted: number;
  personalExemptionAnnual: number;
  zeroBracketLimitAnnual: number;
  socialInsuranceEmployerShareRate: number;
  socialInsuranceEmployeeShareRate: number;
  socialInsuranceMinWageMonthly: number;
  socialInsuranceMaxWageMonthly: number;
  effectiveDate?: string;
  legalReference?: string;
  legalReviewedBy?: string;
  legalReviewDate?: string;
}

export const DEFAULT_TAX_CONFIG: TaxConfiguration = {
  corporateTaxRate: 0.225, // 22.5% Egyptian Corporate Income Tax (Law 91/2005)
  vatStandardRate: 0.14,   // 14% VAT (Law 67/2016)
  vatScheduleRate: 0.05,   // 5% Schedule Tax
  whtGoodsRate: 0.01,      // 1% WHT on Supplies/Contracting
  whtServicesRate: 0.03,   // 3% WHT on Services
  whtConsultingRate: 0.05, // 5% WHT on Professional/Consulting Fees
  solidarityContributionRate: 0.0025, // 2.5 per thousand Health Insurance Solidarity
  dividendTaxRateListed: 0.05,
  dividendTaxRateUnlisted: 0.10,
  personalExemptionAnnual: 20000,
  zeroBracketLimitAnnual: 40000,
  socialInsuranceEmployerShareRate: 0.1875,
  socialInsuranceEmployeeShareRate: 0.11,
  socialInsuranceMinWageMonthly: 2300,
  socialInsuranceMaxWageMonthly: 14500,
  effectiveDate: '2024-03-01',
  legalReference: 'قانون 91 لسنة 2005 وتعديلاته بقانون 30 لسنة 2023 وقانون 7 لسنة 2024',
  legalReviewedBy: 'المكتب الفني الضريبي',
  legalReviewDate: '2026-01-01',
};

let currentTaxConfig: TaxConfiguration = { ...DEFAULT_TAX_CONFIG };

export function getTaxConfig(_asOfDate?: string): TaxConfiguration {
  return currentTaxConfig;
}

export function updateTaxConfig(partial: Partial<TaxConfiguration>): TaxConfiguration {
  currentTaxConfig = { ...currentTaxConfig, ...partial };
  return currentTaxConfig;
}
