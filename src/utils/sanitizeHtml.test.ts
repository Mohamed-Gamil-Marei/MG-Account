// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

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

  it('strips <img onerror> and all inline event handlers', () => {
    const input = '<p><img src="invalid.jpg" onerror="alert(document.cookie)"><span onclick="badFunction()">Click</span><button onmouseover="evil()">Hover</button></p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('<button'); // button is not in ALLOWED_TAGS
  });

  it('strips javascript: pseudo-protocol in href or links', () => {
    const input = '<p><a href="javascript:alert(\'hacked\')">Malicious Link</a></p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('alert');
  });

  it('strips <iframe> and embeds', () => {
    const input = '<div>Safe Content<iframe src="https://evil.com"></iframe><embed src="evil.swf"></div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<embed');
    expect(result).toContain('Safe Content');
  });

  it('handles null, undefined, and empty string gracefully', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});
