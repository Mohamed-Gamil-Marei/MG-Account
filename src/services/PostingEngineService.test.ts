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

  it('2. يجد الحساب بالكود الجزئي إذا كان يطابق حساباً واحداً فقط', () => {
    // كود 22 يطابق فقط 2230
    const res = findAccount(accounts, ['22'], 'LIABILITIES', 'ضريبة');
    expect(res.id).toBe('acc-4');
    expect(res.code).toBe('2230');
  });

  it('3. لا يختار بالكود الجزئي إذا كان يطابق أكثر من حساب واحد', () => {
    // كود 41 يطابق 4110 و 4120
    // إذا لم يتطابق الاسم، يجب أن يرمي خطأ ولا يختار أياً منهما بالكود الجزئي
    expect(() => {
      findAccount(accounts, ['41'], 'REVENUES', 'اسم غير موجود إطلاقاً');
    }).toThrowError(/تعذر ترحيل القيد/);
  });

  it('4. يجد الحساب بمطابقة الاسم إذا لم يطابق الكود', () => {
    const res = findAccount(accounts, ['9999'], 'REVENUES', 'خدمات واستشارات');
    expect(res.id).toBe('acc-3');
    expect(res.code).toBe('4120');
  });

  it('5. يرمي خطأ ولا يختار حساباً عشوائياً من نفس الفئة عند فشل الكود والاسم (إلغاء الخطوة 4)', () => {
    // فئة ASSETS تحتوي على acc-1، ولكن الكود والاسم لا يطابقان
    expect(() => {
      findAccount(accounts, ['1999'], 'ASSETS', 'حساب أصل مجهول غير مسجل');
    }).toThrowError(/تعذر ترحيل القيد: الحساب \[حساب أصل مجهول غير مسجل\]/);
  });
});
