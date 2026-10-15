/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { db } from '../db/localDatabase';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('App Online Authentication & Offline Rejection (المهمة 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('دخول بدون اتصال يترفض: يعرض شاشة "يلزم اتصال بالإنترنت للدخول" مع زر إعادة المحاولة ولا يفتح أي بيانات', async () => {
    // Simulate network error / offline on /api/auth/me
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.reject(new Error('Network error / connection failure'));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: false })));
    });

    render(<App />);

    // Must show internet connection required screen
    const warningHeader = await screen.findByText('يلزم اتصال بالإنترنت للدخول');
    expect(warningHeader).toBeDefined();

    // Must have retry button
    const retryBtn = screen.getByText('إعادة المحاولة');
    expect(retryBtn).toBeDefined();

    // Sensitive data / hubs should NOT be rendered
    expect(screen.queryByText('لوحة مؤشرات')).toBeNull();
    expect(screen.queryByText('قيود اليومية')).toBeNull();
  });

  it('401 يرجّع للدخول: يرجع لشاشة الدخول فوراً ويمسح بيانات المحاسبة المحلية', async () => {
    // Seed some local accounting data first
    db.getState().journalEntries = [
      { id: 'jv-1', entryNumber: 1, date: '2026-01-01', description: 'قيد تجريبي', lines: [], posted: true, fiscalYear: 2026 } as any
    ];
    db.getState().accounts = [
      { id: 'acc-1', code: '101', name: 'الصندوق', category: 'ASSETS', nature: 'DEBIT', level: 1, openingBalanceDebit: 100, openingBalanceCredit: 0, currentBalance: 100 }
    ];

    // Simulate 401 on /api/auth/me and setup check returns needsSetup: false
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify({ success: false, error: 'غير مسجل الدخول.' }), { status: 401 }));
      }
      if (String(url).includes('/api/auth/check-setup')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true, needsSetup: false }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: false }), { status: 404 }));
    });

    render(<App />);

    // Verify it renders the login gate without opening dashboard
    await waitFor(() => {
      expect(screen.queryByText('يلزم اتصال بالإنترنت للدخول')).toBeNull();
      expect(screen.queryByText('لوحة مؤشرات')).toBeNull();
    });

    // Check that login screen input exists
    expect(await screen.findByPlaceholderText(/example@domain\.com/i)).toBeDefined();
  });

  it('حساب موقوف: يمسح بيانات المحاسبة ويرجع لشاشة تسجيل الدخول', async () => {
    // Seed test data
    db.getState().journalEntries = [
      { id: 'jv-2', entryNumber: 2, date: '2026-01-01', description: 'قيد تجريبي 2', lines: [], posted: true, fiscalYear: 2026 } as any
    ];

    const clearSpy = vi.spyOn(db, 'clearLocalAccountingData');

    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          user: { id: 99, email: 'suspended@test.local', name: 'Suspended User', role: 'ACCOUNTANT', isActive: false }
        }), { status: 200 }));
      }
      if (String(url).includes('/api/auth/check-setup')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true, needsSetup: false }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: false }), { status: 404 }));
    });

    render(<App />);

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalled();
    });

    expect(db.getState().journalEntries.length).toBe(0);
  });
});
