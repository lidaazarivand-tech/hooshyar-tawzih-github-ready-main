import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Search, 
  Compass, 
  LayoutGrid, 
  Sparkles, 
  Clock, 
  Moon, 
  Sun,
  Filter,
  Info,
  ChevronDown
} from 'lucide-react';
import { FullDateInfo, UserNote, UserTask } from '../../types/calendar';
import { 
  PERSIAN_MONTH_NAMES, 
  PERSIAN_WEEK_DAYS, 
  toPersianDigits, 
  makeDateKey,
  GREGORIAN_MONTH_NAMES,
  HIJRI_MONTH_NAMES
} from '../../utils/persianNumber';
import { 
  getJalaliMonthLength, 
  getMonthFirstDayOfWeek, 
  isLeapYear, 
  getTodayJalali,
  jalaliToGregorian
} from '../../utils/jalali';
import { jalaliToHijri } from '../../utils/hijri';
import { getFullDateInfo } from '../../utils/dateInfo';
import { DayCell } from './DayCell';
import { DayDetailModal } from './DayDetailModal';
import { GoToDateModal } from './GoToDateModal';
import { OccasionSearchModal } from './OccasionSearchModal';
import { YearOverviewModal } from './YearOverviewModal';

interface CalendarViewProps {
  currentYear: number;
  currentMonth: number;
  selectedDay?: number | null;
  autoOpenDayDetail?: boolean;
  onAutoOpenHandled?: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onGoToToday: () => void;
  selectedCityId: string;
  hijriAdjustment: number;
  showHijriInCells?: boolean;
  showGregorianInCells?: boolean;
  userNotes: UserNote[];
  userTasks: UserTask[];
  onAddNote: (dateKey: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTask: (dateKey: string, text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onNavigateToConverterWithDate: (dateInfo: FullDateInfo) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentYear,
  currentMonth,
  selectedDay,
  autoOpenDayDetail = false,
  onAutoOpenHandled,
  onMonthChange,
  onYearChange,
  onGoToToday,
  selectedCityId,
  hijriAdjustment,
  showHijriInCells = true,
  showGregorianInCells = true,
  userNotes,
  userTasks,
  onAddNote,
  onDeleteNote,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNavigateToConverterWithDate
}) => {
  const [selectedDateInfo, setSelectedDateInfo] = useState<FullDateInfo | null>(null);
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isYearOverviewOpen, setIsYearOverviewOpen] = useState(false);
  const [activeHolidayFilter, setActiveHolidayFilter] = useState<'all' | 'holidays_only'>('all');

  const today = getTodayJalali();
  const isCurrentMonth = today.jy === currentYear && today.jm === currentMonth;
  const isLeap = isLeapYear(currentYear);

  const daysCount = getJalaliMonthLength(currentYear, currentMonth);
  const startDayOfWeek = getMonthFirstDayOfWeek(currentYear, currentMonth);

  // Calculate equivalent Gregorian and Hijri month ranges for subtitle
  const startGreg = jalaliToGregorian(currentYear, currentMonth, 1);
  const endGreg = jalaliToGregorian(currentYear, currentMonth, daysCount);
  const startHijri = jalaliToHijri(currentYear, currentMonth, 1, hijriAdjustment);
  const endHijri = jalaliToHijri(currentYear, currentMonth, daysCount, hijriAdjustment);

  // Precompute full info for all days of the month
  const monthDays: FullDateInfo[] = [];
  for (let d = 1; d <= daysCount; d++) {
    monthDays.push(getFullDateInfo(currentYear, currentMonth, d, hijriAdjustment));
  }

  // Handle auto-selection / auto-opening of requested day (e.g. from search or external jump)
  React.useEffect(() => {
    if (selectedDay && selectedDay >= 1 && selectedDay <= daysCount) {
      const found = monthDays.find(d => d.jalali.jd === selectedDay) || getFullDateInfo(currentYear, currentMonth, selectedDay, hijriAdjustment);
      if (autoOpenDayDetail) {
        setSelectedDateInfo(found);
        onAutoOpenHandled?.();
      }
    }
  }, [selectedDay, autoOpenDayDetail, currentYear, currentMonth, hijriAdjustment, daysCount, onAutoOpenHandled]);

