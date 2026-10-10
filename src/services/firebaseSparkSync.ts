import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

export const FIREBASE_COLLECTIONS = [
  "clients",
  "accounts",
  "journalEntries",
  "treasury",
  "taxDeclarations",
  "taxAudits",
  "invoices",
  "certificates",
  "auditLogs",
  "taxMandates",
  "fixedAssets",
  "feeEstimates",
  "preferences",
  "systemUsers"
];

export class FirebaseSparkSync {
  public static async migrateLocalStorageToFirebase(state: any, currentUser: any): Promise<{ success: boolean; message: string; summary: string }> {
    try {
      let totalMigrated = 0;
      const timestamp = new Date().toISOString();
      const userName = currentUser?.name || "مدير النظام";

      for (const colName of FIREBASE_COLLECTIONS) {
        let items: any[] = [];
        if (colName === 'clients') items = state.clients || [];
        else if (colName === 'accounts') items = state.accounts || [];
        else if (colName === 'journalEntries') items = state.journalEntries || [];
        else if (colName === 'treasury') items = state.treasuryTransactions || [];
        else if (colName === 'taxDeclarations') items = state.taxDeclarations || [];
        else if (colName === 'taxAudits') items = state.taxAudits || [];
        else if (colName === 'invoices') items = state.invoices || [];
        else if (colName === 'certificates') items = state.certificates || [];
        else if (colName === 'auditLogs') items = state.auditLogs || [];
        else if (colName === 'taxMandates') items = state.taxMandates || [];
        else if (colName === 'fixedAssets') items = state.fixedAssets || [];
        else if (colName === 'feeEstimates') items = state.feeEstimates || [];
        else if (colName === 'systemUsers') items = state.users || [];

        for (const item of items) {
          const id = String(item.id || item.code || crypto.randomUUID());
          const docRef = doc(db, colName, id);
          const payload = {
            ...item,
            id,
            clientId: item.clientId || item.clientCode || 'GENERAL',
            fiscalYear: item.fiscalYear || item.year || '2026',
            updatedAt: timestamp,
            updatedBy: userName,
          };
          await setDoc(docRef, payload, { merge: true });
          totalMigrated++;
        }
      }

      const summary = `تم ترحيل ${totalMigrated} سجل بنجاح إلى مجموعات Firestore المنفصلة.`;
      return { success: true, message: "تم ترحيل البيانات بنجاح إلى Firebase.", summary };
    } catch (err: any) {
      console.error("Migration error:", err);
      return { success: false, message: `فشل الترحيل: ${err.message}`, summary: "" };
    }
  }

  public static async checkConflictAndSave(colName: string, id: string, newData: any, currentUser: any): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, colName, id);
      const existingSnap = await getDoc(docRef);
      const timestamp = new Date().toISOString();
      const userName = currentUser?.name || "مستخدم نظام";

      if (existingSnap.exists()) {
        const remoteData = existingSnap.data();
        if (remoteData.updatedAt && newData.updatedAt && new Date(remoteData.updatedAt) > new Date(newData.updatedAt)) {
          return {
            success: false,
            error: `تعارض التعديل: تم تحديث هذا السجل مؤخراً بواسطة (${remoteData.updatedBy || 'مستخدم آخر'}). تم رفض الكتابة لحماية أحدث بيانات.`
          };
        }
      }

      const payload = {
        ...newData,
        id,
        updatedAt: timestamp,
        updatedBy: userName,
      };

      await setDoc(docRef, payload, { merge: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
