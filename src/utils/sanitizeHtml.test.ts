// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeSvg, sanitizePrintHtml } from './sanitizeHtml';

describe('sanitizeHtml utility', () => {
  it('allows safe formatting tags and whitelisted attributes', () => {
    const input = '<div class="test-class" dir="rtl"><p style="color: red;"><b>Hello</b> <strong>Bold</strong> <em>Emphasis</em> <i>Italic</i> <u>Underline</u></p><h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><ul><li>List Item</li></ul><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table></div>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<div');
    expect(result).toContain('<b>Hello</b>');
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>Emphasis</em>');
    expect(result).toContain('<i>Italic</i>');
    expect(result).toContain('<u>Underline</u>');
    expect(result).toContain('<h1>Heading 1</h1>');
    expect(result).toContain('<h2>Heading 2</h2>');
    expect(result).toContain('<h3>Heading 3</h3>');
    expect(result).toContain('<h4>Heading 4</h4>');
    expect(result).toContain('<ul><li>List Item</li></ul>');
    expect(result).toContain('<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>');
    expect(result).toContain('class="test-class"');
    expect(result).toContain('dir="rtl"');
    expect(result).toContain('style="color: red;"');
  });

  it('strips <script> tags completely', () => {
    const input = '<p>Safe Text<script>alert("XSS Attack!");</script></p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Safe Text');
  });

  it('handles null, undefined, and empty string gracefully', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('sanitizeSvg utility', () => {
  it('keeps valid <svg><rect/></svg> and removes <script> and onload', () => {
    const input = '<svg viewBox="0 0 100 100" onload="alert(1)"><rect x="0" y="0" width="100" height="100" fill="red"/><script>alert("xss")</script></svg>';
    const result = sanitizeSvg(input);
    expect(result).toContain('<svg');
    expect(result).toContain('<rect');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onload');
  });
});

describe('sanitizePrintHtml utility', () => {
  it('keeps valid base64 images, <tfoot>, and <svg>, while stripping javascript URLs, <iframe>, <script>, and onerror', () => {
    const validImg = '<img src="data:image/png;base64,AAAA"/>';
    const invalidImg = '<img src="javascript:alert(1)" onerror="alert(2)"/>';
    const printMarkup = '<div><table><tfoot><tr><td>Total</td></tr></tfoot></table><iframe src="evil.com"></iframe><script>evil()</script>' + validImg + invalidImg + '<svg><circle cx="50" cy="50" r="40"/></svg></div>';

    const result = sanitizePrintHtml(printMarkup);

    expect(result).toContain('<tfoot>');
    expect(result).toContain('data:image/png;base64,AAAA');
    expect(result).toContain('<svg');
    expect(result).toContain('<circle');
    expect(result).not.toContain('javascript:alert(1)');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<script');
  });
});
