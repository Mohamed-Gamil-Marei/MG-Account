import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTaxConfig,
  calculateBracketedTax,
  calculateFlatTax,
  setCustomTaxConfigs,
  isTaxConfigLegallyValid,
  TaxConfig,
} from './taxSettings';

describe('Tax Configuration & Calculations', () => {
  beforeEach(() => {
    // Reset custom tax configs before each test
    setCustomTaxConfigs([]);
  });

  const config = getTaxConfig('2023-12-01');

  it('should return the correct corporate tax rate (22.5%)', () => {
    expect(config.corporateTaxRate).toBe(0.225);
  });

  it('should calculate flat corporate tax correctly', () => {
    const profit = 1000000;
    const tax = calculateFlatTax(profit, config.corporateTaxRate);
    expect(tax).toBe(225000);
  });

  it('should calculate individual bracketed tax correctly - low income', () => {
    const profit = 20000; // Below first bracket threshold (21000)
    const tax = calculateBracketedTax(profit, config.individualBrackets);
    expect(tax).toBe(0);
  });

  it('should calculate individual bracketed tax correctly - mid income', () => {
    // 21k (0%) + 9k (2.5%) = 225
    const profit = 30000;
    const tax = calculateBracketedTax(profit, config.individualBrackets);
    expect(tax).toBe(225);
  });

  it('should calculate individual bracketed tax correctly - edge cases', () => {
    expect(calculateBracketedTax(0, config.individualBrackets)).toBe(0);
    expect(calculateBracketedTax(-100, config.individualBrackets)).toBe(0);
  });

  it('should calculate individual bracketed tax correctly - high income', () => {
    const profit = 500000;
    // 0-21k: 0
    // 21k-30k: 9k * 0.025 = 225
    // 30k-45k: 15k * 0.10 = 1500
    // 45k-60k: 15k * 0.15 = 2250
    // 60k-200k: 140k * 0.20 = 28000
    // 200k-400k: 200k * 0.225 = 45000
    // 400k-500k: 100k * 0.25 = 25000
    // Total: 0 + 225 + 1500 + 2250 + 28000 + 45000 + 25000 = 101975
    const tax = calculateBracketedTax(profit, config.individualBrackets);
    expect(tax).toBe(101975);
  });

  it('1) اختيار الإعداد الصحيح بالتاريخ وترتيب الأولوية حسب تاريخ السريان', () => {
    const customConfig1: TaxConfig = {
      effectiveDate: '2025-01-01',
      corporateTaxRate: 0.25,
      individualBrackets: [{ minAmount: 0, maxAmount: null, rate: 0.20 }],
      legalReviewedBy: 'المستشار القانوني أ',
      legalReviewDate: '2025-01-05',
      legalReference: 'قانون 10 لسنة 2025',
    };

    const customConfig2: TaxConfig = {
      effectiveDate: '2026-06-01',
      corporateTaxRate: 0.20,
      individualBrackets: [{ minAmount: 0, maxAmount: null, rate: 0.15 }],
      legalReviewedBy: 'المستشار القانوني ب',
      legalReviewDate: '2026-06-02',
      legalReference: 'قرار وزاري 50',
    };

    setCustomTaxConfigs([customConfig1, customConfig2]);

    // For date before 2025-01-01 -> gets static 2023 config (22.5%)
    expect(getTaxConfig('2024-05-01').corporateTaxRate).toBe(0.225);

    // For date between 2025-01-01 and 2026-06-01 -> gets customConfig1 (25%)
    expect(getTaxConfig('2025-06-15').corporateTaxRate).toBe(0.25);
    expect(getTaxConfig('2025-06-15').legalReviewedBy).toBe('المستشار القانوني أ');

    // For date after 2026-06-01 -> gets customConfig2 (20%)
    expect(getTaxConfig('2026-07-01').corporateTaxRate).toBe(0.20);
    expect(getTaxConfig('2026-07-01').legalReference).toBe('قرار وزاري 50');
  });

  it('2) ظهور التنبيه واختبار المراجعة القانونية للشرائح الضريبية', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Unreviewed config
    const unreviewedConfig: TaxConfig = {
      effectiveDate: todayStr,
      corporateTaxRate: 0.225,
      individualBrackets: [],
    };
    const unreviewedResult = isTaxConfigLegallyValid(unreviewedConfig);
    expect(unreviewedResult.isValid).toBe(false);
    expect(unreviewedResult.message).toContain('الشرائح الضريبية لم تتم مراجعتها قانونيًا');

    // Review older than 12 months (e.g. 2 years ago)
    const oldReviewConfig: TaxConfig = {
      effectiveDate: '2022-01-01',
      corporateTaxRate: 0.225,
      individualBrackets: [],
      legalReviewedBy: 'محامي قديم',
      legalReviewDate: '2022-01-05',
      legalReference: 'قانون قديم',
    };
    const oldResult = isTaxConfigLegallyValid(oldReviewConfig);
    expect(oldResult.isValid).toBe(false);
    expect(oldResult.message).toContain('الشرائح الضريبية لم تتم مراجعتها قانونيًا');

    // Valid recent review
    const validConfig: TaxConfig = {
      effectiveDate: todayStr,
      corporateTaxRate: 0.225,
      individualBrackets: [],
      legalReviewedBy: 'د. أحمد المراجع القانوني',
      legalReviewDate: todayStr,
      legalReference: 'قانون 30 لسنة 2023',
    };
    const validResult = isTaxConfigLegallyValid(validConfig);
    expect(validResult.isValid).toBe(true);
    expect(validResult.message).toBeUndefined();
  });

  it('3) بقاء الحسابات الحالية بنفس نتائجها دون أي تغيير في النسب الثابتة', () => {
    // Standard static 2023 config
    const defaultConfig = getTaxConfig('2023-01-01');
    expect(defaultConfig.corporateTaxRate).toBe(0.225);
    expect(defaultConfig.personalExemption).toBe(20000);

    // Flat tax calculateFlatTax
    expect(calculateFlatTax(100000, 0.225)).toBe(22500);

    // Individual brackets calculation
    expect(calculateBracketedTax(100000, defaultConfig.individualBrackets)).toBe(11975);
    expect(calculateBracketedTax(100000, defaultConfig.individualBrackets, defaultConfig.personalExemption)).toBe(7975);
  });
});
