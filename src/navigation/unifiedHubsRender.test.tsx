/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CreditHubView } from '../components/hubs/CreditHubView';
import { FinancialStatementsView } from '../components/FinancialStatementsView';
import { db } from '../db/localDatabase';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('Unified Hubs DOM Render Tests (@testing-library/react)', () => {
  const dummyState: any = {
    accounts: [
      { id: 'acc-1', code: '1102', name: 'بنك مصر - جاري', category: 'ASSETS', nature: 'DEBIT' },
      { id: 'acc-2', code: '1103', name: 'العملاء المدينون', category: 'ASSETS', nature: 'DEBIT' },
      { id: 'acc-3', code: '4110', name: 'إيراد المبيعات', category: 'REVENUES', nature: 'CREDIT' },
    ],
    journalEntries: [],
    clients: [{ id: 'c1', name: 'شركة النور للمقاولات' }],
    clientDeadlines: [],
    feeAgreements: [],
    feeCollections: [],
    treasuryTransactions: [],
    taxDeclarations: [],
    officeProfile: { name: 'مكتب المحاسب القانوني' },
    preferences: {},
    creditSimulations: [
      {
        id: 'sim-1',
        clientId: 'c1',
        facilityType: 'OVERDRAFT',
        requestedAmount: 5000000,
        approvedAmount: 4500000,
        createdAt: '2026-01-15',
        status: 'APPROVED',
      },
    ],
  };

  it('CreditHubView renders and displays distinct content across all three subtabs', () => {
    // Ensure user has permission
    vi.spyOn(db, 'getCurrentUser').mockReturnValue({
      id: 'admin',
      name: 'Admin',
      role: 'ADMIN',
      canAccessCreditFiles: true,
    } as any);

    // 1. Render tab 1: CREDIT_SIMULATOR (DEDICATED_YEAR mode)
    const { rerender } = render(<CreditHubView state={dummyState} initialSubTab="CREDIT_SIMULATOR" />);
    expect(screen.getByText('القوائم السنوية وملف البنك التقديري')).toBeDefined();
    expect(screen.getByText(/لوحة القوائم المنفصلة/i)).toBeDefined();

    // 2. Render tab 2: QUICK_BANK_DOSSIER (KPIS mode)
    rerender(<CreditHubView state={dummyState} initialSubTab="QUICK_BANK_DOSSIER" />);
    expect(screen.getByText('التحليل الائتماني السريع ونسب الجدارة')).toBeDefined();
    expect(screen.getByText(/التحليل الائتماني البنكي ومؤشرات الجدارة/i)).toBeDefined();

    // 3. Render tab 3: CREDIT_DOSSIER_REGISTRY
    rerender(<CreditHubView state={dummyState} initialSubTab="CREDIT_DOSSIER_REGISTRY" />);
    expect(screen.getByText('سجل وأرشيف ملفات الائتمان')).toBeDefined();
    expect(screen.getByText(/سجل الشركات والملفات الائتمانية/i)).toBeDefined();
  });

  it('FinancialStatementsView: clicking "ملف بنكي سريع" triggers onNavigateToTab("CREDIT_HUB")', () => {
    const handleNavigate = vi.fn();
    render(
      <FinancialStatementsView
        state={dummyState}
        fiscalYear={2026}
        onNavigateToTab={handleNavigate}
      />
    );

    const quickBankBtn = screen.getByText('ملف بنكي سريع');
    expect(quickBankBtn).toBeDefined();

    fireEvent.click(quickBankBtn);
    expect(handleNavigate).toHaveBeenCalledWith('CREDIT_HUB');
  });

  it('CreditFinancialsSimulator is NOT rendered inside FinancialStatementsView', () => {
    const { container } = render(
      <FinancialStatementsView
        state={dummyState}
        fiscalYear={2026}
      />
    );

    // CreditFinancialsSimulator has distinct text like 'لوحة القوائم المنفصلة لسنة معينة' or 'ملف الائتمان البنكي والمحاكي المالي'
    expect(container.textContent).not.toContain('لوحة القوائم المنفصلة لسنة معينة');
    expect(container.textContent).not.toContain('ملف الائتمان البنكي والمحاكي المالي المتكامل');
  });
});
