export interface TaxBracket {
  minAmount: number;
  maxAmount: number | null; // null means infinity
  rate: number; // e.g., 0.225
}

export interface TaxConfig {
  effectiveDate: string; // ISO format
  corporateTaxRate: number; // Flat rate for corporations
  individualBrackets: TaxBracket[]; // Bracketed rates for individuals
  personalExemption?: number; // Personal exemption amount
}

/**
 * Egyptian Tax Rates & Brackets Configuration
 * Based on Law 91 of 2005 and its amendments (latest being Law 30 of 2023 / Law 175 of 2023)
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

/**
 * Gets the tax configuration applicable for a specific date
 */
export function getTaxConfig(date: string = new Date().toISOString()): TaxConfig {
  const sorted = [...TAX_CONFIGS].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const config = sorted.find(c => c.effectiveDate <= date);
  return config || TAX_CONFIGS[0];
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
