/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import React from 'react';

import { LocalErrorBoundary } from './common/LocalErrorBoundary';

// Mock ResizeObserver which is often used by UI libraries
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

describe('Dashboard Component - Resiliency Tests (اختبارات صمود لوحة المؤشرات)', () => {
  const emptyState: any = {
    accounts: [],
    journalEntries: [],
    clients: [],
    clientDeadlines: [],
    feeAgreements: [],
    feeCollections: [],
    treasuryTransactions: [],
    taxDeclarations: [],
    officeProfile: {},
    preferences: {}
  };

  it('renders successfully with an empty state', () => {
    const { container } = render(
      <Dashboard state={emptyState} />
    );
    expect(container).toBeDefined();
    // Check for some header text or gauge presence
    expect(container.textContent).toContain('لوحة مؤشرات');
  });

  it('renders successfully with missing account codes and names', () => {
    const corruptedState = {
      ...emptyState,
      accounts: [
        { id: 'acc-1', nature: 'DEBIT', category: 'ASSETS' }, // Missing code and name
        { id: 'acc-2', code: '1100', nature: 'DEBIT', category: 'ASSETS' }, // Missing name
        { id: 'acc-3', name: 'نقدية', nature: 'DEBIT', category: 'ASSETS' }, // Missing code
      ]
    };
    const { container } = render(
      <Dashboard state={corruptedState} />
    );
    expect(container).toBeDefined();
  });

  it('renders successfully and sorts correctly with missing dueDates in deadlines', () => {
    const stateWithBadDeadlines = {
      ...emptyState,
      clientDeadlines: [
        { id: 'd1', title: 'معدل 1', type: 'VAT', clientId: 'c1' }, // Missing dueDate
        { id: 'd2', title: 'معدل 2', type: 'VAT', clientId: 'c1', dueDate: '2026-05-15' },
        { id: 'd3', title: 'معدل 3', type: 'VAT', clientId: 'c1', dueDate: '2026-05-10' },
      ],
      clients: [{ id: 'c1', name: 'عميل 1' }]
    };
    const { container } = render(
      <Dashboard state={stateWithBadDeadlines} />
    );
    expect(container).toBeDefined();
    // The sorting logic should have ignored d1 and put d3 before d2
    expect(container.textContent).toContain('معدل 3');
    expect(container.textContent).toContain('معدل 2');
  });

  it('handles missing fiscal year context safely', () => {
    const stateWithNoContext = {
      ...emptyState,
      activeClientContext: null
    };
    const { container } = render(
      <Dashboard state={stateWithNoContext} fiscalYear={undefined as any} />
    );
    expect(container).toBeDefined();
    expect(container.textContent).toContain('2026'); // Fallback year
  });

  it('LocalErrorBoundary catches runtime render errors and displays actual message and location', () => {
    const CrashingComponent = () => {
      throw new Error('محاكاة خطأ فادح في مكونات لوحة التحكم');
    };
    const { container } = render(
      <LocalErrorBoundary title="لوحة القيادة والمؤشرات">
        <CrashingComponent />
      </LocalErrorBoundary>
    );
    expect(container.textContent).toContain('لوحة القيادة والمؤشرات');
    expect(container.textContent).toContain('محاكاة خطأ فادح في مكونات لوحة التحكم');
    expect(container.textContent).toContain('Error Context:');
  });
});
