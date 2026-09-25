import { 
  UserNote, 
  UserTask, 
  UserReminder, 
  ExpenseItem, 
  DebtItem, 
  DebtPayment,
  CalendarSettings,
  ReminderCategory
} from '../types/calendar';
import { normalizeDateKey } from './persianNumber';

export const DEFAULT_SETTINGS: CalendarSettings = {
  selectedCityId: 'tehran',
  hijriAdjustment: 0,
  showHijriInCells: true,
  showGregorianInCells: true,
  theme: 'light',
  colorTheme: 'persianRose',
  fontFamily: 'vazir',
  autoAzanEnabled: true,
  azanAlarmFajr: true,
  azanAlarmDhuhr: true,
  azanAlarmMaghrib: true,
  azanReciter: 'moazenzadeh',
  dailyNotificationEnabled: true,
  customEvents: []
};

export const STORAGE_KEYS = {
  SETTINGS: 'hooshyar_settings_v3',
  NOTES: 'hooshyar_notes_v3',
  TASKS: 'hooshyar_tasks_v3',
  REMINDERS: 'hooshyar_reminders_v3',
  EXPENSES: 'hooshyar_expenses_v3',
  DEBTS: 'hooshyar_debts_v3',
  QURAN_BOOKMARKS: 'hooshyar_quran_bookmarks_v1',
  SHIA_BOOKMARKS: 'hooshyar_shia_bookmarks_v1',
  HAS_SEEN_WELCOME: 'hooshyar_seen_welcome_v1',
  DAILY_NOTIFICATION_LAST_DAY: 'hooshyar_daily_notification_last_day_v1',
  MIGRATION_VERSION: 'hooshyar_migration_v3_done'
} as const;

const REMINDER_CATEGORY_VALUES: readonly ReminderCategory[] = [
  'birthday', 'anniversary', 'event', 'meeting',
  'bill', 'custom', 'check', 'other'
];

function isReminderCategory(value: unknown): value is ReminderCategory {
  return typeof value === 'string' &&
    REMINDER_CATEGORY_VALUES.includes(value as ReminderCategory);
}

// Legacy keys to migrate from seamlessly without data loss
const LEGACY_KEYS = {
  SETTINGS: ['persian_calendar_settings_v3', 'yar_man_calendar_settings', 'adel_calendar_settings'],
  NOTES: ['persian_calendar_notes_v3', 'yar_man_calendar_notes', 'adel_calendar_notes'],
  TASKS: ['persian_calendar_tasks_v3', 'yar_man_calendar_tasks', 'adel_calendar_tasks'],
  REMINDERS: ['persian_calendar_reminders_v3', 'yar_man_calendar_reminders', 'adel_calendar_reminders'],
  EXPENSES: ['persian_calendar_expenses_v3', 'yar_man_calendar_expenses', 'adel_calendar_finances', 'adel_calendar_expenses'],
  DEBTS: ['persian_calendar_debts_v3', 'yar_man_calendar_debts', 'adel_calendar_debts'],
  QURAN_BOOKMARKS: ['quran_bookmarks'],
  SHIA_BOOKMARKS: ['shia_bookmarks']
};

