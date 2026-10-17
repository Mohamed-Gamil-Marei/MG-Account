export interface TaxBracket {
  minAmount: number;
  maxAmount: number | null; // null means infinity
  rate: number; // e.g., 0.225
}

export interface TaxConfig {
  effectiveDate: string; // ISO format
  corporateTaxRate: number; // Flat rate for corporations
  individualBrackets: TaxBracket[]; // General individual brackets
  personalExemption?: number; // Personal exemption amount
  salaryBrackets?: TaxBracket[]; // المرتبات
  commercialBrackets?: TaxBracket[]; // النشاط التجاري والمهني
  vatRate?: number; // القيمة المضافة (e.g., 0.14)
  legalReviewedBy?: string; // تمت المراجعة القانونية بواسطة
  legalReviewDate?: string; // تاريخ المراجعة
  legalReference?: string; // المرجع القانوني (رقم القانون/القرار)
  createdAt?: string;
  createdBy?: string;
}

/**
 * Egyptian Tax Rates & Brackets Configuration
 * Based on Law 91 of 2005 and its amendments (latest being Law 30 of 2023 / Law 175 of 2023)
 * NOTE: Do not change any existing percentage or bracket.
 */
export const TAX_CONFIGS: TaxConfig[] = [
  {
    effectiveDate: '2023-01-01',
    corporateTaxRate: 0.225, // 22.5% Flat Rate
    personalExemption: 20000,
    individualBrackets: [
      { minAmount: 0, maxAmount: 21000, rate: 0 },
      { minAmount: 21000, maxAmount: 30000, rate: 0.025 },
      { minAmount: 30000, maxAmount: 45000, rate: 0.10 },
      { minAmount: 45000, maxAmount: 60000, rate: 0.15 },
      { minAmount: 60000, maxAmount: 200000, rate: 0.20 },
      { minAmount: 200000, maxAmount: 400000, rate: 0.225 },
      { minAmount: 400000, maxAmount: null, rate: 0.25 },
    ],
  },
];

let customTaxConfigs: TaxConfig[] = [];

export function setCustomTaxConfigs(configs: TaxConfig[]) {
  customTaxConfigs = configs;
}

export function getCustomTaxConfigs(): TaxConfig[] {
  return customTaxConfigs;
}

export function getAllTaxConfigs(): TaxConfig[] {
  const combined = [...customTaxConfigs, ...TAX_CONFIGS];
  return combined.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
}

/**
 * Gets the tax configuration applicable for a specific date
 */
export function getTaxConfig(date: string = new Date().toISOString()): TaxConfig {
  const all = getAllTaxConfigs();
  const config = all.find(c => c.effectiveDate <= date);
  return config || TAX_CONFIGS[0];
}

/**
 * Checks if tax config has been legally reviewed within the last 12 months
 */
export function isTaxConfigLegallyValid(config: TaxConfig): { isValid: boolean; message?: string } {
  if (!config.legalReviewedBy || !config.legalReviewDate) {
    return { isValid: false, message: "الشرائح الضريبية لم تتم مراجعتها قانونيًا، راجع قبل تقديم أي إقرار" };
  }
  const reviewTime = new Date(config.legalReviewDate).getTime();
  const now = Date.now();
  const twelveMonthsMs = 12 * 30.44 * 24 * 60 * 60 * 1000;
  if (isNaN(reviewTime) || (now - reviewTime) > twelveMonthsMs) {
    return { isValid: false, message: "الشرائح الضريبية لم تتم مراجعتها قانونيًا، راجع قبل تقديم أي إقرار" };
  }
  return { isValid: true };
}

/**
 * Calculates bracketed tax for individual income
 */
export function calculateBracketedTax(profit: number, brackets: TaxBracket[], personalExemption: number = 0): number {
  const taxablePool = Math.max(0, profit - personalExemption);
  if (taxablePool <= 0) return 0;
  let totalTax = 0;
  for (const bracket of brackets) {
    if (taxablePool > bracket.minAmount) {
      const taxableInBracket = bracket.maxAmount 
        ? Math.min(taxablePool, bracket.maxAmount) - bracket.minAmount 
        : taxablePool - bracket.minAmount;
      if (taxableInBracket > 0) {
        totalTax += taxableInBracket * bracket.rate;
      }
    }
  }
  return Math.round(totalTax);
}

/**
 * Calculates flat tax (Corporate)
 */
export function calculateFlatTax(profit: number, rate: number): number {
  if (profit <= 0) return 0;
  return Math.round(profit * rate);
}
