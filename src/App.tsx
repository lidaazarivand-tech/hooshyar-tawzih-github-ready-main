import React, { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { 
  AppTab, 
  CalendarSettings, 
  FullDateInfo, 
  UserNote, 
  UserTask, 
  UserReminder, 
  ExpenseItem, 
  DebtItem, 
  DebtPayment
} from './types/calendar';
import { THEME_PRESETS } from './utils/themePresets';
import { makeDateKey, normalizeDateKey } from './utils/persianNumber';
import { azanScheduler } from './utils/azanScheduler';
import { initNotificationService, isCapacitorNative, syncAllUserReminders, requestNotificationPermission } from './utils/notificationService';
import {
  checkAzanLaunchNotification,
  addAzanNotificationOpenedListener,
  cancelAllNativeAzanAlarms,
  stopNativeAzanPlayback
} from './utils/nativeAzan';
import { useTodayDate } from './hooks/useTodayDate';
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
  getHasSeenWelcome,
  setHasSeenWelcome,
  resetAllStorageData,
  DEFAULT_SETTINGS
} from './utils/storage';
import { IRANIAN_CITIES } from './utils/prayerTimes';

// Views & Components
import { SplashScreen } from './components/Splash/SplashScreen';
import { Navbar } from './components/Navigation/Navbar';
import { HomeView } from './components/Home/HomeView';
import { CalendarView } from './components/Calendar/CalendarView';
import { DateConverterView } from './components/DateConverter/DateConverterView';
import { TasksView } from './components/Tasks/TasksView';
import { FinanceView } from './components/Finance/FinanceView';
import { NotesView } from './components/Notes/NotesView';
import { RemindersView } from './components/Reminders/RemindersView';
import { SettingsView } from './components/Settings/SettingsView';
import { MoreView } from './components/More/MoreView';
import { AzanTopBanner } from './components/Azan/AzanTopBanner';
import { WelcomeModal } from './components/Welcome/WelcomeModal';

// Modals
import { OccasionSearchModal } from './components/Calendar/OccasionSearchModal';
import { GoToDateModal } from './components/Calendar/GoToDateModal';
import { GlobalSearchModal } from './components/Search/GlobalSearchModal';
import { BooksDeepLink } from './components/Search/GlobalSearchModal';
import { QuickAddModal } from './components/QuickAdd/QuickAddModal';
import { QiblaModal } from './components/Qibla/QiblaModal';
import { AgeCalculatorModal } from './components/AgeCalculator/AgeCalculatorModal';
import { DailyCardModal } from './components/DailyCard/DailyCardModal';
import { AzanModal } from './components/Azan/AzanModal';

const ShiaBooksModal = React.lazy(() =>
  import('./components/Books/ShiaBooksModal').then(module => ({ default: module.ShiaBooksModal }))
);

const APP_TABS: readonly AppTab[] = [
  'home', 'calendar', 'library', 'tasks', 'finance', 'more',
  'converter', 'notes', 'reminders', 'settings'
];

interface ParsedDeepLink {
  tab: AppTab;
  year?: number;
  month?: number;
  day?: number;
}

