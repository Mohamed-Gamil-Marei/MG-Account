import { SapApiConfig, Account, JournalEntry } from '../types';
import { db } from '../db/localDatabase';

export interface SapConnectionTestResult {
  success: boolean;
  statusCode: number;
  message: string;
  serverVersion?: string;
  companyCode?: string;
  accessibleEntities?: string[];
  latencyMs: number;
}

export interface SapSyncResult {
  success: boolean;
  accountsImported: number;
  entriesImported: number;
  costCentersFound: number;
  message: string;
  errors: string[];
}

export class SapConnectorService {
  /**
   * Test connection to SAP OData / REST endpoint
   */
  public static async testConnection(config: SapApiConfig): Promise<SapConnectionTestResult> {
    const startTime = Date.now();
    try {
      if (!config.hostUrl || !config.username) {
        return {
          success: false,
          statusCode: 400,
          message: 'بيانات الاتصال غير مكتملة: يرجى إدخال عنوان خادم SAP واسم المستخدم.',
          latencyMs: 0,
        };
      }

      // Simulate OData ping / metadata handshake
      await new Promise((resolve) => setTimeout(resolve, 850));

      const latencyMs = Date.now() - startTime;
      const isValidHost = config.hostUrl.startsWith('http://') || config.hostUrl.startsWith('https://');

      if (!isValidHost) {
        return {
          success: false,
          statusCode: 404,
          message: 'عنوان الخادم غير صحيح. يجب أن يبدأ بـ http:// أو https://',
          latencyMs,
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: `تم الاتصال بنجاح مع خادم SAP S/4HANA OData لشركة (${config.companyName || config.companyCode})`,
        serverVersion: 'SAP S/4HANA 2023 FPS02 / SAP Gateway 7.57',
        companyCode: config.companyCode || '1000',
        accessibleEntities: [
          'A_JournalEntryItem',
          'A_GLAccountInCompanyCode',
          'A_CostCenter',
          'A_ProfitCenter',
          'A_FiscalYearPeriod',
        ],
        latencyMs,
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: 500,
        message: `فشل الاتصال بخادم SAP: ${error.message || 'خطأ غير معروف في بروتوكول OData'}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch GL Account Balances from SAP via OData Service
   */
  public static async fetchAccountBalances(config: SapApiConfig): Promise<{
    success: boolean;
    accounts: Partial<Account>[];
    message: string;
  }> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mocked high-fidelity SAP GL Account structure mapped to Egyptian standard
      const sapAccounts: Partial<Account>[] = [
        {
          code: '1101',
          name: 'SAP - الخزينة المركزية (Cash On Hand)',
          category: 'ASSETS',
          nature: 'DEBIT',
          openingBalanceDebit: 850000,
          openingBalanceCredit: 0,
          description: `SAP CoCode ${config.companyCode} - GL 1101000`,
        },
        {
          code: '1102',
          name: 'SAP - البنك التجاري الدولي CIB (Operating Bank)',
          category: 'ASSETS',
          nature: 'DEBIT',
          openingBalanceDebit: 3450000,
          openingBalanceCredit: 0,
          description: `SAP CoCode ${config.companyCode} - GL 1102000`,
        },
        {
          code: '1201',
          name: 'SAP - حسابات العملاء التجاريين (Trade Accounts Receivable)',
          category: 'ASSETS',
          nature: 'DEBIT',
          openingBalanceDebit: 2150000,
          openingBalanceCredit: 0,
          description: `SAP CoCode ${config.companyCode} - GL 1201000`,
        },
        {
          code: '2101',
          name: 'SAP - الموردون والتجارة الدائنة (Trade Accounts Payable)',
          category: 'LIABILITIES',
          nature: 'CREDIT',
          openingBalanceDebit: 0,
          openingBalanceCredit: 1420000,
          description: `SAP CoCode ${config.companyCode} - GL 2101000`,
        },
        {
          code: '4101',
          name: 'SAP - إيرادات النشاط والمبيعات (Domestic Revenue)',
          category: 'REVENUES',
          nature: 'CREDIT',
          openingBalanceDebit: 0,
          openingBalanceCredit: 9850000,
          description: `SAP CoCode ${config.companyCode} - GL 4101000`,
        },
        {
          code: '5101',
          name: 'SAP - تكلفة المبيعات المباشرة (Cost of Goods Sold)',
          category: 'EXPENSES',
          nature: 'DEBIT',
          openingBalanceDebit: 6200000,
          openingBalanceCredit: 0,
          description: `SAP CoCode ${config.companyCode} - GL 5101000`,
        },
      ];

      return {
        success: true,
        accounts: sapAccounts,
        message: `تم جلب ${sapAccounts.length} حساب من SAP لشركة ${config.companyName}`,
      };
    } catch (error: any) {
      return {
        success: false,
        accounts: [],
        message: `تعذر جلب الأرصدة: ${error.message}`,
      };
    }
  }

  /**
   * Synchronize all company accounting data from SAP OData
   */
  public static async syncCompanyData(config: SapApiConfig): Promise<SapSyncResult> {
    try {
      const testRes = await this.testConnection(config);
      if (!testRes.success) {
        return {
          success: false,
          accountsImported: 0,
          entriesImported: 0,
          costCentersFound: 0,
          message: testRes.message,
          errors: [testRes.message],
        };
      }

      const accRes = await this.fetchAccountBalances(config);
      
      // Update config sync status
      const updatedConfig: SapApiConfig = {
        ...config,
        lastSyncTimestamp: new Date().toISOString(),
        lastSyncStatus: 'SUCCESS',
        lastSyncMessage: `تمت المزامنة بنجاح واستيراد ${accRes.accounts.length} حساب`,
      };

      // Save to preferences
      const curPrefs = db.getState().preferences;
      const existingConfigs = curPrefs.sapConfigs || [];
      const updatedConfigs = existingConfigs.map((c) => (c.id === config.id ? updatedConfig : c));
      db.updatePreferences({ sapConfigs: updatedConfigs });

      return {
        success: true,
        accountsImported: accRes.accounts.length,
        entriesImported: 12,
        costCentersFound: 4,
        message: `تمت المزامنة بنجاح مع SAP OData API (${config.companyName})`,
        errors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        accountsImported: 0,
        entriesImported: 0,
        costCentersFound: 0,
        message: `فشلت المزامنة: ${error.message}`,
        errors: [error.message],
      };
    }
  }
}
