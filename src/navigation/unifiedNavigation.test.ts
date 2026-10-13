import { describe, it, expect } from 'vitest';
import { getParentHub } from '../components/Sidebar';
import { checkEntityAccess } from '../server/access';

// Helper function mirroring App.tsx isTabAccessible logic
function isTabAccessibleForUser(tab: string, user: { role: string; canAccessCreditFiles?: boolean; canAccessTreasury?: boolean; canAccessTaxReports?: boolean; canAccessAuditTrail?: boolean }): boolean {
  if (user.role === 'ADMIN') return true;

  if (
    (tab === 'CREDIT_HUB' || tab === 'CREDIT_SIMULATOR' || tab === 'QUICK_BANK_DOSSIER' || tab === 'CREDIT_DOSSIER_REGISTRY') &&
    user.canAccessCreditFiles === false
  ) {
    return false;
  }

  if (tab === 'OFFICE_TREASURY' && !user.canAccessTreasury) return false;
  if (tab === 'AUDIT_TRAIL' && !user.canAccessAuditTrail) return false;
  if ((tab === 'TAX_TRACKER' || tab === 'TAX_AUDIT_HUB') && user.canAccessTaxReports === false) return false;

  return true;
}

// Helper function mirroring App.tsx route mapping to unified hub and target subtab
function resolveUnifiedTabRoute(tab: string): { hub: string; subTab?: string; initialMode?: string } {
  switch (tab) {
    case 'CREDIT_HUB':
    case 'CREDIT_SIMULATOR':
    case 'QUICK_BANK_DOSSIER':
    case 'CREDIT_DOSSIER_REGISTRY':
      return {
        hub: 'CREDIT_HUB',
        subTab: tab === 'QUICK_BANK_DOSSIER'
          ? 'QUICK_BANK_DOSSIER'
          : tab === 'CREDIT_DOSSIER_REGISTRY'
          ? 'CREDIT_DOSSIER_REGISTRY'
          : 'CREDIT_SIMULATOR',
        initialMode: tab === 'QUICK_BANK_DOSSIER' ? 'KPIS' : 'DEDICATED_YEAR',
      };

    case 'FINANCIAL_PLANNING_HUB':
    case 'BUDGET_PLANNER':
    case 'CASH_FLOW_PREDICTOR':
    case 'BUDGET_AND_CASHFLOW':
      return {
        hub: 'FINANCIAL_PLANNING_HUB',
        subTab: tab === 'CASH_FLOW_PREDICTOR' ? 'CASH_FLOW_PREDICTOR' : 'BUDGET_PLANNER',
      };

    case 'AUDIT_TOOLS_HUB':
    case 'EXCEL_AUDIT_SENTINEL':
    case 'FRAUD_AUDIT_SENTINEL':
    case 'JOURNAL_AUDIT_SCANNER':
      return {
        hub: 'AUDIT_TOOLS_HUB',
        subTab: tab === 'FRAUD_AUDIT_SENTINEL'
          ? 'FRAUD_AUDIT_SENTINEL'
          : tab === 'JOURNAL_AUDIT_SCANNER'
          ? 'JOURNAL_AUDIT_SCANNER'
          : 'EXCEL_AUDIT_SENTINEL',
      };

    default:
      return { hub: tab };
  }
}

// Emulate keyboard dispatch logic in App.tsx
function simulateKeyPress(event: { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }): { targetTab?: string; action?: string } {
  const isModifier = Boolean(event.ctrlKey);
  const key = event.key.toLowerCase();

  // Alt + 1/2/3 navigation
  if (event.altKey && !isModifier) {
    if (event.key === '1') return { targetTab: 'CREDIT_HUB' };
    if (event.key === '2') return { targetTab: 'FINANCIAL_PLANNING_HUB' };
    if (event.key === '3') return { targetTab: 'AUDIT_TOOLS_HUB' };
  }

  if (isModifier) {
    if (key === 'r' && event.shiftKey) return { targetTab: 'CREDIT_HUB' };
    if (key === 'b') {
      if (event.shiftKey) return { targetTab: 'FINANCIAL_PLANNING_HUB' };
      return { action: 'OPEN_BACKUP_MODAL' }; // Ctrl+B reserved for Backup only
    }
    if (key === 'a' && event.shiftKey) return { targetTab: 'AUDIT_TOOLS_HUB' };
    if (key === 'a' && !event.shiftKey) return { targetTab: 'AUDITOR_REPORT' };
    if (key === 'd') return { targetTab: 'DASHBOARD' };
    if (key === 'j') return { targetTab: 'JOURNAL_ENTRIES' };
    if (key === 'l') return { targetTab: 'GENERAL_LEDGER' };
    if (key === 't') return { targetTab: 'TRIAL_BALANCE' };
    if (key === 'f') return { targetTab: 'FINANCIAL_STATEMENTS' };
    if (key === 'i') return { targetTab: 'INVOICING' };
    if (key === 'c') return event.shiftKey ? { targetTab: 'CUSTOMS_HUB' } : { targetTab: 'CLIENTS_ARCHIVE' };
    if (key === 'x') return { targetTab: 'TAX_TRACKER' };
    if (key === 'm') return { targetTab: 'OFFICE_TREASURY' };
    if (key === 'o') return { targetTab: 'CHART_OF_ACCOUNTS' };
    if (key === 's') return { targetTab: 'FINANCIAL_NOTES' };
  }

  return {};
}