// In-memory fallback for private browsing, quota exceeded, or disabled storage environments
const inMemoryStore = new Map<string, string>();
const storageWriteFailedKeys = new Set<string>();

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  if (storageWriteFailedKeys.has(key)) {
    return inMemoryStore.get(key) ?? null;
  }
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {
    // LocalStorage inaccessible (private mode / restricted sandbox)
  }
  return inMemoryStore.get(key) ?? null;
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  inMemoryStore.set(key, value);
  try {
    localStorage.setItem(key, value);
    storageWriteFailedKeys.delete(key);
    return true;
  } catch (err) {
    storageWriteFailedKeys.add(key);
    console.warn(`[Storage] Failed to write to localStorage for key ${key}:`, err);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  inMemoryStore.delete(key);
  storageWriteFailedKeys.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

function sanitizeId(rawId: unknown, fallbackPrefix: string, index: number, seenSet: Set<string>): string {
  let id = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : `${fallbackPrefix}_${Date.now()}_${index}`;
  if (seenSet.has(id)) {
    id = `${id}_${index}_${Math.random().toString(36).slice(2, 7)}`;
  }
  seenSet.add(id);
  return id;
}

/**
 * Automatically migrates existing user data from older key variations to unified v3 keys.
 */
export function runStorageMigrationIfNeeded(): void {
  if (typeof window === 'undefined') return;
  try {
    const isMigrated = safeGetItem(STORAGE_KEYS.MIGRATION_VERSION);
    if (isMigrated === 'true' && !storageWriteFailedKeys.has(STORAGE_KEYS.MIGRATION_VERSION)) return;

    // Migrate Settings
    if (!safeGetItem(STORAGE_KEYS.SETTINGS) || storageWriteFailedKeys.has(STORAGE_KEYS.SETTINGS)) {
      for (const oldKey of LEGACY_KEYS.SETTINGS) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.SETTINGS, val)) return;
          break;
        }
      }
    }

    // Migrate Notes
    if (!safeGetItem(STORAGE_KEYS.NOTES) || storageWriteFailedKeys.has(STORAGE_KEYS.NOTES)) {
      for (const oldKey of LEGACY_KEYS.NOTES) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.NOTES, val)) return;
          break;
        }
      }
    }

    // Migrate Tasks
    if (!safeGetItem(STORAGE_KEYS.TASKS) || storageWriteFailedKeys.has(STORAGE_KEYS.TASKS)) {
      for (const oldKey of LEGACY_KEYS.TASKS) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.TASKS, val)) return;
          break;
        }
      }
    }

    // Migrate Reminders
    if (!safeGetItem(STORAGE_KEYS.REMINDERS) || storageWriteFailedKeys.has(STORAGE_KEYS.REMINDERS)) {
      for (const oldKey of LEGACY_KEYS.REMINDERS) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.REMINDERS, val)) return;
          break;
        }
      }
    }

    // Migrate Expenses
    if (!safeGetItem(STORAGE_KEYS.EXPENSES) || storageWriteFailedKeys.has(STORAGE_KEYS.EXPENSES)) {
      for (const oldKey of LEGACY_KEYS.EXPENSES) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.EXPENSES, val)) return;
          break;
        }
      }
    }

    // Migrate Debts
    if (!safeGetItem(STORAGE_KEYS.DEBTS) || storageWriteFailedKeys.has(STORAGE_KEYS.DEBTS)) {
      for (const oldKey of LEGACY_KEYS.DEBTS) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.DEBTS, val)) return;
          break;
        }
      }
    }

    // Migrate Bookmarks
    if (!safeGetItem(STORAGE_KEYS.QURAN_BOOKMARKS) || storageWriteFailedKeys.has(STORAGE_KEYS.QURAN_BOOKMARKS)) {
      for (const oldKey of LEGACY_KEYS.QURAN_BOOKMARKS) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.QURAN_BOOKMARKS, val)) return;
          break;
        }
      }
    }

    if (!safeGetItem(STORAGE_KEYS.SHIA_BOOKMARKS) || storageWriteFailedKeys.has(STORAGE_KEYS.SHIA_BOOKMARKS)) {
      for (const oldKey of LEGACY_KEYS.SHIA_BOOKMARKS) {
        const val = safeGetItem(oldKey);
        if (val) {
          if (!safeSetItem(STORAGE_KEYS.SHIA_BOOKMARKS, val)) return;
          break;
        }
      }
    }

    safeSetItem(STORAGE_KEYS.MIGRATION_VERSION, 'true');
  } catch (err) {
    console.warn('Storage migration warning:', err);
  }
}

// Initial migration execution on script load
runStorageMigrationIfNeeded();

// --- Settings ---
export function getStoredSettings(): CalendarSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const hijriAdjustment = Number.isFinite(parsed.hijriAdjustment)
          ? Math.max(-2, Math.min(2, Math.trunc(parsed.hijriAdjustment)))
          : DEFAULT_SETTINGS.hijriAdjustment;

        const theme = parsed.theme === 'dark' ? 'dark' : 'light';
        const colorTheme = typeof parsed.colorTheme === 'string' && parsed.colorTheme.trim()
          ? parsed.colorTheme.trim()
          : DEFAULT_SETTINGS.colorTheme;
        const fontFamily = typeof parsed.fontFamily === 'string' && parsed.fontFamily.trim()
          ? parsed.fontFamily.trim()
          : DEFAULT_SETTINGS.fontFamily;
        const selectedCityId = typeof parsed.selectedCityId === 'string' && parsed.selectedCityId.trim()
          ? parsed.selectedCityId.trim()
          : DEFAULT_SETTINGS.selectedCityId;

        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          theme,
          colorTheme,
          fontFamily,
          selectedCityId,
          hijriAdjustment
        };
      }
    }
  } catch (e) {
    console.error('Failed to load settings from storage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: CalendarSettings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to storage', e);
    return false;
  }
}

