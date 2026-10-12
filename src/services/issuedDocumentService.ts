import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateVerificationCode } from '../utils/verificationCode';

import { db as localDb } from '../db/localDatabase';

/**
 * Public document record stored in Firestore `issuedDocuments/{verificationCode}`.
 * Strict privacy: NO clientName, NO amount, NO clientId.
 * Contains ONLY:
 * - documentType (نوع المستند)
 * - issueDate (تاريخ الإصدار)
 * - firmName (اسم المكتب)
 * - status (الحالة: ACTIVE / CANCELLED - سارية / ملغاة)
 * - displayDocNumber (رقم المستند المعروض)
 * - verificationCode (كود التحقق العشوائي الطويل)
 */
export interface PublicIssuedDocumentRecord {
  verificationCode: string;
  documentType: string;
  issueDate: string;
  firmName: string;
  status: 'ACTIVE' | 'CANCELLED';
  displayDocNumber: string;
  createdAt?: string;
}

export type GetIssuedDocumentResult =
  | { status: 'FOUND'; record: PublicIssuedDocumentRecord }
  | { status: 'NOT_FOUND' }
  | { status: 'ERROR'; error: string };

export class IssuedDocumentService {
  /**
   * Generates a 24-char cryptographic verification code
   */
  public static createVerificationCode(): string {
    return generateVerificationCode(24);
  }

  /**
   * Unified helper to generate verification code and record document in Firestore registry.
   * Reads firmName from db.getState().officeProfile (firmName then name).
   */
  public static issueVerifiedDocument(params: {
    documentType: string;
    displayDocNumber: string;
    issueDate?: string;
  }): { verificationCode: string; registered: Promise<boolean> } {
    const verificationCode = IssuedDocumentService.createVerificationCode();
    const officeProfile = localDb.getState()?.officeProfile;
    const firmName = officeProfile?.firmName?.trim() || officeProfile?.name?.trim() || '—';
    const issueDate = params.issueDate || new Date().toISOString().slice(0, 10);

    const registered = IssuedDocumentService.recordIssuedDocument({
      verificationCode,
      documentType: params.documentType,
      issueDate,
      firmName,
      status: 'ACTIVE',
      displayDocNumber: params.displayDocNumber,
    }).then(res => res.success).catch(() => false);

    return { verificationCode, registered };
  }

  /**
   * Registers a public issued document in Firestore `issuedDocuments/{verificationCode}`.
   * Throws on failure so caller can notify user with a retry option.
   */
  public static async recordIssuedDocument(record: {
    verificationCode: string;
    documentType: string;
    issueDate: string;
    firmName: string;
    status?: 'ACTIVE' | 'CANCELLED';
    displayDocNumber: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, 'issuedDocuments', record.verificationCode);
      const publicData: PublicIssuedDocumentRecord = {
        verificationCode: record.verificationCode,
        documentType: record.documentType,
        issueDate: record.issueDate,
        firmName: record.firmName,
        status: record.status || 'ACTIVE',
        displayDocNumber: record.displayDocNumber,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, publicData, { merge: true });
      return { success: true };
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[IssuedDocumentService] Failed to record issued document ${record.verificationCode}:`, msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Reads a public issued document record from Firestore collection 'issuedDocuments' by verificationCode
   */
  public static async getIssuedDocument(verificationCode: string): Promise<GetIssuedDocumentResult> {
    try {
      const code = verificationCode ? verificationCode.trim() : '';
      if (!code) {
        return { status: 'NOT_FOUND' };
      }
      const docRef = doc(db, 'issuedDocuments', code);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return { status: 'NOT_FOUND' };
      }
      return { status: 'FOUND', record: snap.data() as PublicIssuedDocumentRecord };
    } catch (err: any) {
      console.warn(`[IssuedDocumentService] Failed to fetch issued document ${verificationCode}:`, err);
      return { status: 'ERROR', error: err?.message || String(err) };
    }
  }
}
