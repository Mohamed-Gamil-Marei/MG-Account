import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div',
    ],
    ALLOWED_ATTR: ['style', 'dir', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeSvg(svg: string | null | undefined): string {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeypress', 'onkeyup'
    ],
  });
}

export function sanitizePrintHtml(html: string | null | undefined): string {
  if (!html) return '';

  DOMPurify.addHook('uponSanitizeAttribute', (node: any, data: any) => {
    if (data.attrName === 'src' && node.nodeName && node.nodeName.toLowerCase() === 'img') {
      const srcVal = data.attrValue.trim().toLowerCase();
      const isAllowedBase64 = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i.test(srcVal);
      if (!isAllowedBase64) {
        data.attrValue = '';
      }
    }
  });

  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'caption', 'colgroup', 'col', 'hr', 'small', 'sub', 'sup', 'section', 'header', 'footer',
        'span', 'div', 'img',
        'svg', 'g', 'rect', 'path', 'circle', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'linearGradient', 'stop', 'clipPath'
      ],
      ALLOWED_ATTR: [
        'style', 'dir', 'class', 'colspan', 'rowspan', 'width', 'height',
        'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y', 'cx', 'cy', 'r', 'points', 'transform', 'alt', 'src',
        'text-anchor', 'font-size', 'font-family', 'font-weight', 'shape-rendering', 'fill-rule', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'opacity'
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
        'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeypress', 'onkeyup'
      ],
      ALLOW_DATA_ATTR: false,
    });
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute');
  }
}
