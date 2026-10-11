import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/localDatabase';
import { fetchWithAuth } from './apiClient';
import { DEFAULT_OFFICE_PROFILE } from '../data/sampleData';

describe('Gemini AI Privacy & Office Settings (sendClientDataToGemini)', () => {
  beforeEach(() => {
    // Reset officeProfile to default
    db.updateOfficeProfile({
      ...DEFAULT_OFFICE_PROFILE,
      sendClientDataToGemini: false,
    });
  });

  it('1. Default office profile has sendClientDataToGemini disabled (false)', () => {
    expect(DEFAULT_OFFICE_PROFILE.sendClientDataToGemini).toBe(false);
    expect(db.getState().officeProfile.sendClientDataToGemini).toBe(false);
  });

  it('2. When sendClientDataToGemini is false, fetchWithAuth blocks /api/ai/* and returns "الميزة معطلة"', async () => {
    db.updateOfficeProfile({ sendClientDataToGemini: false });

    const response = await fetchWithAuth('/api/ai/suggest-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'فاتورة مبيعات', amount: 50000 }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.disabled).toBe(true);
    expect(json.error).toBe('الميزة معطلة');
    expect(json.message).toBe('الميزة معطلة');
  });

  it('3. When sendClientDataToGemini is false, fetchWithAuth blocks /api/audit/* and returns "الميزة معطلة"', async () => {
    db.updateOfficeProfile({ sendClientDataToGemini: false });

    const response = await fetchWithAuth('/api/audit/generate-review-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: 'شركة النيل', fiscalYear: 2026 }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.disabled).toBe(true);
    expect(json.error).toBe('الميزة معطلة');
  });

  it('4. When sendClientDataToGemini is true, fetchWithAuth sends request with header x-send-client-data=true', async () => {
    db.updateOfficeProfile({ sendClientDataToGemini: true });

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = mockFetch;

    try {
      const response = await fetchWithAuth('/api/ai/distribute-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSales: 10000000 }),
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalled();
      const calledHeaders = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get('x-send-client-data')).toBe('true');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