/**
 * Normalizes valid Jalali date strings into canonical YYYY-MM-DD format.
 * If the input is not a valid Jalali date, preserves the original trimmed string
 * to prevent data loss.
 */
function normalizeCanonicalDateKey(val?: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  const norm = normalizeDateKey(trimmed);
  return (/^\d{4}-\d{2}-\d{2}$/.test(norm)) ? norm : trimmed;
}

// --- Notes ---
export function getStoredNotes(): UserNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.NOTES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        return parsed
          .filter(n => n && typeof n === 'object')
          .map((n, idx) => {
            const body = typeof n.content === 'string' ? n.content : (typeof n.text === 'string' ? n.text : '');
            const safeCreated = Number.isFinite(n.createdAt) && n.createdAt > 0 ? n.createdAt : Date.now();
            const safeUpdated = Number.isFinite(n.updatedAt) && n.updatedAt > 0 ? n.updatedAt : safeCreated;
            return {
              id: sanitizeId(n.id, 'note', idx, seenIds),
              dateKey: normalizeCanonicalDateKey(n.dateKey),
              title: typeof n.title === 'string' ? n.title.slice(0, 500) : '',
              content: body.slice(0, 50000),
              color: typeof n.color === 'string' ? n.color : undefined,
              category: typeof n.category === 'string' ? n.category : undefined,
              createdAt: safeCreated,
              updatedAt: safeUpdated
            };
          })
          .filter(n => n.content.trim().length > 0 || n.title.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load notes from storage', e);
  }
  return [];
}

export function saveStoredNotes(notes: UserNote[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to storage', e);
    return false;
  }
}

// --- Tasks ---
export function getStoredTasks(): UserTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        return parsed
          .filter(t => t && typeof t === 'object')
          .map((t, idx) => ({
            id: sanitizeId(t.id, 'task', idx, seenIds),
            dateKey: normalizeCanonicalDateKey(t.dateKey),
            text: typeof t.text === 'string' ? t.text.slice(0, 1000) : '',
            completed: Boolean(t.completed),
            priority: t.priority === 'high' || t.priority === 'low' ? t.priority : 'medium',
            createdAt: Number.isFinite(t.createdAt) && t.createdAt > 0 ? t.createdAt : Date.now()
          }))
          .filter(t => t.text.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load tasks from storage', e);
  }
  return [];
}

export function saveStoredTasks(tasks: UserTask[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to storage', e);
    return false;
  }
}

// --- Reminders ---
export function getStoredReminders(): UserReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.REMINDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        return parsed
          .filter(r => r && typeof r === 'object')
          .map((r, idx) => {
            const isYearly = r.repeatYearly === true || r.repeat === 'yearly';
            const safeCreated = Number.isFinite(r.createdAt) && r.createdAt > 0 ? r.createdAt : Date.now();
            const normalizedType: ReminderCategory = isReminderCategory(r.type) ? r.type : 'other';
            const normalizedCategory: ReminderCategory = isReminderCategory(r.category)
              ? r.category
              : normalizedType;
            return {
              id: sanitizeId(r.id, 'rem', idx, seenIds),
              dateKey: normalizeCanonicalDateKey(r.dateKey),
              time: typeof r.time === 'string' ? r.time : undefined,
              title: typeof r.title === 'string' ? r.title.slice(0, 500) : '',
              type: normalizedType,
              category: normalizedCategory,
              repeatYearly: isYearly ? true : (typeof r.repeatYearly === 'boolean' ? r.repeatYearly : undefined),
              repeat: isYearly ? 'yearly' : ((r.repeat === 'monthly' || r.repeat === 'weekly') ? r.repeat : 'none'),
              enabled: typeof r.enabled === 'boolean' ? r.enabled : (typeof r.isEnabled === 'boolean' ? r.isEnabled : true),
              isEnabled: typeof r.isEnabled === 'boolean' ? r.isEnabled : (typeof r.enabled === 'boolean' ? r.enabled : true),
              notificationId: typeof r.notificationId === 'number' && Number.isFinite(r.notificationId) ? r.notificationId : undefined,
              notes: typeof r.notes === 'string' ? r.notes.slice(0, 5000) : undefined,
              createdAt: safeCreated
            };
          })
          .filter(r => r.title.trim().length > 0 && r.dateKey.trim().length > 0 && Boolean(normalizeDateKey(r.dateKey)));
      }
    }
  } catch (e) {
    console.error('Failed to load reminders from storage', e);
  }
  return [];
}

