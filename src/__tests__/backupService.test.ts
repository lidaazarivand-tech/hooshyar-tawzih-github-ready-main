import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateBackupFileName,
  exportBackupFile,
  encryptBackupContent,
  decryptBackupContent
} from '../utils/backupService';
import {
  saveStoredNotes,
  saveStoredTasks,
  saveStoredExpenses,
  saveStoredDebts,
  getStoredNotes,
  getStoredTasks,
  getStoredExpenses,
  createBackupPayload,
  validateAndRestoreBackup
} from '../utils/storage';

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] ?? null; }
  setItem(key: string, value: string): void { this.store[key] = String(value); }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}

describe('Backup Service Operations', () => {
  let mockStorage: LocalStorageMock;

  beforeEach(() => {
    mockStorage = new LocalStorageMock();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', { localStorage: mockStorage });
  });

  it('generates a valid, timestamped backup file name adhering to pattern', () => {
    const fileName = generateBackupFileName();
    expect(fileName).toMatch(/^hooshyar-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);
  });

  it('encrypts backup content and rejects a wrong password', async () => {
    const plaintext = JSON.stringify({ app: 'هوشیار', secret: 'private-data' });
    const encrypted = await encryptBackupContent(plaintext, 'correct-password');
    expect(encrypted).not.toContain('private-data');
    await expect(decryptBackupContent(encrypted, 'wrong-password')).rejects.toThrow();
    await expect(decryptBackupContent(encrypted, 'correct-password')).resolves.toBe(plaintext);
  });

  it('creates complete backup payload containing all domain data', () => {
    saveStoredNotes([{ id: 'n1', title: 'یادداشت', content: 'محتوا', dateKey: '1404/01/01', createdAt: Date.now(), updatedAt: Date.now() }]);
    saveStoredTasks([{ id: 't1', text: 'کار', completed: false, priority: 'medium', dateKey: '1404/01/01', createdAt: Date.now() }]);
    saveStoredExpenses([{ id: 'e1', dateKey: '1404/01/01', amount: 50000, type: 'expense', category: 'غذا', description: 'ناهار' }]);
    saveStoredDebts([{
      id: 'd1',
      type: 'debt',
      personName: 'رضا',
      amount: 100000,
      settledAmount: 0,
      isSettled: false,
      category: 'سایر موارد',
      startDate: '1404/01/01',
      payments: [],
      createdAt: Date.now()
    }]);

    const payload = createBackupPayload();
    expect(payload.app).toBe('هوشیار');
    expect(payload.schemaVersion).toBe('3.1');
    expect(payload.data.notes.length).toBe(1);
    expect(payload.data.tasks.length).toBe(1);
    expect(payload.data.expenses.length).toBe(1);
    expect(payload.data.debts.length).toBe(1);
  });

  it('handles simulated export in browser environment gracefully', async () => {
    saveStoredNotes([{ id: 'n1', title: 'Note 1', content: 'C1', dateKey: '1404/01/01', createdAt: Date.now(), updatedAt: Date.now() }]);

    // Mock document and URL for browser export
    const clickMock = vi.fn();
    const appendMock = vi.fn();
    const removeMock = vi.fn();

    vi.stubGlobal('document', {
      body: { appendChild: appendMock },
      createElement: vi.fn().mockReturnValue({
        click: clickMock,
        parentNode: { removeChild: removeMock }
      })
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn()
    });

    const result = await exportBackupFile('test-password-123');
    expect(result.success).toBe(true);
    expect(result.fileName).toMatch(/^hooshyar-backup-/);
    expect(result.itemCounts?.notes).toBe(1);
    expect(clickMock).toHaveBeenCalled();
  });

  it('restores backup file and validates preservation of user items', () => {
    const backupJson = JSON.stringify({
      app: 'هوشیار',
      schemaVersion: '3.1',
      exportDate: new Date().toISOString(),
      data: {
        notes: [{ id: 'n-restored', title: 'یادداشت بازگردانده شده', content: 'متن', dateKey: '1404/01/01', createdAt: Date.now(), updatedAt: Date.now() }],
        tasks: [],
        reminders: [],
        expenses: [{ id: 'e-restored', dateKey: '1404/01/01', amount: 80000, type: 'expense', category: 'غذا', description: 'شام' }],
        debts: [],
        quranBookmarks: [1, 2],
        shiaBookmarks: ['dua-1']
      }
    });

    const restoreRes = validateAndRestoreBackup(backupJson);
    expect(restoreRes.success).toBe(true);

    const notes = getStoredNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('یادداشت بازگردانده شده');

    const expenses = getStoredExpenses();
    expect(expenses.length).toBe(1);
    expect(expenses[0].amount).toBe(80000);
  });

  it('safely rejects corrupted or malformed backup JSON', () => {
    const res1 = validateAndRestoreBackup('');
    expect(res1.success).toBe(false);

    const res2 = validateAndRestoreBackup('{ corrupted: json ');
    expect(res2.success).toBe(false);

    const res3 = validateAndRestoreBackup('{"unexpected": "data"}');
    expect(res3.success).toBe(false);
  });

  it('restores incomplete backup structures gracefully without losing existing data for omitted fields', () => {
    // Current user has tasks and expenses
    saveStoredTasks([{ id: 'existing-task', text: 'کار قبلی', completed: false, priority: 'medium', dateKey: '1404/01/01', createdAt: 1 }]);

    // Backup only contains notes (tasks and expenses omitted)
    const partialBackup = JSON.stringify({
      app: 'هوشیار',
      schemaVersion: '3.1',
      exportDate: new Date().toISOString(),
      data: {
        notes: [{ id: 'new-note', title: 'یادداشت جدید', content: 'محتوا', dateKey: '1404/01/01', createdAt: 2, updatedAt: 2 }]
      }
    });

    const res = validateAndRestoreBackup(partialBackup);
    expect(res.success).toBe(true);

    const notes = getStoredNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('یادداشت جدید');
  });

  it('preserves all domain entities across full export and restore cycle', () => {
    saveStoredNotes([{ id: 'n1', title: 'N1', content: 'C1', dateKey: '1404/01/01', createdAt: 1, updatedAt: 1 }]);
    saveStoredTasks([{ id: 't1', text: 'T1', completed: true, priority: 'high', dateKey: '1404/01/01', createdAt: 1 }]);
    saveStoredExpenses([{ id: 'e1', dateKey: '1404/01/01', amount: 12000, type: 'expense', category: 'خرید', description: 'توضیحات' }]);

    const payload = createBackupPayload();
    const jsonStr = JSON.stringify(payload);

    // Clear and restore
    mockStorage.clear();
    const restoreRes = validateAndRestoreBackup(jsonStr);
    expect(restoreRes.success).toBe(true);

    expect(getStoredNotes().length).toBe(1);
    expect(getStoredNotes()[0].title).toBe('N1');
    expect(getStoredTasks().length).toBe(1);
    expect(getStoredTasks()[0].text).toBe('T1');
    expect(getStoredExpenses().length).toBe(1);
    expect(getStoredExpenses()[0].amount).toBe(12000);
  });
});
