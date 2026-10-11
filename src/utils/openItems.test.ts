import { describe, it, expect } from 'vitest';
import {
  formatOpenItemKindLabel,
  formatOpenItemStatusLabel,
  formatOpenItemsTextForClient,
  OpenItem,
} from './openItems';

describe('openItems utility', () => {
  it('formats kind and status labels correctly', () => {
    expect(formatOpenItemKindLabel('DOCUMENT')).toBe('مستند مطلوب');
    expect(formatOpenItemKindLabel('QUESTION')).toBe('استفسار/توضيح');
    expect(formatOpenItemKindLabel('ADJUSTMENT')).toBe('تسوية/قيد معلق');

    expect(formatOpenItemStatusLabel('OPEN')).toBe('مفتوح (قيد الانتظار)');
    expect(formatOpenItemStatusLabel('RECEIVED')).toBe('تم الاستلام/الرد');
    expect(formatOpenItemStatusLabel('CLOSED')).toBe('مغلق والمعتمد');
  });

  it('formats client text message with open items list', () => {
    const items: OpenItem[] = [
      {
        id: '1',
        clientId: 'c1',
        kind: 'DOCUMENT',
        text: 'صورة عقد الإيجار الجديد الموثق',
        requestedAt: '2026-10-01',
        status: 'OPEN',
      },
      {
        id: '2',
        clientId: 'c1',
        kind: 'QUESTION',
        text: 'بيان سبب المصروفات النثرية بقيمة 50,000 ج.م',
        requestedAt: '2026-10-05',
        status: 'RECEIVED',
      },
      {
        id: '3',
        clientId: 'c1',
        kind: 'DOCUMENT',
        text: 'شهادة كشف حساب البنك',
        requestedAt: '2026-09-01',
        status: 'CLOSED', // Should be excluded from open items message
      },
    ];

    const message = formatOpenItemsTextForClient('شركة الأمل للتجارة', 2026, items, 'مكتب المراجعة المعتمد');

    expect(message).toContain('شركة الأمل للتجارة');
    expect(message).toContain('2026');
    expect(message).toContain('صورة عقد الإيجار الجديد الموثق');
    expect(message).toContain('بيان سبب المصروفات النثرية بقيمة 50,000 ج.م');
    expect(message).not.toContain('شهادة كشف حساب البنك'); // Closed item excluded
  });

  it('returns clean message when no open items exist', () => {
    const message = formatOpenItemsTextForClient('شركة السلام', 2026, []);
    expect(message).toContain('لا توجد أي بنود مفتوحة');
  });
});
