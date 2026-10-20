import { getCairoDateString } from '../utils/cairoTime';

export interface IssuedDocumentRecord {
  verificationCode: string;
  documentType: string;
  issueDate: string;
  firmName: string;
  status: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
  displayDocNumber: string;
  clientId?: string;
  fiscalYear?: number;
  version?: number;
  securityHash?: string;
  supersededAt?: string;
  supersededByVersion?: number;
  supersededByVerificationCode?: string;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  netProfit?: number;
}

export interface DocumentVerificationResult {
  valid: boolean;
  status: 'VALID' | 'SUPERSEDED' | 'REVOKED' | 'NOT_FOUND';
  statusLabelAr: string;
  record?: IssuedDocumentRecord;
  supersededAt?: string;
  supersededByVersion?: number;
  supersededByVerificationCode?: string;
}

export class IssuedDocumentService {
  private static registry: Map<string, IssuedDocumentRecord> = new Map();

  public static async recordIssuedDocument(
    doc: IssuedDocumentRecord
  ): Promise<{ success: boolean; verificationCode: string }> {
    const normalized: IssuedDocumentRecord = {
      ...doc,
      issueDate: doc.issueDate || getCairoDateString(),
    };
    this.registry.set(normalized.verificationCode, normalized);
    return {
      success: true,
      verificationCode: normalized.verificationCode,
    };
  }

  public static getIssuedDocument(verificationCode: string): IssuedDocumentRecord | undefined {
    return this.registry.get(verificationCode);
  }

  public static markDocumentSuperseded(
    oldVerificationCode: string,
    meta: {
      supersededAt: string;
      supersededByVersion?: number;
      supersededByVerificationCode?: string;
    }
  ): IssuedDocumentRecord | undefined {
    const existing = this.registry.get(oldVerificationCode);
    if (!existing) return undefined;
    const updated: IssuedDocumentRecord = {
      ...existing,
      status: 'SUPERSEDED',
      supersededAt: meta.supersededAt,
      supersededByVersion: meta.supersededByVersion,
      supersededByVerificationCode: meta.supersededByVerificationCode,
    };
    this.registry.set(oldVerificationCode, updated);
    return updated;
  }

  public static verifyDocument(codeOrQrPayload: string): DocumentVerificationResult {
    const raw = String(codeOrQrPayload || '').trim();
    if (!raw) {
      return {
        valid: false,
        status: 'NOT_FOUND',
        statusLabelAr: 'كود التحقق غير موجود',
      };
    }

    // Try direct code lookup or extract code from QR text
    let code = raw;
    const codeMatch = raw.match(/كود التحقق:\s*([^\n\r]+)/);
    if (codeMatch?.[1]) {
      code = codeMatch[1].trim();
    }

    const record = this.registry.get(code) || this.registry.get(raw);
    if (record) {
      if (record.status === 'SUPERSEDED') {
        const dateStr = (record.supersededAt || '').slice(0, 10) || getCairoDateString();
        return {
          valid: false,
          status: 'SUPERSEDED',
          statusLabelAr: `هذا الإصدار تم استبداله بإصدار أحدث بتاريخ ${dateStr}${
            record.supersededByVersion ? ` (الإصدار رقم ${record.supersededByVersion})` : ''
          }`,
          record,
          supersededAt: record.supersededAt,
          supersededByVersion: record.supersededByVersion,
          supersededByVerificationCode: record.supersededByVerificationCode,
        };
      }
      if (record.status === 'REVOKED') {
        return {
          valid: false,
          status: 'REVOKED',
          statusLabelAr: 'هذا الإصدار ملغى',
          record,
        };
      }
      return {
        valid: true,
        status: 'VALID',
        statusLabelAr: 'سليم',
        record,
      };
    }

    // Check if QR payload text itself indicates SUPERSEDED
    const supersededMatch = raw.match(/هذا الإصدار تم استبداله بإصدار أحدث بتاريخ\s*([^\n\r]+)/);
    if (supersededMatch) {
      return {
        valid: false,
        status: 'SUPERSEDED',
        statusLabelAr: `هذا الإصدار تم استبداله بإصدار أحدث بتاريخ ${supersededMatch[1].trim()}`,
      };
    }

    return {
      valid: false,
      status: 'NOT_FOUND',
      statusLabelAr: 'كود التحقق غير مسجل',
    };
  }
}

