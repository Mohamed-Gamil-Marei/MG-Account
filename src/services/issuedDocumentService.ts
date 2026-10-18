import { getCairoDateString } from '../utils/cairoTime';

export interface IssuedDocumentRecord {
  verificationCode: string;
  documentType: string;
  issueDate: string;
  firmName: string;
  status: 'ACTIVE' | 'REVOKED';
  displayDocNumber: string;
  clientId?: string;
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
}