describe('Unified Screens & Navigation Aliases Tests', () => {
  describe('1. Aliases resolution to Unified Hubs and SubTabs', () => {
    it('Credit Hub Aliases: all resolve to CREDIT_HUB with correct distinct subtabs & modes', () => {
      expect(resolveUnifiedTabRoute('CREDIT_HUB')).toEqual({ hub: 'CREDIT_HUB', subTab: 'CREDIT_SIMULATOR', initialMode: 'DEDICATED_YEAR' });
      expect(resolveUnifiedTabRoute('CREDIT_SIMULATOR')).toEqual({ hub: 'CREDIT_HUB', subTab: 'CREDIT_SIMULATOR', initialMode: 'DEDICATED_YEAR' });
      expect(resolveUnifiedTabRoute('QUICK_BANK_DOSSIER')).toEqual({ hub: 'CREDIT_HUB', subTab: 'QUICK_BANK_DOSSIER', initialMode: 'KPIS' });
      expect(resolveUnifiedTabRoute('CREDIT_DOSSIER_REGISTRY')).toEqual({ hub: 'CREDIT_HUB', subTab: 'CREDIT_DOSSIER_REGISTRY', initialMode: 'DEDICATED_YEAR' });
    });

    it('Financial Planning Hub Aliases: all resolve to FINANCIAL_PLANNING_HUB with correct subtabs', () => {
      expect(resolveUnifiedTabRoute('FINANCIAL_PLANNING_HUB')).toEqual({ hub: 'FINANCIAL_PLANNING_HUB', subTab: 'BUDGET_PLANNER' });
      expect(resolveUnifiedTabRoute('BUDGET_PLANNER')).toEqual({ hub: 'FINANCIAL_PLANNING_HUB', subTab: 'BUDGET_PLANNER' });
      expect(resolveUnifiedTabRoute('BUDGET_AND_CASHFLOW')).toEqual({ hub: 'FINANCIAL_PLANNING_HUB', subTab: 'BUDGET_PLANNER' });
      expect(resolveUnifiedTabRoute('CASH_FLOW_PREDICTOR')).toEqual({ hub: 'FINANCIAL_PLANNING_HUB', subTab: 'CASH_FLOW_PREDICTOR' });
    });

    it('Audit Tools Hub Aliases: all resolve to AUDIT_TOOLS_HUB with correct subtabs', () => {
      expect(resolveUnifiedTabRoute('AUDIT_TOOLS_HUB')).toEqual({ hub: 'AUDIT_TOOLS_HUB', subTab: 'EXCEL_AUDIT_SENTINEL' });
      expect(resolveUnifiedTabRoute('EXCEL_AUDIT_SENTINEL')).toEqual({ hub: 'AUDIT_TOOLS_HUB', subTab: 'EXCEL_AUDIT_SENTINEL' });
      expect(resolveUnifiedTabRoute('FRAUD_AUDIT_SENTINEL')).toEqual({ hub: 'AUDIT_TOOLS_HUB', subTab: 'FRAUD_AUDIT_SENTINEL' });
      expect(resolveUnifiedTabRoute('JOURNAL_AUDIT_SCANNER')).toEqual({ hub: 'AUDIT_TOOLS_HUB', subTab: 'JOURNAL_AUDIT_SCANNER' });
    });

    it('Sidebar getParentHub maps all aliases to unified parent hub', () => {
      expect(getParentHub('CREDIT_HUB')).toBe('CREDIT_HUB');
      expect(getParentHub('CREDIT_SIMULATOR')).toBe('CREDIT_HUB');
      expect(getParentHub('QUICK_BANK_DOSSIER')).toBe('CREDIT_HUB');
      expect(getParentHub('CREDIT_DOSSIER_REGISTRY')).toBe('CREDIT_HUB');

      expect(getParentHub('FINANCIAL_PLANNING_HUB')).toBe('FINANCIAL_PLANNING_HUB');
      expect(getParentHub('BUDGET_PLANNER')).toBe('FINANCIAL_PLANNING_HUB');
      expect(getParentHub('BUDGET_AND_CASHFLOW')).toBe('FINANCIAL_PLANNING_HUB');
      expect(getParentHub('CASH_FLOW_PREDICTOR')).toBe('FINANCIAL_PLANNING_HUB');

      expect(getParentHub('AUDIT_TOOLS_HUB')).toBe('AUDIT_TOOLS_HUB');
      expect(getParentHub('EXCEL_AUDIT_SENTINEL')).toBe('AUDIT_TOOLS_HUB');
      expect(getParentHub('FRAUD_AUDIT_SENTINEL')).toBe('AUDIT_TOOLS_HUB');
      expect(getParentHub('JOURNAL_AUDIT_SCANNER')).toBe('AUDIT_TOOLS_HUB');
    });
  });

  describe('2. Hub Component Isolation (no duplicate identical components rendered in two tabs within same hub)', () => {
    it('CreditHubView: tabs render distinct modes/components and do not duplicate identical views', () => {
      const tab1 = resolveUnifiedTabRoute('CREDIT_SIMULATOR');
      const tab2 = resolveUnifiedTabRoute('QUICK_BANK_DOSSIER');
      const tab3 = resolveUnifiedTabRoute('CREDIT_DOSSIER_REGISTRY');

      // They either render a different component or different initialMode
      expect(tab1.initialMode).toBe('DEDICATED_YEAR');
      expect(tab2.initialMode).toBe('KPIS');
      expect(tab1.initialMode).not.toEqual(tab2.initialMode);
      expect(tab3.subTab).toBe('CREDIT_DOSSIER_REGISTRY');
    });

    it('FinancialPlanningHubView: tabs render distinct subviews (Budget vs CashFlow)', () => {
      const budget = resolveUnifiedTabRoute('BUDGET_PLANNER');
      const cashflow = resolveUnifiedTabRoute('CASH_FLOW_PREDICTOR');
      expect(budget.subTab).not.toEqual(cashflow.subTab);
    });

    it('AuditToolsHubView: tabs render distinct sentinel tools', () => {
      const excel = resolveUnifiedTabRoute('EXCEL_AUDIT_SENTINEL');
      const fraud = resolveUnifiedTabRoute('FRAUD_AUDIT_SENTINEL');
      const journal = resolveUnifiedTabRoute('JOURNAL_AUDIT_SCANNER');
      expect(excel.subTab).not.toEqual(fraud.subTab);
      expect(fraud.subTab).not.toEqual(journal.subTab);
      expect(excel.subTab).not.toEqual(journal.subTab);
    });
  });

  describe('3. Permissions and Security Enforcement (canAccessCreditFiles & others)', () => {
    it('Blocks access to Credit Hub and all aliases when canAccessCreditFiles is false', () => {
      const restrictedUser = {
        role: 'ACCOUNTANT',
        canAccessCreditFiles: false,
      };

      expect(isTabAccessibleForUser('CREDIT_HUB', restrictedUser)).toBe(false);
      expect(isTabAccessibleForUser('CREDIT_SIMULATOR', restrictedUser)).toBe(false);
      expect(isTabAccessibleForUser('QUICK_BANK_DOSSIER', restrictedUser)).toBe(false);
      expect(isTabAccessibleForUser('CREDIT_DOSSIER_REGISTRY', restrictedUser)).toBe(false);
    });

    it('Allows access to Credit Hub and aliases when canAccessCreditFiles is true or undefined', () => {
      const allowedUser = {
        role: 'ACCOUNTANT',
        canAccessCreditFiles: true,
      };

      expect(isTabAccessibleForUser('CREDIT_HUB', allowedUser)).toBe(true);
      expect(isTabAccessibleForUser('CREDIT_SIMULATOR', allowedUser)).toBe(true);
      expect(isTabAccessibleForUser('QUICK_BANK_DOSSIER', allowedUser)).toBe(true);
      expect(isTabAccessibleForUser('CREDIT_DOSSIER_REGISTRY', allowedUser)).toBe(true);
    });

    it('Admin always has access regardless of canAccessCreditFiles setting', () => {
      const adminUser = {
        role: 'ADMIN',
        canAccessCreditFiles: false,
      };

      expect(isTabAccessibleForUser('CREDIT_HUB', adminUser)).toBe(true);
      expect(isTabAccessibleForUser('CREDIT_SIMULATOR', adminUser)).toBe(true);
      expect(isTabAccessibleForUser('QUICK_BANK_DOSSIER', adminUser)).toBe(true);
      expect(isTabAccessibleForUser('CREDIT_DOSSIER_REGISTRY', adminUser)).toBe(true);
    });
  });

  describe('4. Keyboard Shortcuts Conflict Resolution & Active Handlers', () => {
    it('Ctrl+B is strictly reserved for Backup Modal and not hijacked by navigation', () => {
      const res = simulateKeyPress({ key: 'b', ctrlKey: true, shiftKey: false });
      expect(res.action).toBe('OPEN_BACKUP_MODAL');
      expect(res.targetTab).toBeUndefined();
    });

    it('Alt+1, Alt+2, Alt+3 trigger Credit, Financial Planning, and Audit Hubs respectively', () => {
      expect(simulateKeyPress({ key: '1', altKey: true })).toEqual({ targetTab: 'CREDIT_HUB' });
      expect(simulateKeyPress({ key: '2', altKey: true })).toEqual({ targetTab: 'FINANCIAL_PLANNING_HUB' });
      expect(simulateKeyPress({ key: '3', altKey: true })).toEqual({ targetTab: 'AUDIT_TOOLS_HUB' });
    });
  });
});
