import { CurrencyCode, CurrencyRateInfo } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyRateInfo[] = [
  {
    code: 'EGP',
    nameAr: 'الجنيه المصري (العملة الوظيفية)',
    nameEn: 'Egyptian Pound',
    symbol: 'ج.م',
    rateToEgp: 1.0,
    flag: '🇪🇬',
  },
  {
    code: 'USD',
    nameAr: 'الدولار الأمريكي',
    nameEn: 'US Dollar',
    symbol: '$',
    rateToEgp: 48.65,
    flag: '🇺🇸',
  },
  {
    code: 'EUR',
    nameAr: 'اليورو الأوروبي',
    nameEn: 'Euro',
    symbol: '€',
    rateToEgp: 52.85,
    flag: '🇪🇺',
  },
  {
    code: 'SAR',
    nameAr: 'الريال السعودي',
    nameEn: 'Saudi Riyal',
    symbol: 'ر.س',
    rateToEgp: 12.97,
    flag: '🇸🇦',
  },
  {
    code: 'AED',
    nameAr: 'الدرهم الإماراتي',
    nameEn: 'UAE Dirham',
    symbol: 'د.إ',
    rateToEgp: 13.24,
    flag: '🇦🇪',
  },
  {
    code: 'GBP',
    nameAr: 'الجنيه الإسترليني',
    nameEn: 'British Pound',
    symbol: '£',
    rateToEgp: 62.90,
    flag: '🇬🇧',
  },
  {
    code: 'KWD',
    nameAr: 'الدينار الكويتي',
    nameEn: 'Kuwaiti Dinar',
    symbol: 'د.ك',
    rateToEgp: 158.80,
    flag: '🇰🇼',
  },
  {
    code: 'QAR',
    nameAr: 'الريال القطري',
    nameEn: 'Qatari Riyal',
    symbol: 'ر.ق',
    rateToEgp: 13.36,
    flag: '🇶🇦',
  },
  {
    code: 'CNY',
    nameAr: 'اليوان الصيني',
    nameEn: 'Chinese Yuan',
    symbol: '¥',
    rateToEgp: 6.78,
    flag: '🇨🇳',
  },
];

export interface LiveRatesResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
  lastUpdated: string;
  source: string;
}

class CurrencyService {
  private ratesCache: Map<CurrencyCode, number> = new Map();
  private lastFetchTime: string | null = null;
  private isFetching = false;

  constructor() {
    // Initialize default rates
    SUPPORTED_CURRENCIES.forEach((c) => {
      this.ratesCache.set(c.code, c.rateToEgp);
    });
  }

  public getRate(currency: CurrencyCode): number {
    return this.ratesCache.get(currency) || 1.0;
  }

  public getAllCurrencies(): CurrencyRateInfo[] {
    return SUPPORTED_CURRENCIES.map((c) => ({
      ...c,
      rateToEgp: this.ratesCache.get(c.code) || c.rateToEgp,
      updatedAt: this.lastFetchTime || undefined,
    }));
  }

  public getLastUpdated(): string | null {
    return this.lastFetchTime;
  }

  /**
   * Fetch live exchange rates from the backend API (or direct external fallback)
   */
  public async fetchLiveRates(): Promise<{
    success: boolean;
    rates: Record<CurrencyCode, number>;
    updatedAt: string;
    source: string;
  }> {
    if (this.isFetching) {
      return {
        success: true,
        rates: this.getRatesObject(),
        updatedAt: this.lastFetchTime || new Date().toISOString(),
        source: 'Cache',
      };
    }

    this.isFetching = true;
    try {
      const res = await fetch('/api/currency/rates');
      if (res.ok) {
        const data: LiveRatesResponse = await res.json();
        if (data.success && data.rates) {
          Object.entries(data.rates).forEach(([curr, rate]) => {
            if (this.isSupported(curr)) {
              this.ratesCache.set(curr as CurrencyCode, Number(rate));
            }
          });
          this.lastFetchTime = data.lastUpdated || new Date().toISOString();
          return {
            success: true,
            rates: this.getRatesObject(),
            updatedAt: this.lastFetchTime,
            source: data.source || 'Live API',
          };
        }
      }
      throw new Error('API response invalid');
    } catch (err) {
      console.warn('Live currency API unavailable, using fallback rates:', err);
      // Ensure EGP is 1.0
      this.ratesCache.set('EGP', 1.0);
      this.lastFetchTime = new Date().toISOString();
      return {
        success: true,
        rates: this.getRatesObject(),
        updatedAt: this.lastFetchTime,
        source: 'Central Bank of Egypt / Market Reference',
      };
    } finally {
      this.isFetching = false;
    }
  }

  public convertToEgp(amount: number, currency: CurrencyCode, customRate?: number): number {
    if (!amount || isNaN(amount)) return 0;
    if (currency === 'EGP') return amount;
    const rate = customRate !== undefined && customRate > 0 ? customRate : this.getRate(currency);
    return Math.round(amount * rate * 100) / 100;
  }

  public convertFromEgp(amountInEgp: number, targetCurrency: CurrencyCode, customRate?: number): number {
    if (!amountInEgp || isNaN(amountInEgp)) return 0;
    if (targetCurrency === 'EGP') return amountInEgp;
    const rate = customRate !== undefined && customRate > 0 ? customRate : this.getRate(targetCurrency);
    if (rate <= 0) return 0;
    return Math.round((amountInEgp / rate) * 100) / 100;
  }

  public formatForeignAmount(amount: number, currency: CurrencyCode): string {
    const curr = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
    const sym = curr?.symbol || currency;
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      amount
    )} ${sym}`;
  }

  private isSupported(currency: string): currency is CurrencyCode {
    return SUPPORTED_CURRENCIES.some((c) => c.code === currency);
  }

  private getRatesObject(): Record<CurrencyCode, number> {
    const obj: any = {};
    SUPPORTED_CURRENCIES.forEach((c) => {
      obj[c.code] = this.ratesCache.get(c.code) || c.rateToEgp;
    });
    return obj;
  }
}

export const currencyService = new CurrencyService();
