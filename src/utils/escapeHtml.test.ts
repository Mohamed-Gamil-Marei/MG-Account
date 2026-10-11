import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('escapeHtml utility', () => {
  it('handles normal text correctly without changes', () => {
    expect(escapeHtml('شركة الأمل للتجارة')).toBe('شركة الأمل للتجارة');
    expect(escapeHtml(2026)).toBe('2026');
  });

  it('escapes <script> tags and HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes quotes and ampersands correctly', () => {
    expect(escapeHtml('Tom & "Jerry"\'s')).toBe('Tom &amp; &quot;Jerry&quot;&#39;s');
  });

  it('handles null and undefined gracefully', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
