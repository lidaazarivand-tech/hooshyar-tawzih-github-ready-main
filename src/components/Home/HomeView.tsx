import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sun, 
  Moon, 
  Sparkles, 
  Clock, 
  ArrowLeftRight, 
  Search, 
  Compass, 
  CheckSquare, 
  ArrowLeft, 
  BellRing,
  BookOpen,
  Plus,
  CreditCard,
  FileText,
  Bell,
  ArrowUpRight,
  TrendingDown,
  Navigation,
  ChevronLeft
} from 'lucide-react';
import { FullDateInfo, UserTask, UserNote, UserReminder, ExpenseItem, DebtItem, AppTab } from '../../types/calendar';
import { 
  toPersianDigits, 
  PERSIAN_MONTH_NAMES, 
  GREGORIAN_MONTH_NAMES, 
  HIJRI_MONTH_NAMES, 
  PERSIAN_WEEK_DAYS, 
  makeDateKey,
  isSameDateKey,
  normalizeDateKey
} from '../../utils/persianNumber';
import { 
  getJalaliMonthLength, 
  getMonthFirstDayOfWeek, 
  addDaysToJalali,
  getTodayJalali
} from '../../utils/jalali';
import { getFullDateInfo } from '../../utils/dateInfo';
import { calculatePrayerTimes, IRANIAN_CITIES, PrayerTimes, getNextPrayerInfo } from '../../utils/prayerTimes';

interface HomeViewProps {
  todayInfo: FullDateInfo;
  onNavigateTab: (tab: AppTab) => void;
  onSelectDate: (year: number, month: number, day: number) => void;
  selectedCityId: string;
  onCityChange?: (cityId: string) => void;
  hijriAdjustment: number;
  userTasks: UserTask[];
  userNotes: UserNote[];
  userReminders?: UserReminder[];
  expenses?: ExpenseItem[];
  debts?: DebtItem[];
  onToggleTask?: (id: string) => void;
  onOpenSearch: () => void;
  onOpenGoToDate: () => void;
  onOpenConverter: () => void;
  onOpenQuickAdd?: (type?: 'task' | 'note' | 'reminder' | 'expense' | 'debt') => void;
  onOpenAzan?: () => void;
  onOpenQibla?: () => void;
  onOpenBooks?: () => void;
  onOpenAgeCalc?: () => void;
  onOpenDailyCard?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  todayInfo,
  onNavigateTab,
  onSelectDate,
  selectedCityId,
  onCityChange,
  hijriAdjustment,
  userTasks,
  userNotes,
  userReminders = [],
  expenses = [],
  debts = [],
  onToggleTask = (_id: string) => {},
  onOpenSearch,
  onOpenGoToDate,
  onOpenConverter,
  onOpenQuickAdd = (_type?: 'task' | 'note' | 'reminder' | 'expense' | 'debt') => {},
  onOpenAzan,
  onOpenQibla,
  onOpenBooks: _onOpenBooks,
  onOpenAgeCalc: _onOpenAgeCalc,
  onOpenDailyCard: _onOpenDailyCard
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('روز بخیر');

  // Live time & dynamic greeting
  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      setTimeStr(toPersianDigits(`${h.toString().padStart(2, '0')}:${m}:${s}`));

