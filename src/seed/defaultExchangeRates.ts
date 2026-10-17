import { DailyExchangeRateRecord, CurrencyCode } from '../types';

export const RAW_SAMPLE_EXCHANGE_RATES = [
  { code: 'USD', name: 'دولار أمريكي', rateToEgp: 48.50, isBase: false, lastUpdated: '2026-10-15' },
  { code: 'EUR', name: 'يورو أورو', rateToEgp: 52.80, isBase: false, lastUpdated: '2026-10-15' },
  { code: 'GBP', name: 'جنيه إسترليني', rateToEgp: 63.10, isBase: false, lastUpdated: '2026-10-15' },
  { code: 'SAR', name: 'ريال سعودي', rateToEgp: 12.92, isBase: false, lastUpdated: '2026-10-15' },
  { code: 'AED', name: 'درهم إماراتي', rateToEgp: 13.20, isBase: false, lastUpdated: '2026-10-15' },
  { code: 'EGP', name: 'جنيه مصري', rateToEgp: 1.00, isBase: true, lastUpdated: '2026-10-15' },
];

export const DEFAULT_SAMPLE_EXCHANGE_RATES: DailyExchangeRateRecord[] = RAW_SAMPLE_EXCHANGE_RATES.map((rate) => ({
  id: `rate-${rate.code}`,
  date: rate.lastUpdated,
  currency: rate.code as CurrencyCode,
  baseCurrency: 'EGP',
  buyRate: rate.rateToEgp,
  sellRate: rate.rateToEgp * 1.005,
  officialRate: rate.rateToEgp,
  source: 'CBE',
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
  // Keep legacy properties for backwards compatibility
  code: rate.code,
  name: rate.name,
  rateToEgp: rate.rateToEgp,
  isBase: rate.isBase,
  lastUpdated: rate.lastUpdated,
} as any));
