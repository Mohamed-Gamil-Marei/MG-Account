import DOMPurify from 'dompurify';

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(String(input), {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'b', 'strong', 'em', 'i', 'u', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre', 'small', 'sub', 'sup',
    ],
    ALLOWED_ATTR: ['class', 'dir', 'style', 'align', 'colspan', 'rowspan', 'id', 'title'],
  });
}

export function sanitizeSvg(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(String(input), {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['svg', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'g', 'defs', 'style', 'title'],
    ADD_ATTR: [
      'xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width',
      'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'rx', 'ry', 'cx', 'cy', 'r',
      'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'text-anchor', 'dominant-baseline',
      'font-size', 'font-family', 'font-weight', 'class', 'style', 'id', 'opacity',
    ],
  });
}

export function sanitizePrintHtml(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = DOMPurify.sanitize(String(input), {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: [
      'style', 'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'g', 'defs',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'img',
    ],
    ADD_ATTR: [
      'class', 'dir', 'style', 'id', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan',
      'xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y', 'cx', 'cy', 'r',
      'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'transform',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  });
  return cleaned.replace(/src=["']\s*javascript:[^"']*["']/gi, '');
}
