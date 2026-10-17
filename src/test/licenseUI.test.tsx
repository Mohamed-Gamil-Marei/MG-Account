/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { LicenseManagementModal } from '../components/LicenseManagementModal';
import { db } from '../db/localDatabase';

describe('LicenseManagementModal UI Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. يعرض رسالة حظر الصلاحية للمستخدمين غير المدراء (non-ADMIN)', async () => {
    vi.spyOn(db, 'getCurrentUser').mockReturnValue({
      id: 'acc-1',
      name: 'محاسب تجريبي',
      email: 'accountant@test.com',
      role: 'ACCOUNTANT',
      roleTitleArabic: 'محاسب مالي',
      canAccessTreasury: false,
      canAccessAuditTrail: false,
      canManageUsers: false,
      createdAt: '2025-01-01T00:00:00.000Z',
    });

    render(<LicenseManagementModal isOpen={true} onClose={vi.fn()} />);

    const restrictedText = await screen.findByText('الصلاحية مقتصرة على مدير النظام (ADMIN)');
    expect(restrictedText).toBeDefined();
  });

  it('2. يعرض تفاصيل الترخيص كاملة للمدير (ADMIN) عند فتح الشاشة', async () => {
    vi.spyOn(db, 'getCurrentUser').mockReturnValue({
      id: 'admin-1',
      name: 'مدير المنظومة',
      email: 'admin@test.com',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
      canManageUsers: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    });

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          status: 'VALID',
          message: 'الترخيص ساري',
          daysRemaining: 120,
          maxUsers: 10,
          currentUsers: 2,
          mode: 'ONLINE',
          features: { cloudSync: true, ai: true, whatsapp: true, eta: true },
          payload: {
            licenseId: 'LIC-123456',
            officeName: 'مكتب المحاسبة المعتمد',
            plan: 'OFFICE',
            expiresAt: '2027-01-01T00:00:00.000Z',
          },
        })
      )
    );

    render(<LicenseManagementModal isOpen={true} onClose={vi.fn()} />);

    const modalTitle = await screen.findByText('إدارة وترخيص المنظومة');
    expect(modalTitle).toBeDefined();

    const officeName = await screen.findByText('مكتب المحاسبة المعتمد');
    expect(officeName).toBeDefined();

    const planBadge = await screen.findByText('OFFICE');
    expect(planBadge).toBeDefined();
  });

  it('3. يستدعي POST /api/license/activate ويعرض رسالة الخطأ بالعربي عند إدخال كود معدل أو غير صالح', async () => {
    vi.spyOn(db, 'getCurrentUser').mockReturnValue({
      id: 'admin-1',
      name: 'مدير المنظومة',
      email: 'admin@test.com',
      role: 'ADMIN',
      roleTitleArabic: 'مدير المنظومة',
      canAccessTreasury: true,
      canAccessAuditTrail: true,
      canManageUsers: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    });

    // Initial status fetch
    vi.spyOn(global, 'fetch').mockImplementation((url: any, opts: any) => {
      if (opts?.method === 'POST') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: 'توقيع الترخيص غير مصرح به أو تم التلاعب به.',
            }),
            { status: 400 }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            status: 'MISSING_OR_INVALID',
            message: 'لا يوجد ترخيص مفعل',
          })
        )
      );
    });

    render(<LicenseManagementModal isOpen={true} onClose={vi.fn()} />);

    const input = await screen.findByTestId('license-code-input');
    fireEvent.change(input, { target: { value: 'eyJ...MODIFIED_CODE...=' } });

    const submitBtn = screen.getByTestId('license-activate-btn');
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText('توقيع الترخيص غير مصرح به أو تم التلاعب به.');
    expect(errorMsg).toBeDefined();
  });
});
