import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredNotes,
  saveStoredNotes,
  getStoredTasks,
  saveStoredTasks,
  getStoredReminders,
  saveStoredReminders,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredDebts,
  saveStoredDebts,
  getStoredQuranBookmarks,
  saveStoredQuranBookmarks,
  createBackupPayload,
  validateAndRestoreBackup,
  runStorageMigrationIfNeeded,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  safeGetItem,
  safeSetItem,
  safeRemoveItem
} from '../utils/storage';

// In-memory localStorage mock
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('Storage & Migration Engine', () => {
  let mockStorage: LocalStorageMock;

  beforeEach(() => {
    mockStorage = new LocalStorageMock();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', { localStorage: mockStorage });
  });

  it('provides safe default settings when storage is empty', () => {
    const settings = getStoredSettings();
    expect(settings).toBeDefined();
    expect(settings.selectedCityId).toBe('tehran');
    expect(settings.azanReciter).toBe('moazenzadeh');
    expect(settings.azanAlarmFajr).toBe(true);
    expect(settings.azanAlarmDhuhr).toBe(true);
    expect(settings.azanAlarmMaghrib).toBe(true);
    expect(settings.fontFamily).toBe('vazir');
  });

  it('persists and retrieves updated settings correctly', () => {
    const updated = {
      ...DEFAULT_SETTINGS,
      selectedCityId: 'mashhad',
      azanReciter: 'sobhdel',
      azanAlarmFajr: false
    };
    saveStoredSettings(updated);

    const reloaded = getStoredSettings();
    expect(reloaded.selectedCityId).toBe('mashhad');
    expect(reloaded.azanReciter).toBe('sobhdel');
    expect(reloaded.azanAlarmFajr).toBe(false);
  });

  it('handles corrupted JSON in localStorage gracefully without throwing', () => {
    mockStorage.setItem(STORAGE_KEYS.SETTINGS, '{invalid json, corrupted: ');
    mockStorage.setItem(STORAGE_KEYS.NOTES, '<<<not json>>>');
    mockStorage.setItem(STORAGE_KEYS.TASKS, 'null');
    mockStorage.setItem(STORAGE_KEYS.EXPENSES, '12345');

    // Should return fallback defaults, not throw
    expect(() => getStoredSettings()).not.toThrow();
    expect(getStoredSettings().selectedCityId).toBe('tehran');

    expect(() => getStoredNotes()).not.toThrow();
    expect(getStoredNotes()).toEqual([]);

    expect(() => getStoredTasks()).not.toThrow();
    expect(getStoredTasks()).toEqual([]);

    expect(() => getStoredExpenses()).not.toThrow();
    expect(getStoredExpenses()).toEqual([]);
  });

  it('sanitizes malformed or incomplete notes and tasks', () => {
    const dirtyNotes = [
      null,
      42,
      { title: '', content: '' }, // empty title and content
      { id: 'n1', title: 'یادداشت مهم', content: 'متن یادداشت', updatedAt: Date.now() }
    ];
    mockStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(dirtyNotes));

    const notes = getStoredNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('یادداشت مهم');
  });

  it('sanitizes debts and normalizes numeric values and payments', () => {
    const dirtyDebts = [
      {
        id: 'd1',
        personName: 'علی رضایی',
        amount: '1500000', // string amount
        dueDate: '1404/02/15',
        type: 'debt',
        payments: [
          { id: 'p1', amount: '500000', dateKey: '1404/01/20' }, // string payment amount
          null, // invalid payment
          { id: 'p2', amount: -100, dateKey: '1404/01/25' } // negative payment should be zeroed
        ]
      }
    ];
    mockStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(dirtyDebts));

    const debts = getStoredDebts();
    expect(debts.length).toBe(1);
    expect(debts[0].amount).toBe(1500000);
    expect(debts[0].payments.length).toBe(2);
    expect(debts[0].settledAmount).toBe(500000);
  });

  it('runs legacy storage migration when v3 flags are absent', () => {
    // Populate legacy keys
    mockStorage.setItem('persian_calendar_notes_v3', JSON.stringify([
      { id: 'legacy-1', title: 'یادداشت قدیمی', content: 'محتوا', updatedAt: Date.now() }
    ]));
    mockStorage.setItem('persian_calendar_tasks_v3', JSON.stringify([
      { id: 'legacy-t1', text: 'کار قدیمی', completed: false, priority: 'high', createdAt: Date.now() }
    ]));

    runStorageMigrationIfNeeded();

    // Migrated data should now exist in v3 storage keys
    const notes = getStoredNotes();
    expect(notes.some(n => n.title === 'یادداشت قدیمی')).toBe(true);

    const tasks = getStoredTasks();
    expect(tasks.some(t => t.text === 'کار قدیمی')).toBe(true);

    // Migration flag should be set
    expect(mockStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION)).toBe('true');
  });

  it.each([
    [STORAGE_KEYS.SETTINGS, 'persian_calendar_settings_v3'],
    [STORAGE_KEYS.NOTES, 'persian_calendar_notes_v3'],
    [STORAGE_KEYS.TASKS, 'persian_calendar_tasks_v3'],
    [STORAGE_KEYS.REMINDERS, 'persian_calendar_reminders_v3'],
    [STORAGE_KEYS.EXPENSES, 'persian_calendar_expenses_v3'],
    [STORAGE_KEYS.DEBTS, 'persian_calendar_debts_v3'],
    [STORAGE_KEYS.QURAN_BOOKMARKS, 'quran_bookmarks'],
    [STORAGE_KEYS.SHIA_BOOKMARKS, 'shia_bookmarks']
  ])('does not complete migration when writing %s fails, then retries', (targetKey, legacyKey) => {
    safeRemoveItem(targetKey);
    safeRemoveItem(STORAGE_KEYS.MIGRATION_VERSION);
    const originalSetItem = mockStorage.setItem.bind(mockStorage);
    originalSetItem(legacyKey, 'legacy-value');
    const write = vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
      if (key === targetKey) throw new Error('simulated quota failure');
      originalSetItem(key, value);
    });

    runStorageMigrationIfNeeded();
    expect(mockStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION)).toBeNull();
    expect(mockStorage.getItem(legacyKey)).toBe('legacy-value');
    write.mockRestore();

    runStorageMigrationIfNeeded();
    expect(mockStorage.getItem(targetKey)).toBe('legacy-value');
    expect(mockStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION)).toBe('true');
  });

  it('retries the completion flag after its persistent write fails', () => {
    safeRemoveItem(STORAGE_KEYS.MIGRATION_VERSION);
    const originalSetItem = mockStorage.setItem.bind(mockStorage);
    const write = vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
      if (key === STORAGE_KEYS.MIGRATION_VERSION) throw new Error('simulated quota failure');
      originalSetItem(key, value);
    });
    runStorageMigrationIfNeeded();
    expect(mockStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION)).toBeNull();
    write.mockRestore();
    runStorageMigrationIfNeeded();
    expect(mockStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION)).toBe('true');
  });

  it('creates comprehensive backup payload with correct signature and metadata', () => {
    saveStoredNotes([{ id: 'n1', title: 'Note 1', content: 'C1', dateKey: '1404/01/01', createdAt: Date.now(), updatedAt: Date.now() }]);
    saveStoredTasks([{ id: 't1', text: 'Task 1', completed: true, priority: 'medium', dateKey: '1404/01/01', createdAt: Date.now() }]);

    const backup = createBackupPayload();
    expect(backup.app).toBe('هوشیار');
    expect(backup.schemaVersion).toBe('3.1');
    expect(backup.data.notes.length).toBe(1);
    expect(backup.data.tasks.length).toBe(1);
    expect(backup.exportDate).toBeDefined();
  });

  it('validates and restores backup payloads into storage', () => {
    const backupJson = JSON.stringify({
      app: 'هوشیار',
      schemaVersion: '3.1',
      exportDate: new Date().toISOString(),
      data: {
        settings: { ...DEFAULT_SETTINGS, selectedCityId: 'tabriz' },
        notes: [{ id: 'restored-1', title: 'بازیابی شده', content: 'متن', dateKey: '1404/01/01', createdAt: Date.now(), updatedAt: Date.now() }],
        tasks: [{ id: 'restored-t1', text: 'کار بازیابی شده', completed: false, priority: 'low', dateKey: '1404/01/01', createdAt: Date.now() }],
        reminders: [],
        expenses: [],
        debts: [],
        quranBookmarks: [],
        shiaBookmarks: []
      }
    });

    const result = validateAndRestoreBackup(backupJson);
    expect(result.success).toBe(true);
    expect(result.itemCounts?.notes).toBe(1);
    expect(result.itemCounts?.tasks).toBe(1);

    const notes = getStoredNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('بازیابی شده');

    const settings = getStoredSettings();
    expect(settings.selectedCityId).toBe('tabriz');
  });

  it('restores legacy backup structures (flat/v1/v2 schema compatibility)', () => {
    const legacyBackup = JSON.stringify({
      userNotes: [{ id: 'legacy-1', title: 'یادداشت نسخه ۲', content: 'متن نسخه ۲' }],
      userTasks: [{ id: 'legacy-t1', text: 'کار نسخه ۲' }],
      expenses: [],
      debts: []
    });

    const result = validateAndRestoreBackup(legacyBackup);
    expect(result.success).toBe(true);

    const notes = getStoredNotes();
    expect(notes.some(n => n.title === 'یادداشت نسخه ۲')).toBe(true);
  });

  it('rejects invalid or foreign backup files safely', () => {
    // Non-JSON string
    const r1 = validateAndRestoreBackup('not valid json');
    expect(r1.success).toBe(false);

    // Wrong application signature without recognizable keys
    const r2 = validateAndRestoreBackup(JSON.stringify({ app: 'other_app', version: '1.0' }));
    expect(r2.success).toBe(false);
  });

  it('strictly preserves existing user data when restore fails or receives invalid backup', () => {
    // 1. Seed existing valuable user data
    saveStoredNotes([{ id: 'preserve-note', title: 'یادداشت مهم کاربر', content: 'نباید حذف شود', dateKey: '1404/01/01', createdAt: 1, updatedAt: 1 }]);
    saveStoredTasks([{ id: 'preserve-task', text: 'کار ضروری', completed: false, priority: 'high', dateKey: '1404/01/01', createdAt: 1 }]);
    saveStoredExpenses([{ id: 'preserve-exp', dateKey: '1404/01/01', amount: 250000, type: 'expense', category: 'قبوض', description: 'قبوض ماهانه' }]);

    // 2. Attempt restoring a corrupted/invalid backup
    const invalidResult = validateAndRestoreBackup('<<<CORRUPTED BACKUP DATA>>>');
    expect(invalidResult.success).toBe(false);

    // 3. Verify original data was preserved completely
    const notes = getStoredNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('یادداشت مهم کاربر');

    const tasks = getStoredTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].text).toBe('کار ضروری');

    const expenses = getStoredExpenses();
    expect(expenses.length).toBe(1);
    expect(expenses[0].amount).toBe(250000);
  });

  it('rolls back a failed restore and preserves existing data', () => {
    const oldNote = { id: 'old-note', title: 'Existing', content: 'Keep', dateKey: '1404/01/01', createdAt: 1, updatedAt: 1 };
    const newNote = { ...oldNote, id: 'new-note', title: 'Replacement' };
    saveStoredNotes([oldNote]);
    saveStoredTasks([{ id: 'old-task', text: 'Existing', completed: false, priority: 'medium', dateKey: '1404/01/01', createdAt: 1 }]);
    const originalSetItem = mockStorage.setItem.bind(mockStorage);
    let failed = false;
    const write = vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
      if (key === STORAGE_KEYS.TASKS && !failed) {
        failed = true;
        throw new Error('simulated quota failure');
      }
      originalSetItem(key, value);
    });

    const result = validateAndRestoreBackup(JSON.stringify({
      app: 'هوشیار', schemaVersion: '3.1',
      data: { notes: [newNote], tasks: [] }
    }));
    write.mockRestore();
    expect(result.success).toBe(false);
    expect(result.message).not.toContain('بازگرداندن اطلاعات قبلی نیز کامل نشد');
    expect(mockStorage.getItem(STORAGE_KEYS.NOTES)).toContain('old-note');
    expect(mockStorage.getItem(STORAGE_KEYS.TASKS)).toContain('old-task');
    expect(getStoredNotes()[0].title).toBe('Existing');
    expect(getStoredTasks()[0].text).toBe('Existing');
  });

  it('reports a failed rollback rather than claiming existing data was recovered', () => {
    const oldNote = { id: 'old-note', title: 'Existing', content: 'Keep', dateKey: '1404/01/01', createdAt: 1, updatedAt: 1 };
    saveStoredNotes([oldNote]);
    const originalSetItem = mockStorage.setItem.bind(mockStorage);
    let noteWrites = 0;
    let failedTask = false;
    const write = vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
      if (key === STORAGE_KEYS.NOTES && ++noteWrites === 2) throw new Error('rollback write failed');
      if (key === STORAGE_KEYS.TASKS && !failedTask) {
        failedTask = true;
        throw new Error('initial restore write failed');
      }
      originalSetItem(key, value);
    });

    const result = validateAndRestoreBackup(JSON.stringify({
      app: 'هوشیار', schemaVersion: '3.1',
      data: { notes: [{ ...oldNote, id: 'new-note' }], tasks: [] }
    }));
    write.mockRestore();
    expect(result.success).toBe(false);
    expect(result.message).toContain('بازگرداندن اطلاعات قبلی نیز کامل نشد');
    expect(mockStorage.getItem(STORAGE_KEYS.NOTES)).toContain('new-note');
    safeRemoveItem(STORAGE_KEYS.NOTES);
  });

  it('persists and retrieves reminders and bookmarks with corruption handling', () => {
    // Reminders
    saveStoredReminders([{
      id: 'r1',
      title: 'یادآوری جلسه',
      dateKey: '1404/01/10',
      time: '14:30',
      enabled: true,
      notificationId: 50001
    }]);

    const reminders = getStoredReminders();
    expect(reminders.length).toBe(1);
    expect(reminders[0].title).toBe('یادآوری جلسه');

    // Quran bookmarks
    saveStoredQuranBookmarks([1, 2, 36, 114]);
    const bookmarks = getStoredQuranBookmarks();
    expect(bookmarks).toEqual([1, 2, 36, 114]);

    // Corrupted bookmarks in localStorage
    mockStorage.setItem(STORAGE_KEYS.QURAN_BOOKMARKS, 'invalid-bookmarks');
    expect(() => getStoredQuranBookmarks()).not.toThrow();
    expect(getStoredQuranBookmarks()).toEqual([]);
  });

  it('preserves reminder recurrence fields (repeatYearly and repeat) across save and load', () => {
    saveStoredReminders([
      {
        id: 'r_rec_1',
        title: 'تولد سالانه',
        dateKey: '1404-01-15',
        repeatYearly: true
      },
      {
        id: 'r_rec_2',
        title: 'قسط ماهیانه',
        dateKey: '1404-01-20',
        repeat: 'monthly'
      }
    ]);

    const reminders = getStoredReminders();
    expect(reminders.length).toBe(2);
    expect(reminders[0].repeatYearly).toBe(true);
    expect(reminders[0].repeat).toBe('yearly');
    expect(reminders[1].repeat).toBe('monthly');
  });

  it('rejects invalid Jalali reminder dates while keeping valid dates', () => {
    saveStoredReminders([
      {
        id: 'r_valid',
        title: 'یادآوری معتبر',
        dateKey: '1404-01-10'
      },
      {
        id: 'r_valid_leap',
        title: 'یادآوری کبیسه معتبر',
        dateKey: '1403-12-30'
      },
      {
        id: 'r_invalid_mehr',
        title: 'تاریخ نامعتبر مهر ۳۱',
        dateKey: '1404-07-31'
      },
      {
        id: 'r_invalid_esfand',
        title: 'تاریخ نامعتبر اسفند ۳۰ غیرکبیسه',
        dateKey: '1404-12-30'
      }
    ]);

    const reminders = getStoredReminders();
    expect(reminders.length).toBe(2);
    expect(reminders.map(r => r.id)).toEqual(['r_valid', 'r_valid_leap']);
  });

  it('normalizes legacy Jalali date keys (1404/01/01 -> 1404-01-01) and Persian digits across entities', () => {
    // 1. Notes
    mockStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([
      { id: 'n_slash', dateKey: '1404/01/01', title: 'یادداشت اسلش', content: 'متن' },
      { id: 'n_persian', dateKey: '۱۴۰۴/۰۱/۰۱', title: 'یادداشت فارسی', content: 'متن' },
      { id: 'n_leap', dateKey: '1403/12/30', title: 'کبیسه اسفند ۳۰', content: 'متن' },
      { id: 'n_invalid', dateKey: '1404/07/31', title: 'مهر ۳۱ نامعتبر', content: 'متن' }
    ]));
    const notes = getStoredNotes();
    expect(notes.find(n => n.id === 'n_slash')?.dateKey).toBe('1404-01-01');
    expect(notes.find(n => n.id === 'n_persian')?.dateKey).toBe('1404-01-01');
    expect(notes.find(n => n.id === 'n_leap')?.dateKey).toBe('1403-12-30');
    // Invalid date is preserved as-is to avoid data loss and not converted to today
    expect(notes.find(n => n.id === 'n_invalid')?.dateKey).toBe('1404/07/31');

    // 2. Tasks
    mockStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([
      { id: 't_slash', dateKey: '1404/01/01', text: 'وظیفه اسلش' },
      { id: 't_persian', dateKey: '۱۴۰۴/۰۱/۰۱', text: 'وظیفه فارسی' }
    ]));
    const tasks = getStoredTasks();
    expect(tasks[0].dateKey).toBe('1404-01-01');
    expect(tasks[1].dateKey).toBe('1404-01-01');

    // 3. Expenses
    mockStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([
      { id: 'e_slash', dateKey: '1404/01/01', amount: 1000, category: 'غذا', description: 'هزینه' }
    ]));
    const expenses = getStoredExpenses();
    expect(expenses[0].dateKey).toBe('1404-01-01');

    // 4. Debts and Payments
    mockStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([
      {
        id: 'd_legacy',
        personName: 'حمید',
        amount: 2000000,
        startDate: '1404/01/01',
        dueDate: '1404/02/01',
        type: 'debt',
        payments: [
          { id: 'p_slash', amount: 500000, dateKey: '1404/01/15' },
          { id: 'p_persian', amount: 500000, dateKey: '۱۴۰۴/۰۱/۲۰' }
        ]
      }
    ]));
    const debts = getStoredDebts();
    expect(debts[0].startDate).toBe('1404-01-01');
    expect(debts[0].dueDate).toBe('1404-02-01');
    expect(debts[0].payments[0].dateKey).toBe('1404-01-15');
    expect(debts[0].payments[1].dateKey).toBe('1404-01-20');

    // 5. Reminders: slash date is canonicalized and valid dates are kept
    mockStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([
      { id: 'r_slash', title: 'یادآوری اسلش', dateKey: '1404/01/01' },
      { id: 'r_invalid', title: 'یادآوری نامعتبر', dateKey: '1404/07/31' }
    ]));
    const reminders = getStoredReminders();
    expect(reminders.length).toBe(1);
    expect(reminders[0].id).toBe('r_slash');
    expect(reminders[0].dateKey).toBe('1404-01-01');
  });

  it('guarantees in-memory fallback and recovery when localStorage throws quota or security errors', () => {
    // 1. Initial write works
    safeSetItem('test_key_quota', 'initial_value');
    expect(safeGetItem('test_key_quota')).toBe('initial_value');

    // 2. Simulate localStorage.setItem throwing QuotaExceededError
    vi.spyOn(mockStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError: DOMException');
    });

    const success = safeSetItem('test_key_quota', 'updated_fallback_value');
    expect(success).toBe(false); // Returns false gracefully without throwing

    // safeGetItem returns the updated in-memory value rather than stale storage
    expect(safeGetItem('test_key_quota')).toBe('updated_fallback_value');

    // 3. Removal cleans both in-memory store and failed key set
    safeRemoveItem('test_key_quota');
    expect(safeGetItem('test_key_quota')).toBeNull();
  });
});
