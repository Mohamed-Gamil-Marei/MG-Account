import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateVerificationCode } from '../utils/verificationCode';

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

export class IssuedDocumentService {
  /**
   * Generates a 24-char cryptographic verification code
   */
  public static createVerificationCode(): string {
    return generateVerificationCode(24);
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
  public static async getIssuedDocument(verificationCode: string): Promise<PublicIssuedDocumentRecord | null> {
    try {
      const docRef = doc(db, 'issuedDocuments', verificationCode.trim());
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return null;
      }
      return snap.data() as PublicIssuedDocumentRecord;
    } catch (err) {
      console.warn(`[IssuedDocumentService] Failed to fetch issued document ${verificationCode}:`, err);
      return null;
    }
  }
}
