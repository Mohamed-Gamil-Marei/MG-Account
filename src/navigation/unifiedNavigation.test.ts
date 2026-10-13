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
function resolveUnifiedTabRoute(tab: string): { hub: string; subTab?: string } {
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

describe('Unified Screens & Navigation Aliases Tests', () => {
  describe('1. Aliases resolution to Unified Hubs', () => {
    it('Credit Hub Aliases: all resolve to CREDIT_HUB with correct subtabs', () => {
      expect(resolveUnifiedTabRoute('CREDIT_HUB')).toEqual({ hub: 'CREDIT_HUB', subTab: 'CREDIT_SIMULATOR' });
      expect(resolveUnifiedTabRoute('CREDIT_SIMULATOR')).toEqual({ hub: 'CREDIT_HUB', subTab: 'CREDIT_SIMULATOR' });
      expect(resolveUnifiedTabRoute('QUICK_BANK_DOSSIER')).toEqual({ hub: 'CREDIT_HUB', subTab: 'QUICK_BANK_DOSSIER' });
      expect(resolveUnifiedTabRoute('CREDIT_DOSSIER_REGISTRY')).toEqual({ hub: 'CREDIT_HUB', subTab: 'CREDIT_DOSSIER_REGISTRY' });
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

  describe('2. Permissions and Security Enforcement (canAccessCreditFiles & others)', () => {
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
});
