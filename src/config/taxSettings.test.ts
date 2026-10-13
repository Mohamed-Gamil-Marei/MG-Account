import { describe, it, expect } from 'vitest';
import { getTaxConfig, calculateBracketedTax, calculateFlatTax } from './taxSettings';

describe('Tax Configuration & Calculations', () => {
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
});
