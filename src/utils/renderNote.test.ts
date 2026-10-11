import { describe, it, expect } from 'vitest';
import { renderNote } from './renderNote';

describe('renderNote utility', () => {
  it('replaces known variables correctly', () => {
    const template = 'شركة {{اسم_الشركة}} عن سنة {{السنة}} بتاريخ {{تاريخ_القوائم}}.';
    const context = {
      اسم_الشركة: 'النور للاستثمار',
      السنة: 2026,
      تاريخ_القوائم: '2026-12-31',
    };
    const { renderedText, warnings } = renderNote(template, context);
    expect(renderedText).toBe('شركة النور للاستثمار عن سنة 2026 بتاريخ 2026-12-31.');
    expect(warnings).toHaveLength(0);
  });

  it('leaves unknown variables as is and adds warning', () => {
    const template = 'شركة {{اسم_الشركة}} برأس مال {{رأس_المال}} عن سنة {{السنة}}.';
    const context = {
      اسم_الشركة: 'السلام',
      السنة: 2026,
    };
    const { renderedText, warnings } = renderNote(template, context);
    expect(renderedText).toContain('{{رأس_المال}}');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('رأس_المال');
  });

  it('handles blanks or missing context gracefully', () => {
    const template = 'شركة {{اسم_الشركة}} عن سنة {{السنة}}.';
    const { renderedText, warnings } = renderNote(template, {});
    expect(renderedText).toContain('{{اسم_الشركة}}');
    expect(renderedText).toContain('{{السنة}}');
    expect(warnings).toHaveLength(2);
  });
});