export function saveStoredReminders(reminders: UserReminder[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (e) {
    console.error('Failed to save reminders to storage', e);
    return false;
  }
}

// --- Expenses ---
export function getStoredExpenses(): ExpenseItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.EXPENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        return parsed
          .filter(e => e && typeof e === 'object')
          .map((e, idx) => {
            const rawAmount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0).replace(/,/g, ''));
            const safeAmount = Number.isFinite(rawAmount) && rawAmount >= 0 && rawAmount <= 1e12
              ? Math.round(rawAmount * 100) / 100
              : 0;
            const itemType: 'income' | 'expense' = e.type === 'income' ? 'income' : 'expense';
            return {
              id: sanitizeId(e.id, 'exp', idx, seenIds),
              dateKey: normalizeCanonicalDateKey(e.dateKey),
              amount: safeAmount,
              type: itemType,
              category: typeof e.category === 'string' && e.category.trim() ? e.category.trim().slice(0, 100) : 'سایر',
              description: typeof e.description === 'string' ? e.description.slice(0, 2000) : '',
              sourceDebtId: typeof e.sourceDebtId === 'string' && e.sourceDebtId.trim()
                ? e.sourceDebtId.trim()
                : undefined,
              sourcePaymentId: typeof e.sourcePaymentId === 'string' && e.sourcePaymentId.trim()
                ? e.sourcePaymentId.trim()
                : undefined
            };
          })
          .filter(e => e.amount > 0 || e.description.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load expenses from storage', e);
  }
  return [];
}

export function saveStoredExpenses(expenses: ExpenseItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save expenses to storage', e);
    return false;
  }
}

// --- Debts ---
export function getStoredDebts(): DebtItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.DEBTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        return parsed
          .filter(d => d && typeof d === 'object')
          .map((d, idx) => {
            const rawAmount = typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount || 0).replace(/,/g, ''));
            const safeAmount = Number.isFinite(rawAmount) && rawAmount >= 0 && rawAmount <= 1e12
              ? Math.round(rawAmount * 100) / 100
              : 0;

            const rawPayments = Array.isArray(d.payments) ? d.payments : [];
            const seenPaymentIds = new Set<string>();
            const safePayments: DebtPayment[] = rawPayments
              .filter((p: unknown): p is Record<string, unknown> => p !== null && typeof p === 'object')
              .map((p, pIdx: number) => {
                const pNum = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || 0).replace(/,/g, ''));
                const safePAmount = Number.isFinite(pNum) && pNum >= 0 && pNum <= 1e12
                  ? Math.round(pNum * 100) / 100
                  : 0;
                return {
                  id: sanitizeId(p.id, 'pay', pIdx, seenPaymentIds),
                  amount: safePAmount,
                  dateKey: normalizeCanonicalDateKey(p.dateKey),
                  note: typeof p.note === 'string' ? p.note.slice(0, 1000) : undefined,
                  createdAt: Number.isFinite(p.createdAt) && p.createdAt > 0 ? p.createdAt : Date.now()
                };
              });

            const paymentsSum = safePayments.reduce((acc, p) => acc + p.amount, 0);
            const numSettled = typeof d.settledAmount === 'number' ? d.settledAmount : paymentsSum;
            const normalizedSettled = Number.isFinite(numSettled) && numSettled >= 0 && numSettled <= 1e12
              ? Math.round(numSettled * 100) / 100
              : 0;
            const rawSettled = safePayments.length > 0 ? paymentsSum : normalizedSettled;
            const safeSettled = Math.min(safeAmount, Math.max(0, Math.round(rawSettled * 100) / 100));
            const isSettled = safeAmount > 0 && safeSettled >= safeAmount;
            const debtType: 'debt' | 'credit' = d.type === 'debt' ? 'debt' : 'credit';

            return {
              id: sanitizeId(d.id, 'debt', idx, seenIds),
              type: debtType,
              personName: typeof d.personName === 'string' && d.personName.trim() ? d.personName.trim().slice(0, 200) : 'بدون نام',
              phone: typeof d.phone === 'string' ? d.phone.slice(0, 50) : undefined,
              amount: safeAmount,
              settledAmount: safeSettled,
              isSettled,
              category: typeof d.category === 'string' ? d.category.slice(0, 100) : 'سایر موارد',
              startDate: normalizeCanonicalDateKey(d.startDate),
              dueDate: typeof d.dueDate === 'string' && d.dueDate.trim().length > 0 
                ? normalizeCanonicalDateKey(d.dueDate) 
                : undefined,
              description: typeof d.description === 'string' ? d.description.slice(0, 2000) : undefined,
              payments: safePayments,
              createdAt: Number.isFinite(d.createdAt) && d.createdAt > 0 ? d.createdAt : Date.now()
            };
          })
          .filter(d => d.personName.length > 0 && d.amount > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load debts from storage', e);
  }
  return [];
}

