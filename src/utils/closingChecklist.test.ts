import { describe, it, expect } from 'vitest';
import { createDefaultChecklist, canFinalize, ClosingStep } from './closingChecklist';

describe('closingChecklist utility', () => {
  it('creates default checklist with 11 steps', () => {
    const list = createDefaultChecklist();
    expect(list).toHaveLength(11);
    expect(list[0].label).toBe('ميزان المراجعة متزن');
    expect(list[10].label).toBe('اعتماد المحاسب');
    expect(list.every((s) => s.status === 'PENDING')).toBe(true);
    expect(list.every((s) => s.required === true)).toBe(true);
  });

  it('fails canFinalize when steps are PENDING', () => {
    const list = createDefaultChecklist();
    const result = canFinalize(list);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBe(11);
  });

  it('fails canFinalize when a step is NA without a note', () => {
    const list = createDefaultChecklist();
    list.forEach((s) => (s.status = 'DONE'));
    list[0].status = 'NA';
    list[0].note = '';

    const result = canFinalize(list);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('ميزان المراجعة متزن (يتطلب مبرر التخطي)');
  });

  it('passes canFinalize when all steps are DONE or NA with note', () => {
    const list = createDefaultChecklist();
    list.forEach((s) => (s.status = 'DONE'));
    list[3].status = 'NA';
    list[3].note = 'لا يوجد مخزون بالنشاط الخدمي';

    const result = canFinalize(list);
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
