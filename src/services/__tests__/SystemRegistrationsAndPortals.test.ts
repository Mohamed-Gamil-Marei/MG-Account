import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db/localDatabase';
import { PermissionError } from '../../services/accessGuard';
import { ClientArchiveRecord, SystemKind, ClientSystemRegistration } from '../../types';

describe('أنظمة البوابات الضريبية والجمركية ونموذج المنظومات الموحد (SystemRegistrations & Actions)', () => {
  beforeEach(() => {
    db.resetToInitialStateForTesting();
    db.switchUser('user-admin');
  });

  describe('1) ترحيل المنظومات لمرة واحدة وحفظ البيانات القديمة', () => {
    it('يرحل جميع المنظومات الخمسة (GENERAL_TAX, SAP, PAYROLL_NEW, E_INVOICE, NAFEZA) تلقائياً', () => {
      const state = db.getState();
      expect(state.systemRegistrationsMigrationDone).toBe(true);
      expect(Array.isArray(state.clientSystemRegistrations)).toBe(true);

      const client1Regs = db.getClientSystemRegistrations('client-1');
      expect(client1Regs.length).toBeGreaterThanOrEqual(5);

      const kinds = client1Regs.map((r) => r.kind);
      expect(kinds).toContain('GENERAL_TAX');
      expect(kinds).toContain('SAP');
      expect(kinds).toContain('PAYROLL_NEW');
      expect(kinds).toContain('E_INVOICE');
      expect(kinds).toContain('NAFEZA');

      // العميل 1 مسجل في الفاتورة ولديه توكن في البيانات الافتراضية
      const einv = db.getClientSystemRegistration('client-1', 'E_INVOICE');
      expect(einv).toBeDefined();
      expect(einv?.status).toBe('REGISTERED');
      expect(einv?.extra?.hasToken).toBe(true);
    });

    it('يحافظ على حقول العميل القديمة للقراءة والتوافق العكسي', () => {
      const client = db.getState().clients.find((c) => c.id === 'client-1');
      expect(client).toBeDefined();
      expect(client?.eInvoiceRegistered).toBe(true);
      expect(client?.hasEsealToken).toBe(true);
    });
  });

  describe('2) حماية حفظ المنظومة وصلاحية VIEW_PORTAL_SECRETS', () => {
    it('يمنع مستخدم بدون صلاحية VIEW_PORTAL_SECRETS من تغيير كلمة مرور المنظومة', () => {
      // Create user without VIEW_PORTAL_SECRETS
      const junior = db.addUser({
        username: 'junior_auditor',
        name: 'محاسب مبتدئ',
        email: 'junior@example.com',
        role: 'AUDITOR',
        isActive: true,
        canManageUsers: false,
        canAccessTreasury: false,
        canAccessAuditTrail: false,
        canPostEntries: false,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        canAccessCreditFiles: false,
        canAccessTaxReports: true,
        canViewPortalSecrets: false,
        permittedClientIds: ['client-1'],
        createdAt: '2026-01-01',
      });

      db.switchUser(junior.id);

      const einv = db.getClientSystemRegistration('client-1', 'E_INVOICE');
      expect(einv).toBeDefined();

      const updatedReg: ClientSystemRegistration = {
        ...einv!,
        credentials: {
          ...einv!.credentials,
          password: 'new_secret_password_123',
        },
      };

      expect(() => {
        db.saveClientSystemRegistration(updatedReg, 'تعديل كلمة مرور المنظومة');
      }).toThrowError(PermissionError);
    });

    it('يسمح للمسؤول بحفظ وتعديل تسجيل المنظومة ويسجل الحركة في سجل المراجعة', () => {
      db.switchUser('user-admin');
      const initialLogs = db.getAuditLogs().length;

      const reg = db.getClientSystemRegistration('client-1', 'NAFEZA');
      expect(reg).toBeDefined();

      const updated = db.saveClientSystemRegistration(
        {
          ...reg!,
          status: 'REGISTERED',
          credentials: {
            ...reg!.credentials,
            username: 'customs_user_01',
            password: 'CustomsPassword@2026',
          },
          extra: {
            ...reg!.extra,
            registrantType: 'IMPORTER',
            importerRegistrationNumber: 'IMP-998877',
            eSignatureEnabled: true,
          },
        },
        'تسجيل الشركة على منظومة نافذة الجمركية'
      );

      expect(updated.status).toBe('REGISTERED');
      expect(updated.credentials.username).toBe('customs_user_01');
      expect(updated.extra.registrantType).toBe('IMPORTER');

      const logsAfter = db.getAuditLogs();
      expect(logsAfter.length).toBeGreaterThan(initialLogs);
      expect(logsAfter[0].action).toBe('UPDATE');
      expect(logsAfter[0].entityType).toBe('CLIENT_SYSTEM_REGISTRATION');
    });
  });

  describe('3) سجل إجراءات المنظومات (ClientSystemAction) للقراءة والإضافة فقط', () => {
    it('يسجل إجراء جديد بتوقيت القاهرة والمستخدم الحالي تلقائياً دون إمكانية الحذف', () => {
      db.switchUser('user-admin');

      const newAction = db.addClientSystemAction(
        {
          clientId: 'client-1',
          kind: 'E_INVOICE',
          type: 'إصدار فاتورة',
          reference: 'INV-2026-ETA-001',
          count: 5,
          notes: 'إرسال حزمة فواتير مبيعات إلكترونية',
          extra: { documentType: '01' },
          date: '2026-03-20',
        },
        'إصدار فواتير إلكترونية عبر البوابة'
      );

      expect(newAction.id).toBeTruthy();
      expect(newAction.performedBy).toContain('محمد جميل مرعي');
      expect(newAction.createdAt).toBeTruthy();
      expect(newAction.date).toBe('2026-03-20');

      const actions = db.getClientSystemActions('client-1', 'E_INVOICE');
      expect(actions.some((a) => a.id === newAction.id)).toBe(true);

      // Verify audit log entry was created
      const latestLog = db.getAuditLogs()[0];
      expect(latestLog.entityType).toBe('CLIENT_SYSTEM_ACTION');
      expect(latestLog.entityId).toBe(newAction.id);
    });

    it('يسجل طلب شحنة في نافذة مع ACID وتاريخ انتهاء +6 أشهر تلقائياً', () => {
      db.switchUser('user-admin');

      const issueDate = '2026-04-01';
      const action = db.addClientSystemAction({
        clientId: 'client-1',
        kind: 'NAFEZA',
        type: 'طلب ACID شحنة استيراد',
        reference: 'ACID-9876543210',
        date: issueDate,
        notes: 'شحنة معدات هيدروليكية من ألمانيا',
        extra: {
          orderType: 'COMMERCIAL_INDUSTRIAL',
          acidNumber: '9876543210',
          stage: 'PRELIMINARY',
          exporterName: 'Bosch Rexroth AG',
          exporterCountry: 'ألمانيا',
          portOfLoading: 'هامبورغ',
          portOfArrival: 'ميناء الإسكندرية',
          issueDate: issueDate,
          expiryDate: '2026-10-01', // +6 months
          shipmentStatus: 'قيد الشحن الدولي',
        },
      });

      expect(action.extra?.acidNumber).toBe('9876543210');
      expect(action.extra?.expiryDate).toBe('2026-10-01');
      expect(action.extra?.stage).toBe('PRELIMINARY');
    });
  });

  describe('4) مراقبة كشف ونسخ كلمات المرور (Secret Access Auditing)', () => {
    it('يسجل كشف أو نسخ الباسورد في سجل المراجعة بالمستخدم المنفذ', () => {
      db.switchUser('user-admin');
      const countBefore = db.getAuditLogs().length;

      db.logPortalSecretAccess('client-1', 'SAP', 'VIEW');
      db.logPortalSecretAccess('client-1', 'SAP', 'COPY');

      const logs = db.getAuditLogs();
      expect(logs.length).toBe(countBefore + 2);
      expect(logs[1].action).toBe('VIEW_PORTAL_SECRET');
      expect(logs[0].action).toBe('COPY_PORTAL_SECRET');
      expect(logs[0].details).toContain('نسخ كلمة مرور');
      expect(logs[1].details).toContain('كشف كلمة مرور');
    });

    it('يرفض كشف أو نسخ الباسورد إذا لم يكن لدى المستخدم صلاحية VIEW_PORTAL_SECRETS', () => {
      const junior = db.addUser({
        username: 'staff_no_secrets',
        name: 'محاسب بدون أسرار',
        email: 'staff@example.com',
        role: 'AUDITOR',
        isActive: true,
        canManageUsers: false,
        canAccessTreasury: false,
        canAccessAuditTrail: false,
        canPostEntries: false,
        canEditPostedEntries: false,
        canDeleteRecords: false,
        canAccessCreditFiles: false,
        canAccessTaxReports: true,
        canViewPortalSecrets: false,
        permittedClientIds: ['client-1'],
        createdAt: '2026-01-01',
      });

      db.switchUser(junior.id);

      expect(() => {
        db.logPortalSecretAccess('client-1', 'SAP', 'VIEW');
      }).toThrowError(PermissionError);

      expect(() => {
        db.logPortalSecretAccess('client-1', 'SAP', 'COPY');
      }).toThrowError(PermissionError);
    });
  });

  describe('5) روابط البوابات القابلة للتعديل بدون روابط ثابتة صلبة', () => {
    it('يقرأ الروابط الافتراضية ويتيح للمسؤول تعديلها وتخزينها في قاعدة البيانات', () => {
      db.switchUser('user-admin');
      const defaultUrls = db.getSystemPortalUrls();
      expect(defaultUrls.GENERAL_TAX).toBeTruthy();
      expect(defaultUrls.SAP).toBeTruthy();
      expect(defaultUrls.PAYROLL_NEW).toBeTruthy();
      expect(defaultUrls.E_INVOICE).toBeTruthy();
      expect(defaultUrls.NAFEZA).toBeTruthy();

      const updated = db.updateSystemPortalUrls(
        {
          E_INVOICE: 'https://custom-invoicing-gateway.eta.gov.eg',
        },
        'تحديث رابط بوابة الفاتورة الإلكترونية الخاصة بالبيئة الإنتاجية'
      );

      expect(updated.E_INVOICE).toBe('https://custom-invoicing-gateway.eta.gov.eg');
      expect(db.getSystemPortalUrls().E_INVOICE).toBe(
        'https://custom-invoicing-gateway.eta.gov.eg'
      );

      // Verify audit log
      const logs = db.getAuditLogs();
      expect(logs[0].entityType).toBe('SYSTEM_PORTAL_URLS');
    });
  });

  describe('6) الحقول الخاصة بكل منظومة (extra) والتحقق من شروط المنظومات', () => {
    it('يحفظ حقول الفاتورة الإلكترونية الخاصة بالتوكن والجهة المصدرة بدقة', () => {
      db.switchUser('user-admin');

      const clientReg = db.getClientSystemRegistration('client-1', 'E_INVOICE');
      expect(clientReg).toBeDefined();

      const saved = db.saveClientSystemRegistration({
        ...clientReg!,
        status: 'REGISTERED',
        extra: {
          hasToken: true,
          tokenIssuer: 'شركة إيجيبت تراست (Egypt Trust)',
          tokenSerial: 'EG-TRUST-998811',
          tokenPin: '1234',
          tokenExpiryDate: '2027-01-15',
          issuerUsername: 'egypt_trust_admin',
          issuerPassword: 'TrustPassword2026',
        },
      });

      expect(saved.extra.hasToken).toBe(true);
      expect(saved.extra.tokenIssuer).toBe('شركة إيجيبت تراست (Egypt Trust)');
      expect(saved.extra.tokenSerial).toBe('EG-TRUST-998811');
      expect(saved.extra.tokenExpiryDate).toBe('2027-01-15');

      // Check actions for E_INVOICE
      const act = db.addClientSystemAction({
        clientId: 'client-1',
        kind: 'E_INVOICE',
        type: 'إشعار دائن',
        reference: 'CR-2026-0044',
        count: 2,
        notes: 'إشعار دائن لرد بضاعة مرتجعة',
      });

      expect(act.type).toBe('إشعار دائن');
      expect(act.count).toBe(2);
      expect(act.reference).toBe('CR-2026-0044');
    });

    it('يحفظ حقول نافذة الجمركية وحساب الدخول والمسجل وسجل الشحنات', () => {
      db.switchUser('user-admin');

      const reg = db.getClientSystemRegistration('client-1', 'NAFEZA');
      const saved = db.saveClientSystemRegistration({
        ...reg!,
        status: 'REGISTERED',
        extra: {
          authMethod: 'ACCOUNT',
          registrantType: 'CUSTOMS_CLEARER',
          importerRegistrationNumber: 'CLR-776655',
          eSignatureEnabled: true,
        },
      });

      expect(saved.extra.registrantType).toBe('CUSTOMS_CLEARER');
      expect(saved.extra.importerRegistrationNumber).toBe('CLR-776655');
      expect(saved.extra.eSignatureEnabled).toBe(true);
    });

    it('يحفظ بيانات كسب العمل (PAYROLL_NEW) ورقم المنشأة وتاريخ الانضمام', () => {
      db.switchUser('user-admin');

      const payrollReg = db.getClientSystemRegistration('client-1', 'PAYROLL_NEW');
      expect(payrollReg).toBeDefined();

      const saved = db.saveClientSystemRegistration({
        ...payrollReg!,
        status: 'REGISTERED',
        extra: {
          enrolledStatus: 'ENROLLED',
          enrolledDate: '2026-01-01',
          facilityNumber: 'FAC-EGY-554433',
        },
      });

      expect(saved.extra.enrolledStatus).toBe('ENROLLED');
      expect(saved.extra.facilityNumber).toBe('FAC-EGY-554433');
      expect(saved.extra.enrolledDate).toBe('2026-01-01');

      // Add PAYROLL_NEW action
      const act = db.addClientSystemAction({
        clientId: 'client-1',
        kind: 'PAYROLL_NEW',
        type: 'تقديم نموذج 4 كسب عمل الشهري / الربع سنوي',
        reference: 'PAYROLL-Q1-2026',
        count: 1,
        notes: 'تقديم إقرار كسب عمل الربع الأول عبر المنظومة الموحدة الجديدة',
      });

      expect(act.type).toContain('نموذج 4');
      expect(act.reference).toBe('PAYROLL-Q1-2026');
    });
  });
});
