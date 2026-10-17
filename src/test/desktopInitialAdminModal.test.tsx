/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { FirebaseAuthGate } from '../components/auth/FirebaseAuthGate';
import { InitialAdminModal } from '../components/desktop/InitialAdminModal';
import {
  getDesktopInitialAdminCredentials,
  consumeDesktopInitialAdminCredentials,
  isDesktopInitialAdminConsumed,
  _resetDesktopAdminCredentialsStateForTesting,
} from '../services/desktopAdminCredentialsService';

describe('Desktop Initial Admin Modal & Login Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    _resetDesktopAdminCredentialsStateForTesting();

    // Default fetch mock for /api/auth/check-setup
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/api/auth/check-setup')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true, needsSetup: false })));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true })));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (window as any).electronDesktop;
  });

  it('1. يعرض InitialAdminModal فوق شاشة الدخول (FirebaseAuthGate) عند أول تشغيل لسطح المكتب', async () => {
    const mockGetInitialAdmin = vi.fn().mockResolvedValue({
      name: 'admin',
      email: 'admin@desktop.local',
      password: 'PassWord123!@',
      isReset: false,
    });

    (window as any).electronDesktop = {
      isDesktop: true,
      getInitialAdminCredentials: mockGetInitialAdmin,
    };

    render(<FirebaseAuthGate onAuthenticated={vi.fn()} />);

    // Check modal displays over login gate
    const modalHeader = await screen.findByText('بيانات الدخول الأولية لمدير المنظومة (سطح المكتب)');
    expect(modalHeader).toBeDefined();

    // Check email and password display in modal
    const emailEl = screen.getByTestId('initial-admin-email');
    expect(emailEl.textContent).toContain('admin@desktop.local');

    const passEl = screen.getByTestId('initial-admin-password');
    expect(passEl.textContent).toContain('PassWord123!@');

    // getInitialAdminCredentials called once
    expect(mockGetInitialAdmin).toHaveBeenCalledTimes(1);
  });

  it('2. عند الضغط على "متابعة" يملأ خانة اسم المستخدم تلقائيًا بـ admin@desktop.local ويستهلك البيانات', async () => {
    const mockGetInitialAdmin = vi.fn().mockResolvedValue({
      name: 'admin',
      email: 'admin@desktop.local',
      password: 'GeneratedSecret99!',
      isReset: false,
    });

    (window as any).electronDesktop = {
      isDesktop: true,
      getInitialAdminCredentials: mockGetInitialAdmin,
    };

    render(<FirebaseAuthGate onAuthenticated={vi.fn()} />);

    // Wait for modal to render
    const proceedBtn = await screen.findByTestId('initial-admin-proceed-btn');
    expect(proceedBtn).toBeDefined();

    // Click proceed
    fireEvent.click(proceedBtn);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByTestId('initial-admin-modal')).toBeNull();
    });

    // Email input field in FirebaseAuthGate must be populated with admin@desktop.local
    const emailInput = screen.getByTestId('login-email-input') as HTMLInputElement;
    expect(emailInput.value).toBe('admin@desktop.local');

    // State is marked as consumed
    expect(isDesktopInitialAdminConsumed()).toBe(true);
  });

  it('3. لا يستهلك البيانات قبل العرض في React StrictMode ويستدعي getInitialAdminCredentials مرة واحدة فقط', async () => {
    let callCount = 0;
    const mockGetInitialAdmin = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        name: 'admin',
        email: 'admin@desktop.local',
        password: 'StrictModePass2026!',
      });
    });

    (window as any).electronDesktop = {
      isDesktop: true,
      getInitialAdminCredentials: mockGetInitialAdmin,
    };

    // First mount
    const { unmount } = render(
      <React.StrictMode>
        <InitialAdminModal />
      </React.StrictMode>
    );

    // Modal should render with credentials
    const passEl = await screen.findByTestId('initial-admin-password');
    expect(passEl.textContent).toContain('StrictModePass2026!');

    // IPC must be called strictly once
    expect(mockGetInitialAdmin).toHaveBeenCalledTimes(1);

    // Unmount and remount (simulating strict mode or navigation)
    unmount();

    render(
      <React.StrictMode>
        <InitialAdminModal />
      </React.StrictMode>
    );

    // Credentials still exist and IPC was NOT called a second time
    const passEl2 = await screen.findByTestId('initial-admin-password');
    expect(passEl2.textContent).toContain('StrictModePass2026!');
    expect(mockGetInitialAdmin).toHaveBeenCalledTimes(1);
  });

  it('4. بعد استهلاك البيانات لا يظهر المودال مجدداً ولا يظهر مرتين', async () => {
    const mockGetInitialAdmin = vi.fn().mockResolvedValue({
      name: 'admin',
      email: 'admin@desktop.local',
      password: 'OneTimePass123!',
    });

    (window as any).electronDesktop = {
      isDesktop: true,
      getInitialAdminCredentials: mockGetInitialAdmin,
    };

    const { unmount } = render(<InitialAdminModal />);

    const proceedBtn = await screen.findByTestId('initial-admin-proceed-btn');
    fireEvent.click(proceedBtn);

    // Should be dismissed
    expect(screen.queryByTestId('initial-admin-modal')).toBeNull();
    unmount();

    // Second render (e.g. inside main app App.tsx)
    const secondRender = render(<InitialAdminModal />);
    expect(secondRender.queryByTestId('initial-admin-modal')).toBeNull();
  });

  it('5. يعرض نص الاسترجاع الآمن عند استلام isReset: true (--reset-admin-password)', async () => {
    const mockGetInitialAdmin = vi.fn().mockResolvedValue({
      name: 'admin',
      email: 'admin@desktop.local',
      password: 'ResetTempPass12!',
      isReset: true,
    });

    (window as any).electronDesktop = {
      isDesktop: true,
      getInitialAdminCredentials: mockGetInitialAdmin,
    };

    render(<InitialAdminModal />);

    // Header must say password reset
    const header = await screen.findByText('استرجاع كلمة مرور مدير المنظومة (سطح المكتب)');
    expect(header).toBeDefined();

    const desc = screen.getByText(/--reset-admin-password/);
    expect(desc).toBeDefined();
  });
});
