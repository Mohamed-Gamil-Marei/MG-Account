import { describe, it, expect } from 'vitest';
import { db } from './localDatabase';

describe('export and restore of closingChecklists, clientDeadlines, and openItems', () => {
  it('exports and restores closingChecklists, clientDeadlines, and openItems correctly', () => {
    // Populate test data directly on db state
    (db as any).state.closingChecklists = {
      'client1_2026': [
        { id: 's1', title: 'مراجعة الميزانية', isCompleted: true },
      ],
    };
    (db as any).state.clientDeadlines = [
      {
        id: 'd1',
        clientId: 'client1',
        title: 'إقرار القيمة المضافة',
        dueDate: '2026-10-31',
        status: 'PENDING',
        period: 'Q3',
      },
    ];
    (db as any).state.openItems = [
      {
        id: 'i1',
        clientId: 'client1',
        kind: 'DOCUMENT',
        text: 'عقد الإيجار',
        requestedAt: '2026-10-01',
        status: 'OPEN',
      },
    ];

    // Export full backup JSON
    const exportedJson = db.exportFullBackupJson();
    expect(exportedJson).toBeDefined();

    // Clear or modify state
    (db as any).state.closingChecklists = {};
    (db as any).state.clientDeadlines = [];
    (db as any).state.openItems = [];

    // Import backup JSON
    const success = db.importFullBackupJson(exportedJson);
    expect(success).toBe(true);

    // Verify restored state via db.getState()
    const state = db.getState();
    expect(state.closingChecklists).toEqual({
      'client1_2026': [
        { id: 's1', title: 'مراجعة الميزانية', isCompleted: true },
      ],
    });
    expect(state.clientDeadlines).toEqual([
      {
        id: 'd1',
        clientId: 'client1',
        title: 'إقرار القيمة المضافة',
        dueDate: '2026-10-31',
        status: 'PENDING',
        period: 'Q3',
      },
    ]);
    expect(state.openItems).toEqual([
      {
        id: 'i1',
        clientId: 'client1',
        kind: 'DOCUMENT',
        text: 'عقد الإيجار',
        requestedAt: '2026-10-01',
        status: 'OPEN',
      },
    ]);
  });
});