export function saveStoredDebts(debts: DebtItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  } catch (e) {
    console.error('Failed to save debts to storage', e);
    return false;
  }
}

// --- Quran Bookmarks ---
export function getStoredQuranBookmarks(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.QURAN_BOOKMARKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load Quran bookmarks', e);
  }
  return [];
}

export function saveStoredQuranBookmarks(bookmarks: number[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.QURAN_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save Quran bookmarks', e);
    return false;
  }
}

// --- Shia Bookmarks ---
export function getStoredShiaBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(STORAGE_KEYS.SHIA_BOOKMARKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load Shia bookmarks', e);
  }
  return [];
}

export function saveStoredShiaBookmarks(bookmarks: string[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return safeSetItem(STORAGE_KEYS.SHIA_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save Shia bookmarks', e);
    return false;
  }
}

export function getLastDailyNotificationDay(): string {
  if (typeof window === 'undefined') return '';
  return safeGetItem(STORAGE_KEYS.DAILY_NOTIFICATION_LAST_DAY) || '';
}

export function setLastDailyNotificationDay(dateKey: string): boolean {
  if (typeof window === 'undefined') return false;
  return safeSetItem(STORAGE_KEYS.DAILY_NOTIFICATION_LAST_DAY, dateKey);
}

// --- Welcome Modal Status ---
export function getHasSeenWelcome(): boolean {
  if (typeof window === 'undefined') return true;
  return safeGetItem(STORAGE_KEYS.HAS_SEEN_WELCOME) === 'true';
}

export function setHasSeenWelcome(seen: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    safeSetItem(STORAGE_KEYS.HAS_SEEN_WELCOME, seen ? 'true' : 'false');
  } catch {}
}

// --- Backup & Restore Structure ---
export interface HooshyarBackupPayload {
  app: 'هوشیار';
  schemaVersion: '3.1';
  exportDate: string;
  data: {
    settings: CalendarSettings;
    notes: UserNote[];
    tasks: UserTask[];
    reminders: UserReminder[];
    expenses: ExpenseItem[];
    debts: DebtItem[];
    quranBookmarks: number[];
    shiaBookmarks: string[];
  };
}

/**
 * Creates a comprehensive, schema-versioned backup payload of all user data.
 */
