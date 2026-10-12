import { describe, it, expect } from 'vitest';
import { PostingEngineService } from './PostingEngineService';
import { Account } from '../types';

describe('PostingEngineService.findAccount', () => {
  const accounts: Account[] = [
    {
      id: 'acc-1',
      code: '1250',
      name: 'النقدية بالصندوق (الخزينة الرئيسية)',
      category: 'ASSETS',
      nature: 'DEBIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-2',
      code: '4110',
      name: 'مبيعات سلع وبضائع',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-3',
      code: '4120',
      name: 'إيرادات خدمات واستشارات',
      category: 'REVENUES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
    {
      id: 'acc-4',
      code: '2230',
      name: 'مصلحة الضرائب على القيمة المضافة',
      category: 'LIABILITIES',
      nature: 'CREDIT',
      level: 4,
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      isSystem: true,
    },
  ];

  const findAccount = (PostingEngineService as any).findAccount.bind(PostingEngineService);

  it('1. يجد الحساب بالكود المفضل المطابق تماماً', () => {
    const res = findAccount(accounts, ['1250'], 'ASSETS', 'نقدية');
    expect(res.id).toBe('acc-1');
    expect(res.code).toBe('1250');
  });

  it('2. يرمي خطأ عند عدم تطابق الكود (إلغاء المطابقة الجزئية والاسمية)', () => {
    expect(() => {
      findAccount(accounts, ['22'], 'LIABILITIES', 'ضريبة');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('3. يرمي خطأ عند عدم وجود الكود', () => {
    expect(() => {
      findAccount(accounts, ['41'], 'REVENUES', 'اسم غير موجود إطلاقاً');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('4. يرمي خطأ ولا يختار حساباً عشوائياً عند فشل الكود', () => {
    expect(() => {
      findAccount(accounts, ['9999'], 'REVENUES', 'خدمات واستشارات');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('5. يرمي خطأ صريح عند غياب الحساب', () => {
    expect(() => {
      findAccount(accounts, ['1999'], 'ASSETS', 'حساب أصل مجهول غير مسجل');
    }).toThrowError(/تعذر ترحيل القيد/);
  });
});