function parseDeepLink(rawUrl: string): ParsedDeepLink | null {
  try {
    const normalized = rawUrl.startsWith('hooshyar://')
      ? rawUrl.replace(/^hooshyar:\/\/(?:open)?\/?/, 'https://hooshyar.local/')
      : rawUrl;
    const url = new URL(normalized, window.location.origin);
    const params = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.replace(/^#\/?/, ''));
    const get = (key: string) => params.get(key) ?? hashParams.get(key);
    const requestedTab = get('tab') ?? (url.pathname.split('/').filter(Boolean)[0] || 'home');
    const tab = APP_TABS.includes(requestedTab as AppTab) ? requestedTab as AppTab : 'home';
    const toInt = (value: string | null) => value && /^\d+$/.test(value) ? Number(value) : undefined;
    const year = toInt(get('year'));
    const month = toInt(get('month'));
    const day = toInt(get('day'));
    return {
      tab,
      year: year && year >= 1200 && year <= 1700 ? year : undefined,
      month: month && month >= 1 && month <= 12 ? month : undefined,
      day: day && day >= 1 && day <= 31 ? day : undefined
    };
  } catch {
    return null;
  }
}

export function App() {
  // 1. Settings State (loaded from unified storage)
  const [settings, setSettings] = useState<CalendarSettings>(() => getStoredSettings());

  // 2. Reactive Today Date (auto midnight rollover + foreground check)
  const { todayJalali, todayInfo, refreshDate } = useTodayDate(settings.hijriAdjustment);

  // 3. Splash & Welcome Screen State
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !getHasSeenWelcome());

  // 4. Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [navigationHistory, setNavigationHistory] = useState<AppTab[]>(['home']);
  const [exitToastVisible, setExitToastVisible] = useState<boolean>(false);
  const lastBackPressRef = useRef<number>(0);
  const suppressNextPopRef = useRef<boolean>(false);

  // Calendar View Selected Year/Month/Day State
  const [calendarYear, setCalendarYear] = useState<number>(todayJalali.jy);
  const [calendarMonth, setCalendarMonth] = useState<number>(todayJalali.jm);
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<number | null>(todayJalali.jd);
  const [autoOpenCalendarDayDetail, setAutoOpenCalendarDayDetail] = useState<boolean>(false);

  const applyDeepLink = useCallback((rawUrl: string) => {
    const target = parseDeepLink(rawUrl);
    if (!target) return;
    if (target.tab === 'library') {
      setBooksDeepLink(null);
      setBooksViewLevel('shelf');
      setIsBooksOpen(true);
      return;
    }
    setActiveTab(target.tab);
    setNavigationHistory(target.tab === 'home' ? ['home'] : ['home', target.tab]);
    if (target.tab === 'calendar') {
      if (target.year) setCalendarYear(target.year);
      if (target.month) setCalendarMonth(target.month);
      if (target.day) {
        setCalendarSelectedDay(target.day);
        setAutoOpenCalendarDayDetail(true);
      }
    }
  }, []);

  useEffect(() => {
    applyDeepLink(window.location.href);
    let urlListener: PluginListenerHandle | undefined;
    let disposed = false;
    if (isCapacitorNative()) {
      CapacitorApp.getLaunchUrl().then(result => {
        if (!disposed && result?.url) applyDeepLink(result.url);
      }).catch(() => {});
      CapacitorApp.addListener('appUrlOpen', ({ url }) => applyDeepLink(url)).then(listener => {
        if (disposed) listener.remove();
        else urlListener = listener;
      }).catch(() => {});
    }
    return () => {
      disposed = true;
      urlListener?.remove();
    };
  }, [applyDeepLink]);

  // Synchronize calendar year/month when today changes
  const prevJalaliRef = useRef(todayJalali);
  useEffect(() => {
    if (
      prevJalaliRef.current.jy !== todayJalali.jy || 
      prevJalaliRef.current.jm !== todayJalali.jm
    ) {
      prevJalaliRef.current = todayJalali;
      setCalendarYear(todayJalali.jy);
      setCalendarMonth(todayJalali.jm);
      setCalendarSelectedDay(todayJalali.jd);
    }
  }, [todayJalali]);

  // Scroll to top on active tab change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
  }, [activeTab]);

  // 5. User Data States (loaded from unified storage)
  const [userNotes, setUserNotes] = useState<UserNote[]>(() => getStoredNotes());
  const [userTasks, setUserTasks] = useState<UserTask[]>(() => getStoredTasks());
  const [userReminders, setUserReminders] = useState<UserReminder[]>(() => getStoredReminders());
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => getStoredExpenses());
  const [debts, setDebts] = useState<DebtItem[]>(() => getStoredDebts());

  // 6. Modals State
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [quickAddInitialType, setQuickAddInitialType] = useState<'task' | 'note' | 'reminder' | 'expense' | 'debt'>('task');
  const [isGoToOpen, setIsGoToOpen] = useState<boolean>(false);
  const [isOccasionSearchOpen, setIsOccasionSearchOpen] = useState<boolean>(false);
  const [isQiblaOpen, setIsQiblaOpen] = useState<boolean>(false);
  const [isBooksOpen, setIsBooksOpen] = useState<boolean>(false);
  const [booksViewLevel, setBooksViewLevel] = useState<'shelf' | 'catalog' | 'reader'>('shelf');
  const [booksDeepLink, setBooksDeepLink] = useState<BooksDeepLink | null>(null);
  const [isAgeCalcOpen, setIsAgeCalcOpen] = useState<boolean>(false);
  const [isDailyCardOpen, setIsDailyCardOpen] = useState<boolean>(false);
  const [isAzanOpen, setIsAzanOpen] = useState<boolean>(false);

  const [converterInitialDate, setConverterInitialDate] = useState<{ jy: number; jm: number; jd: number }>(todayJalali);

  // Storage Refs
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    saveStoredSettings(settings);
  }, [settings]);

  // Synchronize dynamic typography across the entire document (including portals/modals)
  useEffect(() => {
    const font = settings.fontFamily || 'vazir';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font', font);
      document.body.classList.remove('font-vazir', 'font-shabnam', 'font-sahel', 'font-samim', 'font-parastoo');
      document.body.classList.add(`font-${font}`);
    }
  }, [settings.fontFamily]);

  const todayInfoRef = useRef(todayInfo);
  useEffect(() => {
    todayInfoRef.current = todayInfo;
  }, [todayInfo]);

  const userRemindersRef = useRef(userReminders);
  useEffect(() => {
    userRemindersRef.current = userReminders;
  }, [userReminders]);

  // Persist user data states to storage on changes
  useEffect(() => {
    saveStoredNotes(userNotes);
  }, [userNotes]);

  useEffect(() => {
    saveStoredTasks(userTasks);
  }, [userTasks]);

  useEffect(() => {
    saveStoredReminders(userReminders);
    syncAllUserReminders(userReminders);
  }, [userReminders]);

  useEffect(() => {
    saveStoredExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveStoredDebts(debts);
  }, [debts]);

  // Reschedule Azan notifications whenever relevant Azan settings or today changes
  useEffect(() => {
    azanScheduler.scheduleNativeAlarms(settings, todayInfo);
  }, [
    settings.autoAzanEnabled,
    settings.selectedCityId,
    settings.azanReciter,
    settings.azanAlarmFajr,
    settings.azanAlarmDhuhr,
    settings.azanAlarmMaghrib,
    todayInfo
  ]);

  // Init Azan Scheduler & Native Notifications Channels
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await initNotificationService();
        const granted = await requestNotificationPermission();
        if (granted) {
          azanScheduler.scheduleNativeAlarms(settingsRef.current, todayInfoRef.current, true);
          syncAllUserReminders(userRemindersRef.current);
        }
      } catch (e) {
        console.warn('Failed to setup notifications:', e);
      }
    };
    setupNotifications();

    // Check if app was opened from native Azan alarm notification on cold start
    checkAzanLaunchNotification().then(res => {
      if (res.wasLaunchedFromAzan) {
        setIsAzanOpen(true);
      }
    }).catch(() => {});

    // Listen for azan notification tap when app is in background
    let nativeAzanNotifListener: { remove: () => void } | null = null;
    addAzanNotificationOpenedListener(() => {
      setIsAzanOpen(true);
    }).then(listener => {
      nativeAzanNotifListener = listener;
    }).catch(() => {});

    // Listen for custom event when user taps Azan notification in web/foreground
    const handleOpenAzan = () => {
      setIsAzanOpen(true);
    };
    window.addEventListener('open-azan-modal', handleOpenAzan);

    // Listen for exact alarm permission granted event to immediately schedule native exact alarms
    const handleExactAlarmGranted = () => {
      azanScheduler.scheduleNativeAlarms(settingsRef.current, todayInfoRef.current, true);
    };
    window.addEventListener('exact-alarm-permission-granted', handleExactAlarmGranted);

    azanScheduler.start(
      () => settingsRef.current,
      () => todayInfoRef.current
    );

    return () => {
      if (nativeAzanNotifListener) {
        try {
          nativeAzanNotifListener.remove();
        } catch {}
      }
      window.removeEventListener('open-azan-modal', handleOpenAzan);
      window.removeEventListener('exact-alarm-permission-granted', handleExactAlarmGranted);
      azanScheduler.stop();
    };
  }, []);

  // Reset scroll to top when active tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab]);

  // Android Hardware Back Button Handler & Navigation History
  const handleNavigateTab = useCallback((tab: AppTab) => {
    if (tab === 'library') {
      setBooksDeepLink(null);
      setBooksViewLevel('shelf');
      setIsBooksOpen(true);
      return;
    }
    if (tab === activeTab) return;
    setActiveTab(tab);
    setNavigationHistory(prev => [...prev, tab]);
    try {
      window.history.pushState({ tab, timestamp: Date.now() }, '');
    } catch {}
  }, [activeTab]);

  const handleGoBack = useCallback((fromHardware = false) => {
    const nestedBack = new CustomEvent('hooshyar:back', { cancelable: true });
    if (!window.dispatchEvent(nestedBack)) {
      if (fromHardware && window.history.state?.modal) {
        suppressNextPopRef.current = true;
        window.history.back();
      }
      return;
    }
    if (isWelcomeOpen) {
      setIsWelcomeOpen(false);
      setHasSeenWelcome(true);
      return;
    }
    if (isGlobalSearchOpen) {
      setIsGlobalSearchOpen(false);
      return;
    }
    if (isQuickAddOpen) {
      setIsQuickAddOpen(false);
      return;
    }
    if (isGoToOpen) {
      setIsGoToOpen(false);
      return;
    }
    if (isOccasionSearchOpen) {
      setIsOccasionSearchOpen(false);
      return;
    }
    if (isQiblaOpen) {
      setIsQiblaOpen(false);
      return;
    }
    if (isBooksOpen) {
      if (booksViewLevel === 'reader') {
        setBooksViewLevel('catalog');
      } else if (booksViewLevel === 'catalog') {
        setBooksViewLevel('shelf');
      } else {
        setIsBooksOpen(false);
      }
      return;
    }
    if (isAgeCalcOpen) {
      setIsAgeCalcOpen(false);
      return;
    }
    if (isDailyCardOpen) {
      setIsDailyCardOpen(false);
      return;
    }
    if (isAzanOpen) {
      setIsAzanOpen(false);
      return;
    }

    if (navigationHistory.length > 1) {
      if (fromHardware && window.history.state?.tab) {
        window.history.back();
        return;
      }
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const prevTab = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setActiveTab(prevTab);
    } else if (activeTab !== 'home') {
      setActiveTab('home');
      setNavigationHistory(['home']);
    } else {
      // Double tap to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        if (isCapacitorNative()) {
          CapacitorApp.exitApp();
        }
      } else {
        lastBackPressRef.current = now;
        setExitToastVisible(true);
        setTimeout(() => setExitToastVisible(false), 2000);
      }
    }
  }, [
    isWelcomeOpen, 
    isGlobalSearchOpen, 
    isQuickAddOpen, 
    isGoToOpen, 
    isOccasionSearchOpen, 
    isQiblaOpen, 
    isBooksOpen, 
    booksViewLevel,
    isAgeCalcOpen, 
    isDailyCardOpen, 
    isAzanOpen, 
    navigationHistory, 
    activeTab
  ]);

  const handleGoBackRef = useRef(handleGoBack);
  useEffect(() => {
    handleGoBackRef.current = handleGoBack;
  }, [handleGoBack]);

  useEffect(() => {
    const handlePopState = () => {
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false;
        return;
      }
      handleGoBackRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Android Capacitor App Back Button Event
  useEffect(() => {
    let backListener: PluginListenerHandle | undefined;
    let isDisposed = false;
    if (isCapacitorNative()) {
      CapacitorApp.addListener('backButton', () => {
        handleGoBackRef.current(true);
      }).then(l => {
        if (isDisposed) {
          l.remove();
        } else {
          backListener = l;
        }
      });
    }

    return () => {
      isDisposed = true;
      if (backListener && backListener.remove) {
        backListener.remove();
      }
    };
  }, []);

  // Android Capacitor App State Change (Resume/Foreground) Event
  // Refreshes date rollover and top-up schedules native Azan alarms when resuming from background
  useEffect(() => {
    let stateListener: PluginListenerHandle | undefined;
    let isDisposed = false;
    if (isCapacitorNative()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          refreshDate();
          azanScheduler.scheduleNativeAlarms(settingsRef.current, todayInfoRef.current, false);
          syncAllUserReminders(userRemindersRef.current);
        }
      }).then(l => {
        if (isDisposed) {
          l.remove();
        } else {
          stateListener = l;
        }
      });
    }

    return () => {
      isDisposed = true;
      if (stateListener && stateListener.remove) {
        stateListener.remove();
      }
    };
  }, [refreshDate]);

  // User Actions Handlers
  const handleUpdateSettings = useCallback((newSettings: Partial<CalendarSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleResetAllData = useCallback(async () => {
    await Promise.all([
      cancelAllNativeAzanAlarms(),
      stopNativeAzanPlayback(),
      syncAllUserReminders([])
    ]);
    resetAllStorageData();
    setSettings({ ...DEFAULT_SETTINGS, autoAzanEnabled: false });
    setUserNotes([]);
    setUserTasks([]);
    setUserReminders([]);
    setExpenses([]);
    setDebts([]);
  }, []);

  // Restore imported backup data reactively
  const handleRestoreData = useCallback((restored: {
    settings?: CalendarSettings;
    notes?: UserNote[];
    tasks?: UserTask[];
    reminders?: UserReminder[];
    expenses?: ExpenseItem[];
    debts?: DebtItem[];
  }) => {
    if (restored.settings) setSettings(restored.settings);
    if (restored.notes) setUserNotes(restored.notes);
    if (restored.tasks) setUserTasks(restored.tasks);
    if (restored.reminders) setUserReminders(restored.reminders);
    if (restored.expenses) setExpenses(restored.expenses);
    if (restored.debts) setDebts(restored.debts);
  }, []);

  // Notes Handlers
  const handleAddNote = useCallback((noteOrDateKey: Omit<UserNote, 'id' | 'createdAt'> | string, title?: string, content?: string) => {
    let newNote: UserNote;
    const defaultDateKey = makeDateKey(todayJalali.jy, todayJalali.jm, todayJalali.jd);

    if (typeof noteOrDateKey === 'object' && noteOrDateKey !== null) {
      newNote = {
        ...noteOrDateKey,
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        dateKey: normalizeDateKey(noteOrDateKey.dateKey || defaultDateKey),
        createdAt: Date.now()
      };
    } else {
      const dKey = normalizeDateKey(typeof noteOrDateKey === 'string' ? noteOrDateKey : defaultDateKey) || defaultDateKey;
      newNote = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        dateKey: dKey,
        title: (title || '').trim() || 'یادداشت جدید',
        content: (content || '').trim(),
        createdAt: Date.now()
      };
    }
    setUserNotes(prev => [newNote, ...prev]);
  }, [todayJalali]);

  const handleDeleteNote = useCallback((id: string) => {
    setUserNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // Tasks Handlers
  const handleAddTask = useCallback((taskOrDateKey: Omit<UserTask, 'id' | 'createdAt'> | string, text?: string, priority?: 'low' | 'medium' | 'high') => {
    let newTask: UserTask;
    const defaultDateKey = makeDateKey(todayJalali.jy, todayJalali.jm, todayJalali.jd);

    if (typeof taskOrDateKey === 'object' && taskOrDateKey !== null) {
      newTask = {
        ...taskOrDateKey,
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        dateKey: normalizeDateKey(taskOrDateKey.dateKey || defaultDateKey),
        text: (taskOrDateKey.text || '').trim(),
        completed: Boolean(taskOrDateKey.completed),
        priority: taskOrDateKey.priority || 'medium',
        createdAt: Date.now()
      };
    } else {
      const dKey = normalizeDateKey(typeof taskOrDateKey === 'string' && taskOrDateKey ? taskOrDateKey : defaultDateKey);
      newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        dateKey: dKey,
        text: (text || '').trim(),
        completed: false,
        priority: priority || 'medium',
        createdAt: Date.now()
      };
    }

    if (newTask.text) {
      setUserTasks(prev => [newTask, ...prev]);
    }
  }, [todayJalali]);

  const handleToggleTask = useCallback((id: string) => {
    setUserTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setUserTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // Reminders Handlers
  const handleAddReminder = useCallback((rem: Omit<UserReminder, 'id'>) => {
    const newReminder: UserReminder = {
      ...rem,
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      isEnabled: rem.isEnabled ?? rem.enabled ?? true,
      enabled: rem.enabled ?? rem.isEnabled ?? true,
    };
    setUserReminders(prev => [newReminder, ...prev]);
  }, []);

  const handleToggleReminder = useCallback((id: string) => {
    setUserReminders(prev => prev.map(r => {
      if (r.id === id) {
        const nextState = !(r.isEnabled ?? r.enabled ?? true);
        return { ...r, isEnabled: nextState, enabled: nextState };
      }
      return r;
    }));
  }, []);

  const handleDeleteReminder = useCallback((id: string) => {
    setUserReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  // Expenses & Debts Handlers
  const handleAddExpense = useCallback((exp: Omit<ExpenseItem, 'id'>) => {
    const newExp: ExpenseItem = {
      ...exp,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
    };
    setExpenses(prev => [newExp, ...prev]);
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleAddDebt = useCallback((debt: Omit<DebtItem, 'id' | 'createdAt' | 'settledAmount' | 'isSettled'>) => {
    const newDebt: DebtItem = {
      ...debt,
      id: 'debt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now(),
      settledAmount: 0,
      isSettled: false,
      payments: []
    };
    setDebts(prev => [newDebt, ...prev]);
  }, []);

  const handleUpdateDebt = useCallback((debtOrId: DebtItem | string, updates?: Partial<DebtItem>) => {
    if (typeof debtOrId === 'string') {
      const id = debtOrId;
      setDebts(prev => prev.map(d => d.id === id ? { ...d, ...(updates || {}) } : d));
    } else {
      const updatedDebt = debtOrId;
      setDebts(prev => prev.map(d => d.id === updatedDebt.id ? updatedDebt : d));
    }
  }, []);

  const handleDeleteDebt = useCallback((id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleAddPayment = useCallback((debtId: string, payment: Omit<DebtPayment, 'id' | 'createdAt'>, syncToExpenses = false) => {
    const newPayment: DebtPayment = {
      ...payment,
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now()
    };

    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const updatedPayments = [...(d.payments || []), newPayment];
      const rawSettled = (d.settledAmount || 0) + payment.amount;
      const newSettledAmount = Math.min(d.amount, Math.round(rawSettled * 100) / 100);
      const isSettled = newSettledAmount >= d.amount;
      return {
        ...d,
        settledAmount: newSettledAmount,
        isSettled,
        payments: updatedPayments
      };
    }));

    if (syncToExpenses) {
      const targetDebt = debts.find(d => d.id === debtId);
      if (targetDebt) {
        handleAddExpense({
          dateKey: payment.dateKey,
          amount: payment.amount,
          type: targetDebt.type === 'debt' ? 'expense' : 'income',
          category: 'تسویه حساب و قرض',
          description: `${targetDebt.type === 'debt' ? 'پرداخت بدهی به' : 'وصول طلب از'} ${targetDebt.personName}`,
          sourceDebtId: debtId,
          sourcePaymentId: newPayment.id
        });
      }
    }
  }, [debts, handleAddExpense]);

  const handleDeletePayment = useCallback((debtId: string, paymentId: string) => {
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId || !d.payments) return d;
      const p = d.payments.find(x => x.id === paymentId);
      const reducedAmount = p ? p.amount : 0;
      const filtered = d.payments.filter(x => x.id !== paymentId);
      const rawSettled = Math.max(0, (d.settledAmount || 0) - reducedAmount);
      const newSettled = Math.min(d.amount, Math.round(rawSettled * 100) / 100);
      return {
        ...d,
        settledAmount: newSettled,
        isSettled: newSettled >= d.amount,
        payments: filtered
      };
    }));
    setExpenses(prev => prev.filter(expense => !(
      expense.sourceDebtId === debtId &&
      expense.sourcePaymentId === paymentId
    )));
  }, []);

  // Open Quick Add with specific type
  const handleOpenQuickAddWithType = (type: 'task' | 'note' | 'reminder' | 'expense' | 'debt' = 'task') => {
    setQuickAddInitialType(type);
    setIsQuickAddOpen(true);
  };

  // Converter navigation from Calendar
  const handleNavigateToConverterWithDate = useCallback((dateInfo: FullDateInfo) => {
    setConverterInitialDate(dateInfo.jalali);
    handleNavigateTab('converter');
  }, [handleNavigateTab]);

  const handleSelectDateFromHome = useCallback((year: number, month: number, day?: number, openDetail: boolean = true) => {
    setCalendarYear(year);
    setCalendarMonth(month);
    if (day !== undefined) {
      setCalendarSelectedDay(day);
      setAutoOpenCalendarDayDetail(openDetail);
    }
    handleNavigateTab('calendar');
  }, [handleNavigateTab]);

  const currentThemeConfig = THEME_PRESETS[settings.colorTheme || 'persianRose'] || THEME_PRESETS.persianRose;
  const currentFontClass = `font-${settings.fontFamily || 'vazir'}`;
  const selectedCity = IRANIAN_CITIES.find(c => c.id === settings.selectedCityId) || IRANIAN_CITIES[0];

  return (
    <div 
      id="app-root-container" 
      className={`min-h-screen ${currentThemeConfig.appBg} ${currentThemeConfig.appText} ${currentFontClass} flex flex-col antialiased selection:bg-[#123C35] selection:text-white relative`}
      dir="rtl"
    >
      {/* 1. Splash Screen if active */}
      {showSplash && (
        <SplashScreen 
          onComplete={() => setShowSplash(false)}
          todayInfo={todayInfo}
        />
      )}

      {/* 2. Top Azan Live Alert Banner */}
      <AzanTopBanner 
        onOpenAzanModal={() => setIsAzanOpen(true)}
      />

      {/* 3. Main Navigation Bar (5 Primary Tabs) */}
      <Navbar
        activeTab={activeTab}
        isBooksOpen={isBooksOpen}
        onSelectTab={handleNavigateTab}
        canGoBack={navigationHistory.length > 1}
        onGoBack={handleGoBack}
        todayInfo={todayInfo}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        onOpenGoToDate={() => setIsGoToOpen(true)}
        onOpenQuickAdd={() => handleOpenQuickAddWithType('task')}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
      />

      {/* 4. Tab Views Container */}
      <main id="app-main-content-view" className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-28">
        {(activeTab === 'home' || activeTab === 'library') && (
          <HomeView
            todayInfo={todayInfo}
            onNavigateTab={handleNavigateTab}
            onSelectDate={handleSelectDateFromHome}
            selectedCityId={settings.selectedCityId}
            onCityChange={(cityId) => handleUpdateSettings({ selectedCityId: cityId })}
            hijriAdjustment={settings.hijriAdjustment}
            userTasks={userTasks}
            userNotes={userNotes}
            userReminders={userReminders}
            expenses={expenses}
            debts={debts}
            onToggleTask={handleToggleTask}
            onOpenSearch={() => setIsGlobalSearchOpen(true)}
            onOpenGoToDate={() => setIsGoToOpen(true)}
            onOpenConverter={() => handleNavigateTab('converter')}
            onOpenQuickAdd={handleOpenQuickAddWithType}
            onOpenAzan={() => setIsAzanOpen(true)}
            onOpenQibla={() => setIsQiblaOpen(true)}
            onOpenBooks={() => setIsBooksOpen(true)}
            onOpenAgeCalc={() => setIsAgeCalcOpen(true)}
            onOpenDailyCard={() => setIsDailyCardOpen(true)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            currentYear={calendarYear}
            currentMonth={calendarMonth}
            selectedDay={calendarSelectedDay}
            autoOpenDayDetail={autoOpenCalendarDayDetail}
            onAutoOpenHandled={() => setAutoOpenCalendarDayDetail(false)}
            onMonthChange={(m) => {
              setCalendarMonth(m);
              setAutoOpenCalendarDayDetail(false);
            }}
            onYearChange={(y) => {
              setCalendarYear(y);
              setAutoOpenCalendarDayDetail(false);
            }}
            onGoToToday={() => {
              setCalendarYear(todayJalali.jy);
              setCalendarMonth(todayJalali.jm);
              setCalendarSelectedDay(todayJalali.jd);
              setAutoOpenCalendarDayDetail(false);
            }}
            selectedCityId={settings.selectedCityId}
            hijriAdjustment={settings.hijriAdjustment}
            showHijriInCells={settings.showHijriInCells !== false}
            showGregorianInCells={settings.showGregorianInCells !== false}
            userNotes={userNotes}
            userTasks={userTasks}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onNavigateToConverterWithDate={handleNavigateToConverterWithDate}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={userTasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceView
            expenses={expenses}
            debts={debts}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt as any}
            onDeleteDebt={handleDeleteDebt}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
          />
        )}

        {activeTab === 'more' && (
          <MoreView
            onNavigateTab={handleNavigateTab}
            onOpenAzanModal={() => setIsAzanOpen(true)}
            onOpenQiblaModal={() => setIsQiblaOpen(true)}
            onOpenBooksModal={() => {
              setBooksDeepLink(null);
              setBooksViewLevel('shelf');
              setIsBooksOpen(true);
            }}
            onOpenAgeCalcModal={() => setIsAgeCalcOpen(true)}
            onOpenDailyCardModal={() => setIsDailyCardOpen(true)}
            onOpenSearchModal={() => setIsGlobalSearchOpen(true)}
            onOpenWelcomeModal={() => setIsWelcomeOpen(true)}
            todayInfo={todayInfo}
            selectedCityName={selectedCity.name}
          />
        )}

        {activeTab === 'converter' && (
          <DateConverterView
            initialDate={converterInitialDate}
            hijriAdjustment={settings.hijriAdjustment}
            onNavigateToCalendar={(y, m) => {
              setCalendarYear(y);
              setCalendarMonth(m);
              handleNavigateTab('calendar');
            }}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView
            notes={userNotes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersView
            reminders={userReminders}
            onAddReminder={handleAddReminder}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={handleDeleteReminder}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetAllData={handleResetAllData}
            onRestoreData={handleRestoreData}
            onOpenWelcome={() => setIsWelcomeOpen(true)}
          />
        )}
      </main>

      {/* 5. Welcome Presentation Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => {
          setIsWelcomeOpen(false);
          setHasSeenWelcome(true);
          requestNotificationPermission().catch(() => {});
        }}
        themeConfig={currentThemeConfig}
        isRelaunch={getHasSeenWelcome()}
      />

      {/* 6. Global Unified Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        userTasks={userTasks}
        userNotes={userNotes}
        userReminders={userReminders}
        expenses={expenses}
        debts={debts}
        onNavigateTab={handleNavigateTab}
        onOpenBooksModal={(target) => {
          setBooksDeepLink(target ?? null);
          setBooksViewLevel(
            target?.categoryId === 'quran' && target.surahNumber
              ? 'reader'
              : target
                ? 'catalog'
                : 'shelf'
          );
          setIsBooksOpen(true);
        }}
        onSelectDate={(y, m, d) => handleSelectDateFromHome(y, m, d, true)}
        currentYear={calendarYear}
        hijriAdjustment={settings.hijriAdjustment}
      />

      {/* 7. Global Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        initialType={quickAddInitialType}
        onClose={() => setIsQuickAddOpen(false)}
        onAddTask={handleAddTask}
        onAddNote={handleAddNote}
        onAddReminder={handleAddReminder}
        onAddExpense={handleAddExpense}
        onAddDebt={handleAddDebt}
      />

      {/* 8. Qibla & Compass Modal */}
      <QiblaModal
        isOpen={isQiblaOpen}
        onClose={() => setIsQiblaOpen(false)}
        selectedCityId={settings.selectedCityId}
        onCityChange={(cityId) => handleUpdateSettings({ selectedCityId: cityId })}
      />

      {/* 9. Shia Books & Quran Modal */}
      {isBooksOpen && (
        <React.Suspense fallback={null}>
          <ShiaBooksModal
            isOpen
            onClose={() => {
              setIsBooksOpen(false);
              setBooksViewLevel('shelf');
              setBooksDeepLink(null);
            }}
            currentLevel={booksViewLevel}
            onLevelChange={setBooksViewLevel}
            initialCategoryId={booksDeepLink?.categoryId}
            initialSurahNumber={
              booksDeepLink?.categoryId === 'quran'
                ? booksDeepLink.surahNumber
                : undefined
            }
          />
        </React.Suspense>
      )}

      {/* 10. Age Calculator Modal */}
      <AgeCalculatorModal
        isOpen={isAgeCalcOpen}
        onClose={() => setIsAgeCalcOpen(false)}
      />

      {/* 12. Daily Shareable Card Modal */}
      <DailyCardModal
        isOpen={isDailyCardOpen}
        onClose={() => setIsDailyCardOpen(false)}
        todayInfo={todayInfo}
        selectedCityId={settings.selectedCityId}
      />

      {/* 13. Azan & Prayer Times Modal */}
      <AzanModal
        isOpen={isAzanOpen}
        onClose={() => setIsAzanOpen(false)}
        todayInfo={todayInfo}
        selectedCityId={settings.selectedCityId}
        onCityChange={(cityId) => handleUpdateSettings({ selectedCityId: cityId })}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* 14. Occasion Search Modal */}
      {isOccasionSearchOpen && (
        <OccasionSearchModal
          isOpen={isOccasionSearchOpen}
          onClose={() => setIsOccasionSearchOpen(false)}
          onSelectOccasionDate={(y, m, d) => {
            setIsOccasionSearchOpen(false);
            handleSelectDateFromHome(y, m, d, true);
          }}
          onSelectOccasion={(occ) => {
            setIsOccasionSearchOpen(false);
            if (occ.calendarType === 'solar') {
              handleSelectDateFromHome(todayJalali.jy, occ.month, occ.day, true);
            }
          }}
          hijriAdjustment={settings.hijriAdjustment}
        />
      )}

      {/* 15. Global Go to Date Modal */}
      {isGoToOpen && (
        <GoToDateModal
          isOpen={isGoToOpen}
          onClose={() => setIsGoToOpen(false)}
          currentYear={calendarYear}
          currentMonth={calendarMonth}
          onSelectDate={(y, m, d) => {
            setIsGoToOpen(false);
            handleSelectDateFromHome(y, m, d, true);
          }}
          onSelect={(y, m, d) => {
            setIsGoToOpen(false);
            handleSelectDateFromHome(y, m, d, true);
          }}
        />
      )}

      {/* 16. Android Double Back Toast Notification */}
      {exitToastVisible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#0C2E29]/95 backdrop-blur-md text-white text-xs font-bold rounded-2xl shadow-xl border border-white/10 animate-fade-in text-center">
          برای خروج دوباره دکمه بازگشت را بزنید
        </div>
      )}
    </div>
  );
}

export default App;
