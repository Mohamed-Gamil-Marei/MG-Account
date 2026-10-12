import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'b',
      'strong',
      'i',
      'em',
      'u',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'span',
      'div',
    ],
    ALLOWED_ATTR: ['style', 'dir', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}
