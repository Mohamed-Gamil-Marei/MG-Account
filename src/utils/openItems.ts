import { OpenItem, OpenItemKind, OpenItemStatus } from '../types';

export type { OpenItem, OpenItemKind, OpenItemStatus };

export function formatOpenItemKindLabel(kind: OpenItemKind): string {
  switch (kind) {
    case 'DOCUMENT':
      return 'مستند مطلوب';
    case 'QUESTION':
      return 'استفسار/توضيح';
    case 'ADJUSTMENT':
      return 'تسوية/قيد معلق';
    default:
      return 'بند آخر';
  }
}

export function formatOpenItemStatusLabel(status: OpenItemStatus): string {
  switch (status) {
    case 'OPEN':
      return 'مفتوح (قيد الانتظار)';
    case 'RECEIVED':
      return 'تم الاستلام/الرد';
    case 'CLOSED':
      return 'مغلق والمعتمد';
    default:
      return status;
  }
}

/**
 * Formats a clear Arabic text message to send to the client (via WhatsApp, Email, or Print).
 */
export function formatOpenItemsTextForClient(
  clientName: string,
  fiscalYear: number | string,
  items: OpenItem[],
  officeName?: string
): string {
  const openList = items.filter((i) => i.status === 'OPEN' || i.status === 'RECEIVED');

  if (openList.length === 0) {
    return `السادة/ ${clientName}\nتحية طيبة وبعد،،\nنفيدكم بأنه لا توجد أي بنود مفتوحة أو مستندات معلقة مطلوبة عن السنة المالية ${fiscalYear}.\n\nشاكرين تعاونكم.`;
  }

  const lines = openList.map((item, index) => {
    const kindLabel = formatOpenItemKindLabel(item.kind);
    const dueStr = item.dueDate ? ` (الموعد المستهدف: ${item.dueDate})` : '';
    return `${index + 1}. [${kindLabel}] ${item.text}${dueStr}`;
  });

  return `السادة/ ${clientName}\nتحية طيبة وبعد،،\n\nبرجاء التكرم بتقديم وتوفير البنود والمستندات التالية لاستكمال أعمال المراجعة عن السنة المالية ${fiscalYear}:\n\n${lines.join('\n')}\n\nشاكرين حسن تعاونكم الدائم،\n${officeName || 'مكتب المحاسبة والمراجعة المعتمد'}`;
}