  // Count statistics
  const holidaysCount = monthDays.filter(d => d.isHoliday).length;
  const allOccasions = monthDays.flatMap(d => d.occasions);
  const uniqueOccasionsCount = allOccasions.length;

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onYearChange(currentYear - 1);
      onMonthChange(12);
    } else {
      onMonthChange(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onYearChange(currentYear + 1);
      onMonthChange(1);
    } else {
      onMonthChange(currentMonth + 1);
    }
  };

  // App owns browser/hardware history. Calendar consumes the shared back event first.
  React.useEffect(() => {
    const handleBack = (event: Event) => {
      if (selectedDateInfo) {
        setSelectedDateInfo(null);
        event.preventDefault();
      } else if (isGoToOpen) {
        setIsGoToOpen(false);
        event.preventDefault();
      } else if (isSearchOpen) {
        setIsSearchOpen(false);
        event.preventDefault();
      } else if (isYearOverviewOpen) {
        setIsYearOverviewOpen(false);
        event.preventDefault();
      }
    };

    window.addEventListener('hooshyar:back', handleBack);
    return () => window.removeEventListener('hooshyar:back', handleBack);
  }, [selectedDateInfo, isGoToOpen, isSearchOpen, isYearOverviewOpen]);

  const closeModal = (close: () => void) => {
    if (window.history.state?.modal) window.history.back();
    else close();
  };

  const handleSelectDateFromPicker = (y: number, m: number, d: number) => {
    onYearChange(y);
    onMonthChange(m);
    const dateInfo = getFullDateInfo(y, m, d, hijriAdjustment);
    openDateDetailModal(dateInfo);
  };

  const openDateDetailModal = (dateInfo: FullDateInfo) => {
    setSelectedDateInfo(dateInfo);
    try {
      window.history.pushState({ modal: 'dayDetail', timestamp: Date.now() }, '');
    } catch (e) {}
  };

  const openGoToModal = () => {
    setIsGoToOpen(true);
    try {
      window.history.pushState({ modal: 'goto', timestamp: Date.now() }, '');
    } catch (e) {}
  };

  const openSearchModal = () => {
    setIsSearchOpen(true);
    try {
      window.history.pushState({ modal: 'search', timestamp: Date.now() }, '');
    } catch (e) {}
  };

  const openYearOverviewModal = () => {
    setIsYearOverviewOpen(true);
    try {
      window.history.pushState({ modal: 'yearOverview', timestamp: Date.now() }, '');
    } catch (e) {}
  };

  return (
    <div id="calendar-main-view" className="space-y-6">
      {/* Top Controls Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-4">
        {/* Main Header Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Month & Year Title with Navigation */}
          <div className="flex items-center gap-3">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              title="ماه قبل"
              className="p-2.5 rounded-2xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-700 transition-colors border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {PERSIAN_MONTH_NAMES[currentMonth - 1]} {toPersianDigits(currentYear)}
                </h2>

                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs ${
                  isLeap ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}>
                  {isLeap ? 'سال کبیسه' : 'سال عادی'}
                </span>
              </div>

              {/* Subtitle with equivalent dates */}
              {(showGregorianInCells || showHijriInCells) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium flex-wrap">
                  {showGregorianInCells && (
                    <span className="flex items-center gap-1 font-sans">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      {GREGORIAN_MONTH_NAMES[startGreg.gm - 1]} - {GREGORIAN_MONTH_NAMES[endGreg.gm - 1]} {endGreg.gy}
                    </span>
                  )}
                  {showGregorianInCells && showHijriInCells && (
                    <span className="text-slate-300">•</span>
                  )}
                  {showHijriInCells && (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Moon className="w-3.5 h-3.5 text-emerald-600" />
                      {HIJRI_MONTH_NAMES[startHijri.hm - 1]} - {HIJRI_MONTH_NAMES[endHijri.hm - 1]} {toPersianDigits(endHijri.hy)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              title="ماه بعد"
              className="p-2.5 rounded-2xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-700 transition-colors border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Year Selector & Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
            {/* Year Selector Dropdown */}
            <div className="relative">
              <select
                id="select-calendar-year"
                value={currentYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-800 font-bold text-xs py-2 px-3 rounded-xl border border-[#D9DED9] focus:outline-none focus:ring-2 focus:ring-[#123C35] appearance-none pr-7 pl-3 shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
              >
                {Array.from(
                  new Set([
                    ...Array.from({ length: 45 }, (_, i) => 1390 + i),
                    currentYear
                  ])
                )
                  .sort((a, b) => a - b)
                  .map(y => (
                    <option key={y} value={y}>
                      سال {toPersianDigits(y)} {isLeapYear(y) ? '(کبیسه)' : ''}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Jump to Today Button */}
            <button
              id="btn-jump-today"
              onClick={onGoToToday}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.2)] ${
                isCurrentMonth
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-[#123C35] text-white hover:bg-[#0C2E29]'
              }`}
            >
              امروز
            </button>

            {/* Go to Date Modal Button */}
            <button
              id="btn-open-goto-modal"
              onClick={openGoToModal}
              className="p-2 rounded-xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
              title="برو به تاریخ"
            >
              <Compass className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">برو به تاریخ</span>
            </button>

            {/* Occasion Search Button */}
            <button
              id="btn-open-search-modal"
              onClick={openSearchModal}
              className="p-2 rounded-xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
              title="جستجوی مناسبت‌ها"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">جستجو</span>
            </button>

            {/* Year Overview Grid Button */}
            <button
              id="btn-open-year-overview"
              onClick={openYearOverviewModal}
              className="p-2 rounded-xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
              title="گاهشماری ۱۲ ماهه"
            >
              <LayoutGrid className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">نمای سالانه</span>
            </button>
          </div>
        </div>

        {/* 12 Months Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-slate-100">
          {PERSIAN_MONTH_NAMES.map((name, index) => {
            const m = index + 1;
            const isSelected = currentMonth === m;
            const isCurrentM = today.jy === currentYear && today.jm === m;

            return (
              <button
                key={m}
                id={`tab-month-${m}`}
                onClick={() => onMonthChange(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#123C35] text-white shadow-[0_3px_10px_rgba(18,60,53,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]'
                    : isCurrentM
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#F7F4EC]'
                }`}
              >
                <span>{name}</span>
                {isCurrentM && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Month Statistics Bar */}
        <div className="bg-[#F7F4EC] rounded-2xl p-3 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-600 border border-[#D9DED9] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>تعداد روزها:</span>
              <strong className="text-slate-900">{toPersianDigits(daysCount)} روز</strong>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>تعطیلات رسمی:</span>
              <strong className="text-rose-600 font-bold">{toPersianDigits(holidaysCount)} روز</strong>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>کل مناسبت‌ها:</span>
              <strong className="text-slate-900">{toPersianDigits(uniqueOccasionsCount)} مناسبت</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">راهنما:</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              <span>🔴 تعطیل رسمی</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid Card */}
      <div className="bg-white rounded-3xl p-3 sm:p-6 border border-[#D9DED9] shadow-[0_4px_16px_-2px_rgba(18,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
        {/* Weekday Names Header Row */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs sm:text-sm font-black py-2 border-b border-slate-100">
          {PERSIAN_WEEK_DAYS.map((wd) => (
            <div
              key={wd.key}
              className={`py-1 rounded-xl ${
                wd.key === 6
                  ? 'text-rose-600 font-extrabold bg-rose-50/60'
                  : 'text-slate-700'
              }`}
            >
              <span className="hidden sm:inline">{wd.name}</span>
              <span className="sm:hidden">{wd.short}</span>
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty Cells for Starting Offset */}
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="min-h-[78px] sm:min-h-[92px] md:min-h-[105px] rounded-2xl bg-slate-50/40 border border-transparent"
            />
          ))}

          {/* Real Day Cells */}
          {monthDays.map((dateInfo) => {
            const dateKey = makeDateKey(dateInfo.jalali.jy, dateInfo.jalali.jm, dateInfo.jalali.jd);
            const hasNotes = userNotes.some(n => n.dateKey === dateKey);
            const hasTasks = userTasks.some(t => t.dateKey === dateKey);

            return (
              <DayCell
                key={dateKey}
                dateInfo={dateInfo}
                isSelected={selectedDateInfo?.jalali.jd === dateInfo.jalali.jd || selectedDay === dateInfo.jalali.jd}
                onSelect={(d) => openDateDetailModal(d)}
                hasUserNotes={hasNotes}
                hasUserTasks={hasTasks}
                showHijri={showHijriInCells}
                showGregorian={showGregorianInCells}
              />
            );
          })}
        </div>
      </div>

      {/* Month Occasions List Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                مناسبت‌های {PERSIAN_MONTH_NAMES[currentMonth - 1]} {toPersianDigits(currentYear)}
              </h3>
              <p className="text-xs text-slate-500">لیست تمامی مناسبت‌های ملی، مذهبی و تعطیلات رسمی این ماه</p>
            </div>
          </div>

          {/* Filter Holidays Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveHolidayFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeHolidayFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه مناسبت‌ها
            </button>
            <button
              onClick={() => setActiveHolidayFilter('holidays_only')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeHolidayFilter === 'holidays_only' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فقط تعطیلات رسمی 🔴
            </button>
          </div>
        </div>

        {/* Occasions Grid / List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {monthDays
            .filter(d => d.occasions.length > 0)
            .flatMap(d => d.occasions.map(occ => ({ date: d, occ })))
            .filter(item => activeHolidayFilter === 'all' || item.occ.isHoliday)
            .map(({ date, occ }, index) => (
              <div
                key={`${date.jalali.jd}-${occ.id}-${index}`}
                onClick={() => openDateDetailModal(date)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] text-right flex items-start justify-between gap-2.5 ${
                  occ.isHoliday
                    ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
                    occ.isHoliday ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    <span className="text-xs leading-none">{toPersianDigits(date.jalali.jd)}</span>
                    <span className="text-[9px] font-medium opacity-80">{date.dayOfWeekName.slice(0, 2)}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {occ.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                      <span>{date.dayOfWeekName}</span>
                      <span>•</span>
                      <span>{date.gregorian.gd} {GREGORIAN_MONTH_NAMES[date.gregorian.gm - 1]}</span>
                    </div>
                  </div>
                </div>

                {occ.isHoliday && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold whitespace-nowrap">
                    🔴 تعطیل
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Modals */}
      <DayDetailModal
        dateInfo={selectedDateInfo}
        onClose={() => closeModal(() => setSelectedDateInfo(null))}
        selectedCityId={selectedCityId}
        userNotes={userNotes}
        userTasks={userTasks}
        onAddNote={onAddNote}
        onDeleteNote={onDeleteNote}
        onAddTask={onAddTask}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onNavigateToConverterWithDate={onNavigateToConverterWithDate}
      />

      <GoToDateModal
        isOpen={isGoToOpen}
        onClose={() => closeModal(() => setIsGoToOpen(false))}
        onSelectDate={handleSelectDateFromPicker}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />

      <OccasionSearchModal
        isOpen={isSearchOpen}
        onClose={() => closeModal(() => setIsSearchOpen(false))}
        onSelectOccasionDate={handleSelectDateFromPicker}
        hijriAdjustment={hijriAdjustment}
      />

      <YearOverviewModal
        isOpen={isYearOverviewOpen}
        onClose={() => closeModal(() => setIsYearOverviewOpen(false))}
        year={currentYear}
        onSelectYearMonth={(y, m) => {
          onYearChange(y);
          onMonthChange(m);
        }}
        onSelectYear={(y) => onYearChange(y)}
        hijriAdjustment={hijriAdjustment}
      />
    </div>
  );
};