      if (h >= 5 && h < 11) {
        setGreeting('صبح بخیر ☀️');
      } else if (h >= 11 && h < 16) {
        setGreeting('ظهر بخیر 🌿');
      } else if (h >= 16 && h < 20) {
        setGreeting('عصر بخیر 🌇');
      } else {
        setGreeting('شب بخیر 🌙');
      }
    };

    updateTimeAndGreeting();
    const interval = setInterval(updateTimeAndGreeting, 1000);
    return () => clearInterval(interval);
  }, []);

  const city = IRANIAN_CITIES.find(c => c.id === selectedCityId) || IRANIAN_CITIES[0];
  const cityGregorian = useMemo(() => {
    const now = new Date();
    const cityOffsetMillis = Math.round(city.timezone * 3600000);
    const cityNow = new Date(now.getTime() + cityOffsetMillis);
    return {
      gy: cityNow.getUTCFullYear(),
      gm: cityNow.getUTCMonth() + 1,
      gd: cityNow.getUTCDate()
    };
  }, [city.timezone, timeStr]);
  const prayers = calculatePrayerTimes(cityGregorian, city);

  // Next prayer computation using city timezone
  const nextPrayerInfo = useMemo(() => {
    const info = getNextPrayerInfo(prayers, new Date(), city.timezone);
    return {
      name: info.name,
      time: toPersianDigits(info.timeStr),
      countdown: info.countdown || (
        Math.floor(info.minutesRemaining / 60) > 0
          ? `${toPersianDigits(Math.floor(info.minutesRemaining / 60))} ساعت و ${toPersianDigits(info.minutesRemaining % 60)} دقیقه دیگر`
          : `${toPersianDigits(info.minutesRemaining)} دقیقه دیگر`
      ),
      rawTime: info.timeStr
    };
  }, [prayers, city.timezone, timeStr]);

  // Today Tasks and Reminders
  const todayKey = makeDateKey(todayInfo.jalali.jy, todayInfo.jalali.jm, todayInfo.jalali.jd);
  const todayTasks = userTasks.filter(t => isSameDateKey(t.dateKey, todayKey));
  const todayReminders = userReminders.filter(r => isSameDateKey(r.dateKey, todayKey));

  // Financial summary
  const todayExpenses = expenses.filter(e => e.dateKey === todayKey && e.type === 'expense');
  const todayExpenseTotal = todayExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const thisMonthExpenses = expenses.filter(e => {
    const normalizedDateKey = normalizeDateKey(e.dateKey);
    const [year, month] = normalizedDateKey.split('-').map(Number);
    return year === todayInfo.jalali.jy && month === todayInfo.jalali.jm && e.type === 'expense';
  });
  const monthExpenseTotal = thisMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Upcoming holidays in 45 days
  const upcomingHolidays = useMemo(() => {
    const list: { dateInfo: FullDateInfo; daysLeft: number }[] = [];
    for (let i = 1; i <= 45; i++) {
      const nextDate = addDaysToJalali(todayInfo.jalali, i);
      const info = getFullDateInfo(nextDate.jy, nextDate.jm, nextDate.jd, hijriAdjustment);
      const officialHolidays = info.occasions.filter(o => o.isHoliday);
      if (officialHolidays.length > 0) {
        list.push({ dateInfo: info, daysLeft: i });
      }
    }
    return list;
  }, [todayInfo.jalali, hijriAdjustment]);

  return (
    <div id="home-main-dashboard" className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* 1. Header: Greeting & Jalali Display */}
      <div 
        id="hero-header-card"
        className="bg-gradient-to-br from-[#0C2E29] via-[#123C35] to-[#1B5E52] text-white rounded-3xl p-6 sm:p-8 border border-[#0C2E29] relative overflow-hidden shadow-[0_12px_32px_-6px_rgba(18,60,53,0.28),0_4px_12px_-2px_rgba(18,60,53,0.12),inset_0_1px_0_rgba(255,255,255,0.22)]"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C49A5A]/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#1B5E52]/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-2 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[#C49A5A] animate-pulse"></span>
                <span>{greeting}</span>
              </span>

              {todayInfo.isHoliday ? (
                <span className="px-3.5 py-1.5 rounded-full bg-rose-600/95 text-white text-xs font-bold shadow-[0_2px_6px_rgba(225,29,72,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center gap-1 border border-rose-700">
                  <span>🔴 تعطیل رسمی</span>
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full bg-[#1B5E52]/60 text-[#E9E5DA] text-xs font-medium border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  🟢 روز کاری
                </span>
              )}

              <span className="text-xs text-[#E9E5DA] font-medium bg-black/25 px-3 py-1.5 rounded-full border border-white/10 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                {timeStr}
              </span>
            </div>

            {/* Jalali Large Title */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
                {todayInfo.dayOfWeekName}، {toPersianDigits(todayInfo.jalali.jd)} {PERSIAN_MONTH_NAMES[todayInfo.jalali.jm - 1]} {toPersianDigits(todayInfo.jalali.jy)}
              </h2>
              <p className="text-xs sm:text-sm text-[#E9E5DA] mt-2 flex items-center gap-2 font-medium flex-wrap">
                <span>معادل: {toPersianDigits(todayInfo.hijri.hd)} {HIJRI_MONTH_NAMES[todayInfo.hijri.hm - 1]} {toPersianDigits(todayInfo.hijri.hy)} قمری</span>
                <span>•</span>
                <span>{todayInfo.gregorian.gd} {GREGORIAN_MONTH_NAMES[todayInfo.gregorian.gm - 1]} {todayInfo.gregorian.gy}</span>
              </p>
            </div>
          </div>

          {/* Quick Hub Trigger */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('calendar')}
              className="px-4 py-3 rounded-2xl bg-gradient-to-b from-[#D4AA6A] to-[#C49A5A] hover:from-[#C49A5A] hover:to-[#B08644] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(196,154,90,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#B08644] cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4 text-white" />
              <span>مشاهده تقویم ماه</span>
            </button>
            <button
              onClick={onOpenConverter}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#E9E5DA]" />
              <span>تبدیل تاریخ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Hero Next Prayer & Azan Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-[0_6px_20px_-3px_rgba(18,60,53,0.08),0_2px_6px_-1px_rgba(18,60,53,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DED9]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#1B5E52] to-[#123C35] text-[#C49A5A] flex items-center justify-center shadow-[0_3px_8px_rgba(18,60,53,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#0C2E29]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">اوقات شرعی به افق:</span>
                <span className="text-xs font-black text-[#123C35] bg-[#E9E5DA] px-2.5 py-0.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                  {city.name}
                </span>
                <button
                  onClick={() => onNavigateTab('settings')}
                  className="text-[11px] text-[#C49A5A] hover:underline font-bold cursor-pointer"
                >
                  (تغییر شهر)
                </button>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <span>رویداد بعدی: {nextPrayerInfo.name}</span>
                <span className="text-sm font-mono text-[#123C35]">({nextPrayerInfo.time})</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
                  {nextPrayerInfo.countdown}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAzan?.()}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-b from-[#1B5E52] to-[#123C35] hover:from-[#123C35] hover:to-[#0C2E29] text-white text-xs font-bold shadow-[0_2px_6px_rgba(18,60,53,0.22),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#0C2E29] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Clock className="w-4 h-4 text-[#C49A5A]" />
              <span>پخش اذان و جدول</span>
            </button>

            <button
              onClick={() => onOpenQibla?.()}
              className="px-3.5 py-2.5 rounded-xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-800 border border-[#D9DED9] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <Compass className="w-4 h-4 text-[#123C35]" />
              <span>قبله‌نما</span>
            </button>
          </div>
        </div>

        {/* Prayer times pills row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center text-xs">
          <div className="bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-all p-3 rounded-2xl border border-[#D9DED9] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-[11px] text-slate-500 font-semibold">اذان صبح</span>
            <div className="font-bold text-[#123C35] mt-1 text-sm sm:text-base font-mono">{toPersianDigits(prayers.fajr)}</div>
          </div>
          <div className="bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-all p-3 rounded-2xl border border-[#D9DED9] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-[11px] text-slate-500 font-semibold">طلوع آفتاب</span>
            <div className="font-bold text-slate-800 mt-1 text-sm sm:text-base font-mono">{toPersianDigits(prayers.sunrise)}</div>
          </div>
          <div className="bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-all p-3 rounded-2xl border border-[#D9DED9] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-[11px] text-slate-500 font-semibold">اذان ظهر</span>
            <div className="font-bold text-[#123C35] mt-1 text-sm sm:text-base font-mono">{toPersianDigits(prayers.dhuhr)}</div>
          </div>
          <div className="bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-all p-3 rounded-2xl border border-[#D9DED9] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-[11px] text-slate-500 font-semibold">غروب آفتاب</span>
            <div className="font-bold text-slate-800 mt-1 text-sm sm:text-base font-mono">{toPersianDigits(prayers.sunset)}</div>
          </div>
          <div className="bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-all p-3 rounded-2xl border border-[#D9DED9] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-[11px] text-slate-500 font-semibold">اذان مغرب</span>
            <div className="font-bold text-[#123C35] mt-1 text-sm sm:text-base font-mono">{toPersianDigits(prayers.maghrib)}</div>
          </div>
          <div className="bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-all p-3 rounded-2xl border border-[#D9DED9] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-[11px] text-slate-500 font-semibold">نیمه‌شب</span>
            <div className="font-bold text-slate-800 mt-1 text-sm sm:text-base font-mono">{toPersianDigits(prayers.midnight)}</div>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Grid (4 Fast Entry Buttons) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onOpenQuickAdd('task')}
          className="p-3.5 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all flex items-center gap-3 text-right cursor-pointer shadow-[0_2px_8px_-1px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs border border-emerald-100">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">＋ کار جدید</span>
            <span className="text-[10px] text-slate-500">ثبت وظیفه روزانه</span>
          </div>
        </button>

        <button
          onClick={() => onOpenQuickAdd('note')}
          className="p-3.5 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all flex items-center gap-3 text-right cursor-pointer shadow-[0_2px_8px_-1px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs border border-amber-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">＋ یادداشت</span>
            <span className="text-[10px] text-slate-500">ثبت نکات و خاطره</span>
          </div>
        </button>

        <button
          onClick={() => onOpenQuickAdd('reminder')}
          className="p-3.5 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all flex items-center gap-3 text-right cursor-pointer shadow-[0_2px_8px_-1px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs border border-blue-100">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">＋ یادآور</span>
            <span className="text-[10px] text-slate-500">تولد، چک و موعد</span>
          </div>
        </button>

        <button
          onClick={() => onOpenQuickAdd('expense')}
          className="p-3.5 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all flex items-center gap-3 text-right cursor-pointer shadow-[0_2px_8px_-1px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs border border-rose-100">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">＋ هزینه</span>
            <span className="text-[10px] text-slate-500">ثبت مخارج امروز</span>
          </div>
        </button>
      </div>

      {/* 4. Section «امروز» (Today's Hub): Tasks, Reminders & Occasions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tasks & Reminders */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today Tasks Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">برنامه‌ها و کارهای امروز</h3>
                  <p className="text-[11px] text-slate-500">{toPersianDigits(todayTasks.length)} مورد ثبت شده</p>
                </div>
              </div>

              <button
                onClick={() => onOpenQuickAdd('task')}
                className="text-xs text-[#123C35] hover:text-[#0C2E29] font-bold flex items-center gap-1 cursor-pointer bg-[#F7F4EC] hover:bg-[#E9E5DA] px-3 py-1.5 rounded-xl border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن کار</span>
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F7F4EC] border border-dashed border-[#D9DED9] text-center space-y-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <p className="text-xs text-slate-600 font-medium">هیچ برنامه‌ای برای امروز ثبت نشده است.</p>
                <button
                  onClick={() => onOpenQuickAdd('task')}
                  className="text-xs font-bold text-[#123C35] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت اولین وظیفه امروز</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      task.completed 
                        ? 'bg-slate-50 border-slate-200 opacity-65 shadow-2xs' 
                        : 'bg-[#F7F4EC] border-[#D9DED9] hover:bg-[#E9E5DA] shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.7)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="w-4 h-4 rounded text-[#123C35] focus:ring-[#123C35] cursor-pointer"
                      />
                      <span className={`text-xs ${task.completed ? 'line-through text-slate-400' : 'text-slate-900 font-bold'}`}>
                        {task.text}
                      </span>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shadow-2xs ${
                      task.priority === 'high' ? 'bg-rose-100 text-rose-800' : task.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {task.priority === 'high' ? 'فوری' : task.priority === 'medium' ? 'عادی' : 'پایین'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today Reminders */}
          {todayReminders.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>یادآوری‌های امروز</span>
                </h3>
                <button
                  onClick={() => onNavigateTab('reminders')}
                  className="text-xs text-[#123C35] font-bold hover:underline"
                >
                  همه یادآورها
                </button>
              </div>

              <div className="space-y-2">
                {todayReminders.map(rem => (
                  <div key={rem.id} className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between shadow-[0_1px_3px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div>
                      <div className="text-xs font-bold text-amber-950">{rem.title}</div>
                      {rem.notes && <div className="text-[11px] text-amber-800 mt-0.5">{rem.notes}</div>}
                    </div>
                    {rem.time && (
                      <span className="text-[10px] bg-white px-2 py-1 rounded-lg text-amber-900 font-bold border border-amber-200 font-mono shadow-2xs">
                        ساعت {toPersianDigits(rem.time)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occasions of Today */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C49A5A]" />
                <span>مناسبت‌های امروز</span>
              </h3>
              <button
                onClick={onOpenSearch}
                className="text-xs text-[#123C35] font-bold hover:underline"
              >
                جستجوی مناسبت‌ها
              </button>
            </div>

            {todayInfo.occasions.length === 0 ? (
              <p className="text-xs text-slate-500">برای امروز مناسبت خاصی در تقویم ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {todayInfo.occasions.map(occ => (
                  <div 
                    key={occ.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      occ.isHoliday 
                        ? 'bg-rose-50 border-rose-200 text-rose-950 shadow-[0_1px_3px_rgba(225,29,72,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]' 
                        : 'bg-[#F7F4EC] border-[#D9DED9] text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.7)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{occ.isHoliday ? '🔴' : '•'}</span>
                      <span className="text-xs font-bold">{occ.title}</span>
                    </div>
                    {occ.isHoliday && (
                      <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-bold shadow-2xs">
                        تعطیل رسمی
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Finance Summary & Upcoming Holidays */}
        <div className="lg:col-span-5 space-y-6">
          {/* Finance Snapshot */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#123C35]" />
                <h3 className="text-sm font-bold text-slate-900">خلاصه مالی</h3>
              </div>
              <button
                onClick={() => onNavigateTab('finance')}
                className="text-xs text-[#123C35] font-bold hover:underline"
              >
                مدیریت مالی
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#F7F4EC] rounded-2xl border border-[#D9DED9] text-right shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span className="text-[11px] text-slate-500 block">هزینه امروز</span>
                <span className="text-sm font-bold text-rose-600 block mt-0.5 font-mono">
                  {toPersianDigits(todayExpenseTotal.toLocaleString())} تومان
                </span>
              </div>
              <div className="p-3 bg-[#F7F4EC] rounded-2xl border border-[#D9DED9] text-right shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span className="text-[11px] text-slate-500 block">مجموع این ماه</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5 font-mono">
                  {toPersianDigits(monthExpenseTotal.toLocaleString())} تومان
                </span>
              </div>
            </div>
          </div>

          {/* Upcoming Holidays Snapshot */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">تعطیلات رسمی پیش‌رو</h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {toPersianDigits(upcomingHolidays.length)} مورد
              </span>
            </div>

            <div className="space-y-2">
              {upcomingHolidays.slice(0, 3).map((item, index) => {
                const hol = item.dateInfo.occasions.find(o => o.isHoliday);
                return (
                  <div
                    key={index}
                    onClick={() => {
                      onSelectDate(item.dateInfo.jalali.jy, item.dateInfo.jalali.jm, item.dateInfo.jalali.jd);
                      onNavigateTab('calendar');
                    }}
                    className="p-3 rounded-2xl bg-[#F7F4EC] hover:bg-[#E9E5DA] border border-[#D9DED9] flex items-center justify-between cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.7)]"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{hol?.title || 'تعطیل رسمی'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {toPersianDigits(item.dateInfo.jalali.jd)} {PERSIAN_MONTH_NAMES[item.dateInfo.jalali.jm - 1]} ({item.dateInfo.dayOfWeekName})
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#123C35] bg-white px-2.5 py-1 rounded-xl border border-[#D9DED9] shadow-2xs">
                      {toPersianDigits(item.daysLeft)} روز مانده
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