export function createBackupPayload(): HooshyarBackupPayload {
  return {
    app: 'هوشیار',
    schemaVersion: '3.1',
    exportDate: new Date().toISOString(),
    data: {
      settings: getStoredSettings(),
      notes: getStoredNotes(),
      tasks: getStoredTasks(),
      reminders: getStoredReminders(),
      expenses: getStoredExpenses(),
      debts: getStoredDebts(),
      quranBookmarks: getStoredQuranBookmarks(),
      shiaBookmarks: getStoredShiaBookmarks()
    }
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  itemCounts?: {
    notes: number;
    tasks: number;
    reminders: number;
    expenses: number;
    debts: number;
  };
  restoredData?: HooshyarBackupPayload['data'];
}

/**
 * Validates and restores a backup JSON string or object, supporting backward compatibility.
 */
export function validateAndRestoreBackup(jsonString: string): RestoreResult {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است.' };
    }

    // Validate authentic Hooshyar payload structure before any mutation
    const hasExplicitMetadata =
      Object.prototype.hasOwnProperty.call(parsed, 'app') ||
      Object.prototype.hasOwnProperty.call(parsed, 'schemaVersion');
    const isV31 = parsed.app === 'هوشیار' &&
      parsed.schemaVersion === '3.1' &&
      parsed.data &&
      typeof parsed.data === 'object';
    const isLegacy = !hasExplicitMetadata && Boolean(
      parsed.settings ||
      parsed.userNotes ||
      parsed.notes ||
      parsed.userTasks ||
      parsed.tasks ||
      parsed.userReminders ||
      parsed.reminders ||
      parsed.userFinances ||
      parsed.expenses ||
      parsed.debts ||
      parsed.userDebts ||
      parsed.persian_calendar_settings_v3
    );

    if (hasExplicitMetadata && !isV31) {
      return {
        success: false,
        message: 'نسخه یا امضای فایل پشتیبان پشتیبانی نمی‌شود.'
      };
    }

    if (!isV31 && !isLegacy) {
      return {
        success: false,
        message: 'فایل انتخابی یک فایل پشتیبان معتبر هوشیار نیست و داده‌های فعلی بدون تغییر حفظ شدند.'
      };
    }

    let settings: CalendarSettings = getStoredSettings();
    let notes: UserNote[] = getStoredNotes();
    let tasks: UserTask[] = getStoredTasks();
    let reminders: UserReminder[] = getStoredReminders();
    let expenses: ExpenseItem[] = getStoredExpenses();
    let debts: DebtItem[] = getStoredDebts();
    let quranBookmarks: number[] = getStoredQuranBookmarks();
    let shiaBookmarks: string[] = getStoredShiaBookmarks();

    // Snapshot current state for rollback if writing fails
    const rollbackSnapshot = {
      settings,
      notes,
      tasks,
      reminders,
      expenses,
      debts,
      quranBookmarks,
      shiaBookmarks
    };

    try {
      // Format v3.1: contains parsed.data object
      if (parsed.data && typeof parsed.data === 'object') {
        const d = parsed.data;
        const collections = [
          ['notes', d.notes], ['tasks', d.tasks], ['reminders', d.reminders],
          ['expenses', d.expenses], ['debts', d.debts],
          ['quranBookmarks', d.quranBookmarks], ['shiaBookmarks', d.shiaBookmarks]
        ] as const;
        for (const [field, value] of collections) {
          if (value !== undefined && !Array.isArray(value)) {
            throw new Error(`فیلد ${field} باید آرایه باشد.`);
          }
          if (Array.isArray(value) && value.length > 10000) {
            throw new Error(`تعداد عناصر ${field} بیش از حد مجاز است.`);
          }
        }
        if (d.settings) settings = { ...DEFAULT_SETTINGS, ...d.settings };
        if (Array.isArray(d.notes)) notes = d.notes;
        if (Array.isArray(d.tasks)) tasks = d.tasks;
        if (Array.isArray(d.reminders)) reminders = d.reminders;
        if (Array.isArray(d.expenses)) expenses = d.expenses;
        if (Array.isArray(d.debts)) debts = d.debts;
        if (Array.isArray(d.quranBookmarks)) quranBookmarks = d.quranBookmarks;
        if (Array.isArray(d.shiaBookmarks)) shiaBookmarks = d.shiaBookmarks;
      } else {
        // Legacy Format Support (e.g. flat keys or old naming)
        if (parsed.settings) settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        if (Array.isArray(parsed.userNotes || parsed.notes)) notes = parsed.userNotes || parsed.notes;
        if (Array.isArray(parsed.userTasks || parsed.tasks)) tasks = parsed.userTasks || parsed.tasks;
        if (Array.isArray(parsed.userReminders || parsed.reminders)) reminders = parsed.userReminders || parsed.reminders;
        if (Array.isArray(parsed.userFinances || parsed.expenses)) expenses = parsed.userFinances || parsed.expenses;
        if (Array.isArray(parsed.debts || parsed.userDebts)) debts = parsed.debts || parsed.userDebts;
        if (Array.isArray(parsed.quranBookmarks)) quranBookmarks = parsed.quranBookmarks;
        if (Array.isArray(parsed.shiaBookmarks)) shiaBookmarks = parsed.shiaBookmarks;
      }

      // Persist restored data
      const writeResults = [
        saveStoredSettings(settings),
        saveStoredNotes(notes),
        saveStoredTasks(tasks),
        saveStoredReminders(reminders),
        saveStoredExpenses(expenses),
        saveStoredDebts(debts),
        saveStoredQuranBookmarks(quranBookmarks),
        saveStoredShiaBookmarks(shiaBookmarks)
      ];
      if (writeResults.some(result => !result)) {
        throw new Error('ذخیره‌سازی کامل پشتیبان در حافظه دائمی انجام نشد.');
      }

      // Retrieve cleanly normalized and sanitized versions
      const cleanSettings = getStoredSettings();
      const cleanNotes = getStoredNotes();
      const cleanTasks = getStoredTasks();
      const cleanReminders = getStoredReminders();
      const cleanExpenses = getStoredExpenses();
      const cleanDebts = getStoredDebts();
      const cleanQuranBookmarks = getStoredQuranBookmarks();
      const cleanShiaBookmarks = getStoredShiaBookmarks();

      // Re-save cleanly sanitized versions to ensure stored JSON is normalized
      const normalizedWriteResults = [
        saveStoredNotes(cleanNotes),
        saveStoredTasks(cleanTasks),
        saveStoredReminders(cleanReminders),
        saveStoredExpenses(cleanExpenses),
        saveStoredDebts(cleanDebts)
      ];
      if (normalizedWriteResults.some(result => !result)) {
        throw new Error('تأیید و ذخیره نسخه پاک‌سازی‌شده ناموفق بود.');
      }

      return {
        success: true,
        message: 'بازیابی اطلاعات با موفقیت انجام شد.',
        itemCounts: {
          notes: cleanNotes.length,
          tasks: cleanTasks.length,
          reminders: cleanReminders.length,
          expenses: cleanExpenses.length,
          debts: cleanDebts.length
        },
        restoredData: {
          settings: cleanSettings,
          notes: cleanNotes,
          tasks: cleanTasks,
          reminders: cleanReminders,
          expenses: cleanExpenses,
          debts: cleanDebts,
          quranBookmarks: cleanQuranBookmarks,
          shiaBookmarks: cleanShiaBookmarks
        }
      };
    } catch (innerErr) {
      // Rollback to prior snapshot
      const rollbackResults = [
        saveStoredSettings(rollbackSnapshot.settings),
        saveStoredNotes(rollbackSnapshot.notes),
        saveStoredTasks(rollbackSnapshot.tasks),
        saveStoredReminders(rollbackSnapshot.reminders),
        saveStoredExpenses(rollbackSnapshot.expenses),
        saveStoredDebts(rollbackSnapshot.debts),
        saveStoredQuranBookmarks(rollbackSnapshot.quranBookmarks),
        saveStoredShiaBookmarks(rollbackSnapshot.shiaBookmarks)
      ];
      if (rollbackResults.some(result => !result)) {
        throw new Error('بازیابی ناموفق بود و بازگرداندن اطلاعات قبلی نیز کامل نشد. اطلاعات ذخیره‌شده را بررسی کنید.');
      }
      throw innerErr;
    }
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در بازخوانی فایل پشتیبان: ${err?.message || 'قالب فایل نامعتبر است'}`
    };
  }
}

/**
 * Resets all user data safely and clears storage.
 */
export function resetAllStorageData(): void {
  if (typeof window === 'undefined') return;
  try {
    Object.values(STORAGE_KEYS).forEach(k => {
      safeRemoveItem(k);
    });
    // Also clean any legacy keys
    Object.values(LEGACY_KEYS).forEach(list => {
      list.forEach(k => safeRemoveItem(k));
    });
  } catch (e) {
    console.error('Failed to reset storage data', e);
  }
}

// Aliases for compatibility
export const loadSettings = getStoredSettings;
export const saveSettings = saveStoredSettings;
export const loadNotes = getStoredNotes;
export const saveNotes = saveStoredNotes;
export const loadTasks = getStoredTasks;
export const saveTasks = saveStoredTasks;
export const loadReminders = getStoredReminders;
export const saveReminders = saveStoredReminders;
export const loadExpenses = getStoredExpenses;
export const saveExpenses = saveStoredExpenses;
export const loadDebts = getStoredDebts;
export const saveDebts = saveStoredDebts;
