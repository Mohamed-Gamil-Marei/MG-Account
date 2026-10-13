import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Database from 'better-sqlite3';

export interface ResetUsersOptions {
  dbPath?: string;
  backupDir?: string;
  autoConfirm?: boolean;
  inputConfirmation?: string;
}

export interface ResetUsersResult {
  success: boolean;
  deletedCount?: number;
  backupPath?: string;
  reason?: string;
}

export async function resetUsersProcess(options: ResetUsersOptions = {}): Promise<ResetUsersResult> {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const targetDbPath = options.dbPath || path.join(dataDir, 'app.db');
  const targetBackupDir = options.backupDir || process.env.BACKUP_DIR || path.join(dataDir, 'backups');

  if (!fs.existsSync(targetDbPath)) {
    console.error(`❌ قاعدة البيانات غير موجودة في المسار: ${targetDbPath}`);
    return { success: false, reason: 'db_not_found' };
  }

  if (!fs.existsSync(targetBackupDir)) {
    fs.mkdirSync(targetBackupDir, { recursive: true });
  }

  const db = new Database(targetDbPath);

  // 1. Take a full database backup before deletion (await async backup in better-sqlite3)
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(targetBackupDir, `backup_reset_users_${timestampStr}`);
  fs.mkdirSync(backupFolder, { recursive: true });
  const backupDbPath = path.join(backupFolder, 'app.db');

  console.log(`📦 جاري إنشاء نسخة احتياطية كاملة من قاعدة البيانات...`);
  await db.backup(backupDbPath);
  console.log(`✅ تم حفظ النسخة الاحتياطية بنجاح في: ${backupDbPath}`);

  // 2. Perform PRAGMA integrity_check on the backup
  console.log(`🔍 جاري فحص سلامة النسخة الاحتياطية (Integrity Check)...`);
  const backupDb = new Database(backupDbPath);
  const integrityRow = backupDb.prepare('PRAGMA integrity_check').get() as any;
  backupDb.close();

  const integrityResult = integrityRow ? Object.values(integrityRow)[0] : 'unknown';
  if (integrityResult !== 'ok') {
    console.error(`❌ فشل فحص سلامة النسخة الاحتياطية! النتيجة: ${integrityResult}`);
    db.close();
    return { success: false, reason: 'integrity_check_failed' };
  }
  console.log(`✅ نتيجة فحص السلامة: ${integrityResult} (البيانات سليمة ومضمونة).`);

  // Helper to run deletion inside transaction
  const performDeletion = () => {
    let deletedCount = 0;
    const nowIso = new Date().toISOString();

    const tx = db.transaction(() => {
      // Get count before deleting
      const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      deletedCount = userCountRow ? userCountRow.count : 0;

      // Delete only from users, sessions, and login_attempts
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM login_attempts').run();

      // Record audit log entry in auditLogs table
      const auditId = `audit-reset-users-${Date.now()}`;
      const auditRecord = {
        id: auditId,
        action: 'RESET_USERS',
        entity: 'users',
        recordId: 'all',
        userName: 'CLI Admin (scripts/reset-users.ts)',
        timestamp: nowIso,
        details: `تم تفريغ كافة حسابات الدخول والجلسات ومحاولات الدخول عبر سكريبت الصيانة (عدد الحسابات المحذوفة: ${deletedCount})`,
      };

      db.prepare(`
        INSERT INTO auditLogs (id, data, updated_at, version, updated_by)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET data = ?, updated_at = ?, version = version + 1, updated_by = ?
      `).run(
        auditId,
        JSON.stringify(auditRecord),
        nowIso,
        'CLI Admin',
        JSON.stringify(auditRecord),
        nowIso,
        'CLI Admin'
      );
    });

    tx();
    return deletedCount;
  };

  if (options.autoConfirm) {
    if (options.inputConfirmation === 'RESET-USERS') {
      const deletedCount = performDeletion();
      db.close();
      printSuccessSummary(deletedCount, backupDbPath);
      return { success: true, deletedCount, backupPath: backupDbPath };
    } else {
      console.log(`⚠️ تم إدخال تأكيد غير مطابق ("${options.inputConfirmation}"). تم إلغاء العملية ولم يتم حذف أي بيانات.`);
      db.close();
      return { success: false, reason: 'cancelled' };
    }
  }

  // Interactive CLI prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<ResetUsersResult>((resolve) => {
    rl.question(`\n⚠️ لتأكيد تفريغ جميع حسابات الدخول المحلية، اكتب كلمة "RESET-USERS":\n> `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === 'RESET-USERS') {
        const deletedCount = performDeletion();
        db.close();
        printSuccessSummary(deletedCount, backupDbPath);
        resolve({ success: true, deletedCount, backupPath: backupDbPath });
      } else {
        console.log(`\n❌ تم إلغاء العملية بناءً على إدخالك ("${trimmed}"). لم يتم حذف أي حساب أو ملف.`);
        db.close();
        resolve({ success: false, reason: 'cancelled' });
      }
    });
  });
}

function printSuccessSummary(deletedCount: number, backupPath: string) {
  console.log(`\n======================================================`);
  console.log(`🎉 اكتملت عملية تفريغ حسابات الدخول بنجاح!`);
  console.log(`======================================================`);
  console.log(`📊 عدد الحسابات المحذوفة: ${deletedCount} حساب.`);
  console.log(`💾 النسخة الاحتياطية الموثقة: ${backupPath}`);
  console.log(`------------------------------------------------------`);
  console.log(`📌 ملاحظة هامة للنظام المحلي (SQLite):`);
  console.log(`- أول زيارة للتطبيق عبر المتصفح ستفتح شاشة إعداد المدير الرئيسي (setup-admin).`);
  console.log(`- تذكر أن متغير البيئة SETUP_TOKEN مطلوب في بيئة الإنتاج لإنشاء أول مدير.`);
  console.log(`------------------------------------------------------`);
  console.log(`☁️ ملاحظة خاصة بوضع الخدمة السحابية (Firebase Cloud Mode):`);
  console.log(`- هذا السكريبت قام بتفريغ قاعدة البيانات المحلية SQLite فقط.`);
  console.log(`- في حالة تفعيل Firebase، يجب حذف المستخدمين يدوياً من Firebase Console.`);
  console.log(`- يتم إنشاء أول مدير سحابي ADMIN أيضاً من خلال Firebase Console أو بوابة الإدارة.`);
  console.log(`======================================================\n`);
}

// If invoked directly via CLI
if (process.argv[1] && process.argv[1].includes('reset-users')) {
  resetUsersProcess();
}
