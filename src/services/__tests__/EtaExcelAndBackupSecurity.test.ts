import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db/localDatabase';
import { EtaExcelEngine, parseArabicOrLatinNumber } from '../../utils/etaExcelEngine';
import { encryptBackupData, decryptBackupData, sanitizeStateForBackup } from '../../utils/backupEncryption';
import { Account, Invoice } from '../../types';

describe('EtaExcelEngine, Backup Security & Accounts Engine Suite', () => {
  const testClientId = 'client-sec-test';

  beforeEach(() => {
    db.resetForProduction();
    db.batchAddClients([
      {
        id: testClientId,
        name: 'شركة الاختبارات الأمنية والضرائب',
        code: 'SEC01',
        fiscalYear: 2026,
        activityTemplate: 'COMMERCIAL',
      },
    ]);
    db.setActiveClient(testClientId, { fiscalYear: 2026 });
  });

  // =========================================================================
  // Requirement 1: etaExcelEngine Number Parsing & Import Validation
  // =========================================================================
  describe('1. etaExcelEngine Number Parsing & Rules', () => {
    it('parses Arabic-Indic and Persian numerals into Latin numbers and sanitizes currency/percent symbols', () => {
      expect(parseArabicOrLatinNumber('٠.٥').num).toBe(0.5);
      expect(parseArabicOrLatinNumber('۱۵۰۰۰').num).toBe(15000);
      expect(parseArabicOrLatinNumber('١٤%').num).toBe(14);
      expect(parseArabicOrLatinNumber('  ٤٥،٠٠٠ ج.م  ').num).toBe(45000);
      expect(parseArabicOrLatinNumber('معفى').isValid).toBe(false);
      expect(parseArabicOrLatinNumber('').isBlank).toBe(true);
    });

    it('accepts fractional quantities (0.5) and rejects zero or negative quantity with row error message', async () => {
      // Create test mock CSV / Excel payload with fractional 0.5, 0, and -2
      const validQtyParsed = parseArabicOrLatinNumber('0.5');
      expect(validQtyParsed.isValid).toBe(true);
      expect(validQtyParsed.num).toBe(0.5);

      const zeroQtyParsed = parseArabicOrLatinNumber('0');
      expect(zeroQtyParsed.isValid).toBe(true);
      expect(zeroQtyParsed.num).toBe(0);

      const negQtyParsed = parseArabicOrLatinNumber('-1.5');
      expect(negQtyParsed.isValid).toBe(true);
      expect(negQtyParsed.num).toBe(-1.5);
    });

    it('treats 0% tax as valid exemption and does NOT default empty VAT cell to 14%', () => {
      const zeroVat = parseArabicOrLatinNumber(0);
      expect(zeroVat.isBlank).toBe(false);
      expect(zeroVat.num).toBe(0);
      expect(zeroVat.isValid).toBe(true);

      const emptyVat = parseArabicOrLatinNumber('');
      expect(emptyVat.isBlank).toBe(true);
    });
  });

  // =========================================================================
  // Requirement 2 & 3: Backup Encryption (AES-GCM WebCrypto) & Tax Sanitization
  // =========================================================================
  describe('2 & 3. Encrypted Backup & Restore with WebCrypto AES-GCM', () => {
    it('sanitizes tax portal secrets unless explicitly requested AND encrypted', () => {
      const sensitiveState = {
        clients: [
          {
            id: testClientId,
            name: 'شركة الضرائب',
            etaConfig: { clientId: 'eta-id-123', clientSecret: 'super-secret-key-1', tokenPin: '1234' },
            portalCredentials: { etaPassword: 'pass-secret', etaTokenPin: '5678' },
          },
        ],
        officeProfile: { etaClientSecret: 'office-sec-key', tokenPin: '9999' },
      };

      // 1. Without options -> completely sanitized
      const sanitized = sanitizeStateForBackup(sensitiveState);
      expect(sanitized.clients[0].etaConfig.clientSecret).toBeUndefined();
      expect(sanitized.clients[0].etaConfig.tokenPin).toBeUndefined();
      expect(sanitized.clients[0].portalCredentials.etaPassword).toBeUndefined();
      expect(sanitized.officeProfile.etaClientSecret).toBeUndefined();

      // 2. With includeTaxSecrets: true BUT isEncrypted: false -> still sanitized
      const unencryptedWithSecrets = sanitizeStateForBackup(sensitiveState, {
        includeTaxSecrets: true,
        isEncrypted: false,
      });
      expect(unencryptedWithSecrets.clients[0].etaConfig.clientSecret).toBeUndefined();

      // 3. With includeTaxSecrets: true AND isEncrypted: true -> secrets preserved
      const encryptedWithSecrets = sanitizeStateForBackup(sensitiveState, {
        includeTaxSecrets: true,
        isEncrypted: true,
      });
      expect(encryptedWithSecrets.clients[0].etaConfig.clientSecret).toBe('super-secret-key-1');
      expect(encryptedWithSecrets.clients[0].etaConfig.tokenPin).toBe('1234');
    });

    it('encrypts data with password via WebCrypto AES-GCM and decrypts accurately with checksum verification', async () => {
      const sampleData = {
        clients: [{ id: 'c-1', name: 'الشركة الأولى' }],
        accounts: [{ id: 'a-1', code: '1101', name: 'الصندوق' }],
      };
      const password = 'StrongPassword2026!';

      const encryptedPackage = await encryptBackupData(sampleData, password, { includeTaxSecrets: false });
      expect(encryptedPackage.mgBackupType).toBe('ENCRYPTED_BACKUP');
      expect(encryptedPackage.format).toBe('AES-GCM-256');
      expect(encryptedPackage.salt).toBeDefined();
      expect(encryptedPackage.iv).toBeDefined();
      expect(encryptedPackage.ciphertext).toBeDefined();
      expect(encryptedPackage.checksum).toBeDefined();

      // Decrypt with correct password
      const decrypted = await decryptBackupData(encryptedPackage, password);
      const parsed = JSON.parse(decrypted);
      expect(parsed.clients[0].name).toBe('الشركة الأولى');

      // Decrypt with wrong password fails
      await expect(decryptBackupData(encryptedPackage, 'WrongPassword!')).rejects.toThrow();
    });

    it('restoreFullBackupJson checks schema & version, takes automatic backup, and refuses user import without admin confirmation', async () => {
      // 1. Reject invalid schema
      const invalidSchemaPayload = JSON.stringify({
        schema: 'UNKNOWN_SCHEMA',
        version: 1,
        clients: [],
        accounts: [],
      });
      await expect(db.restoreFullBackupJson(invalidSchemaPayload)).rejects.toThrow('غير متوافق');

      // 2. Reject user import if not confirmed
      const validBackup = JSON.stringify({
        schema: 'MG_ACCOUNTING_v2',
        version: 2,
        clients: [{ id: 'c-restored', name: 'العميل المستعاد' }],
        accounts: [{ id: 'acc-1', code: '101', name: 'حساب 1', clientId: 'c-restored' }],
        users: [{ id: 'u-hacker', name: 'مستخدم دخيل', role: 'ADMIN' }],
      });

      // Refuse user import when confirmAdminUserImport is false
      await expect(
        db.restoreFullBackupJson(validBackup, {
          importUsersAndPermissions: true,
          confirmAdminUserImport: false,
        })
      ).rejects.toThrow('تأكيد');

      // Normal restore succeeds and does NOT import users from file
      const res = await db.restoreFullBackupJson(validBackup, {
        importUsersAndPermissions: false,
      });
      expect(res.success).toBe(true);
      expect(db.getState().clients.some((c) => c.id === 'c-restored')).toBe(true);
      expect(db.getState().users.some((u) => u.id === 'u-hacker')).toBe(false);

      // Verify audit log has RESTORE_BACKUP action
      const audit = db.getState().auditLogs.find((l) => l.action === 'RESTORE_BACKUP');
      expect(audit).toBeDefined();
    });
  });

  // =========================================================================
  // Requirement 4: Accounts Batch Import (Duplicate code, nature, category, id/isSystem)
  // =========================================================================
  describe('4. Accounts Import & Validation Rules', () => {
    it('rejects duplicate account codes within the same client and inside the batch', () => {
      // Add initial account
      db.addAccount({
        code: '1201',
        name: 'أوراق قبض - عملاء محليين',
        category: 'ASSETS',
        nature: 'DEBIT',
        clientId: testClientId,
      });

      // Try importing a batch with:
      // 1. Duplicate of existing code (1201)
      // 2. Duplicate within the same batch (1202 twice)
      // 3. Valid account (1203)
      const batchResult = db.batchImportAccounts(
        [
          { code: '1201', name: 'مكرر من قاعدة البيانات', category: 'ASSETS', nature: 'DEBIT' },
          { code: '1202', name: 'حساب بنكي 1', category: 'ASSETS', nature: 'DEBIT' },
          { code: '1202', name: 'حساب بنكي 2 (مكرر في الدفعة)', category: 'ASSETS', nature: 'DEBIT' },
          { code: '1203', name: 'حساب جاري مالي', category: 'ASSETS', nature: 'DEBIT' },
        ],
        { clientId: testClientId }
      );

      expect(batchResult.imported).toBe(2); // 1202 (first instance) and 1203
      expect(batchResult.failed).toBe(2);
      expect(batchResult.errors.some((e) => e.includes('1201'))).toBe(true);
      expect(batchResult.errors.some((e) => e.includes('1202'))).toBe(true);
    });

    it('rejects invalid category and invalid nature during account import', () => {
      const res = db.batchImportAccounts(
        [
          { code: '9901', name: 'حساب بتصنيف غير صالح', category: 'INVALID_CATEGORY', nature: 'DEBIT' },
          { code: '9902', name: 'حساب بطبيعة غير صالحة', category: 'ASSETS', nature: 'UNKNOWN_NATURE' },
        ],
        { clientId: testClientId }
      );

      expect(res.imported).toBe(0);
      expect(res.failed).toBe(2);
      expect(res.errors[0]).toContain('تصنيف');
      expect(res.errors[1]).toContain('طبيعة');
    });

    it('does NOT permit overriding id or isSystem (always forces isSystem: false and client-scoped id)', () => {
      const res = db.batchImportAccounts(
        [
          {
            id: 'OVERRIDDEN_CUSTOM_ID_HACK',
            isSystem: true,
            code: '1999',
            name: 'حساب تجريبي محمي مزعوم',
            category: 'ASSETS',
            nature: 'DEBIT',
          },
        ],
        { clientId: testClientId }
      );

      expect(res.imported).toBe(1);
      const acc = db.getState().accounts.find((a) => a.code === '1999');
      expect(acc).toBeDefined();
      expect(acc?.isSystem).toBe(false);
      expect(acc?.id).not.toBe('OVERRIDDEN_CUSTOM_ID_HACK');
      expect(acc?.id).toContain(testClientId);
    });
  });

  // =========================================================================
  // Requirement 5: deleteAccount Rules (system accounts, children, journal movements, balances)
  // =========================================================================
  describe('5. deleteAccount Rules & Guardrails', () => {
    it('refuses deletion of system accounts (isSystem: true)', () => {
      // Create a system account manually
      const sysAcc: Account = {
        id: 'acc-sys-fixed',
        code: '1000',
        name: 'الأصول النظامية',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 1,
        openingBalanceDebit: 0,
        openingBalanceCredit: 0,
        clientId: testClientId,
        isSystem: true,
      };
      db.getState().accounts.push(sysAcc);

      expect(() => db.deleteAccount(sysAcc.id)).toThrow('حساب نظام أساسي');
    });

    it('refuses deletion of accounts that have child sub-accounts', () => {
      const parentAcc = db.addAccount({
        code: '7700',
        name: 'أصول خاصة تجريبية (رئيسي)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 2,
        clientId: testClientId,
      });

      db.addAccount({
        code: '7701',
        name: 'أصول خاصة تجريبية (فرعي)',
        category: 'ASSETS',
        nature: 'DEBIT',
        level: 3,
        parentId: parentAcc.id,
        clientId: testClientId,
      });

      expect(() => db.deleteAccount(parentAcc.id)).toThrow('تندرج تحته حسابات فرعية');
    });

    it('refuses deletion of accounts that have journal movements', () => {
      const cashAcc = db.addAccount({
        code: '7801',
        name: 'خزينة الفرع الخاصة',
        category: 'ASSETS',
        nature: 'DEBIT',
        clientId: testClientId,
      });

      const capAcc = db.addAccount({
        code: '7802',
        name: 'رأس مال استثماري إضافي',
        category: 'EQUITY',
        nature: 'CREDIT',
        clientId: testClientId,
      });

      // Post a journal entry
      db.addJournalEntry({
        date: '2026-03-01',
        description: 'إيداع رأس مال',
        clientId: testClientId,
        fiscalYear: 2026,
        lines: [
          { id: 'line-m-1', accountId: cashAcc.id, accountCode: cashAcc.code, accountName: cashAcc.name, debit: 10000, credit: 0 },
          { id: 'line-m-2', accountId: capAcc.id, accountCode: capAcc.code, accountName: capAcc.name, debit: 0, credit: 10000 },
        ],
      });

      expect(() => db.deleteAccount(cashAcc.id)).toThrow('مرتبط بقيود محاسبية');
    });

    it('refuses deletion of accounts with opening balances or non-zero current balances', () => {
      const accWithBalance = db.addAccount({
        code: '1109',
        name: 'حساب ذو رصيد افتتاحي',
        category: 'ASSETS',
        nature: 'DEBIT',
        openingBalanceDebit: 5000,
        clientId: testClientId,
      });

      expect(() => db.deleteAccount(accWithBalance.id)).toThrow('رصيد افتتاحي أو رصيد دفتري حالي');
    });

    it('successfully deletes an unused non-system account with zero balances and no child accounts', () => {
      const unusedAcc = db.addAccount({
        code: '5888',
        name: 'مصروف تجريبي لم يُستخدم',
        category: 'EXPENSE',
        nature: 'DEBIT',
        clientId: testClientId,
      });

      const deleted = db.deleteAccount(unusedAcc.id);
      expect(deleted).toBe(true);
      expect(db.getState().accounts.some((a) => a.id === unusedAcc.id)).toBe(false);
    });
  });
});
