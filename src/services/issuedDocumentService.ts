import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface IssuedDocumentRecord {
  documentNumber: string;
  documentType: string; // 'شهادة مهنية معتمدة' | 'القوائم المالية والمركز المالي المعتمد' | 'فاتورة أتعاب مهنية' | string
  issueDate: string;
  firmName: string;
  status: 'ACTIVE' | 'CANCELLED'; // سارية / ملغاة
  clientName?: string;
  clientId?: string;
  fiscalYear?: number | string;
  amount?: number;
  securityHash?: string;
  createdAt?: string;
}

export class IssuedDocumentService {
  /**
   * Registers or updates an issued document record in Firestore collection 'issuedDocuments'
   */
  public static async recordIssuedDocument(record: IssuedDocumentRecord): Promise<void> {
    try {
      const docRef = doc(db, 'issuedDocuments', record.documentNumber);
      await setDoc(docRef, {
        ...record,
        status: record.status || 'ACTIVE',
        createdAt: record.createdAt || new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn(`[IssuedDocumentService] Failed to record issued document ${record.documentNumber} in Firestore:`, err);
    }
  }

  /**
   * Reads an issued document record from Firestore collection 'issuedDocuments' by documentNumber
   */
  public static async getIssuedDocument(documentNumber: string): Promise<IssuedDocumentRecord | null> {
    try {
      const docRef = doc(db, 'issuedDocuments', documentNumber);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return null;
      }
      return snap.data() as IssuedDocumentRecord;
    } catch (err) {
      console.warn(`[IssuedDocumentService] Failed to fetch issued document ${documentNumber} from Firestore:`, err);
      return null;
    }
  }
}
