import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Sparkles,
  Clock
} from 'lucide-react';
import { 
  PERSIAN_MONTH_NAMES, 
  toPersianDigits, 
  padZero, 
  makeDateKey, 
  normalizeDateKey, 
  parseDateKey 
} from '../../utils/persianNumber';
import { 
  getJalaliMonthLength, 
  getJalaliDayOfWeek, 
  getDayOfWeekName, 
  getTodayJalali,
  addDaysToJalali
} from '../../utils/jalali';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD or YYYY/MM/DD
  onChange: (dateKey: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showShortcuts?: boolean;
  helperText?: string;
}

const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  minDate,
  maxDate,
  required = false,
  disabled = false,
  className = '',
  showShortcuts = true,
  helperText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [today, setToday] = useState(() => getTodayJalali());

  useEffect(() => {
    if (isOpen) setToday(getTodayJalali());
  }, [isOpen]);

  useEffect(() => {
    const refreshToday = () => {
      if (document.visibilityState === 'visible') {
        setToday(getTodayJalali());
      }
    };
    document.addEventListener('visibilitychange', refreshToday);
    window.addEventListener('focus', refreshToday);
    return () => {
      document.removeEventListener('visibilitychange', refreshToday);
      window.removeEventListener('focus', refreshToday);
    };
  }, []);

  // Parse current selected value
  const parsedValue = useMemo(() => {
    if (!value) return null;
    return parseDateKey(value);
  }, [value]);

  // Viewing month and year
  const [viewYear, setViewYear] = useState<number>(() => parsedValue?.jy || today.jy);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue?.jm || today.jm);

  // Sync viewing month/year when modal opens or value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.jy);
      setViewMonth(parsedValue.jm);
    } else {
      setViewYear(today.jy);
      setViewMonth(today.jm);
    }
  }, [parsedValue, isOpen, today]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const daysInViewMonth = getJalaliMonthLength(viewYear, viewMonth);
  const firstDayOfWeek = getJalaliDayOfWeek(viewYear, viewMonth, 1); // 0=Shanbeh, 6=Jomeh

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const dateKey = makeDateKey(viewYear, viewMonth, day);
    onChange(dateKey);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dateKey = makeDateKey(today.jy, today.jm, today.jd);
    onChange(dateKey);
    setViewYear(today.jy);
    setViewMonth(today.jm);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleShortcut = (daysToAdd: number) => {
    const target = addDaysToJalali(today, daysToAdd);
    const dateKey = makeDateKey(target.jy, target.jm, target.jd);
    onChange(dateKey);
    setViewYear(target.jy);
    setViewMonth(target.jm);
    setIsOpen(false);
  };

  // Formatted display text
  const displayText = useMemo(() => {
    if (!parsedValue) return '';
    const dayOfWeek = getJalaliDayOfWeek(parsedValue.jy, parsedValue.jm, parsedValue.jd);
    const dayName = getDayOfWeekName(dayOfWeek);
    return `${dayName}، ${toPersianDigits(parsedValue.jd)} ${PERSIAN_MONTH_NAMES[parsedValue.jm - 1]} ${toPersianDigits(parsedValue.jy)}`;
  }, [parsedValue]);

  // Year options list (from 1380 to 1430)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = 1380; y <= 1430; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full text-right ${className}`} dir="rtl">
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-rose-500 font-black">*</span>}
          </span>
          {parsedValue && (
            <span className="text-[10.5px] font-mono text-[#123C35] dark:text-emerald-400 font-bold bg-[#E9E5DA]/60 dark:bg-emerald-950/40 px-2 py-0.2 rounded-md">
              {toPersianDigits(makeDateKey(parsedValue.jy, parsedValue.jm, parsedValue.jd))}
            </span>
          )}
        </label>
      )}

      {/* Input Trigger Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-right transition-all cursor-pointer shadow-xs ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
            : isOpen
              ? 'bg-white dark:bg-slate-800 border-[#123C35] dark:border-emerald-500 ring-2 ring-[#123C35]/20'
              : 'bg-[#F7F4EC] dark:bg-slate-800/80 hover:bg-[#E9E5DA]/60 dark:hover:bg-slate-800 border-[#D9DED9] dark:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-white dark:bg-slate-700 text-[#123C35] dark:text-emerald-400 border border-[#D9DED9] dark:border-slate-600 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          {displayText ? (
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {displayText}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {parsedValue && !required && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="پاک کردن تاریخ"
            >
              <X className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </button>

      {helperText && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 mr-1">
          {helperText}
        </p>
      )}

      {/* Popover / Calendar Grid Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-[100] mt-2 top-full right-0 w-full sm:w-80 bg-white dark:bg-slate-900 rounded-3xl p-4 border border-[#D9DED9] dark:border-slate-700 shadow-2xl space-y-3.5 animate-fadeIn"
          style={{ minWidth: '280px' }}
        >
          {/* Quick Shortcuts Bar */}
          {showShortcuts && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2.5 py-1 rounded-xl bg-[#E9E5DA] dark:bg-emerald-950/60 hover:bg-[#123C35] hover:text-white text-[#123C35] dark:text-emerald-300 text-[11px] font-bold transition-colors whitespace-nowrap"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => handleShortcut(1)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                فردا
              </button>
              <button
                type="button"
                onClick={() => handleShortcut(2)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                پس‌فردا
              </button>
              <button
                type="button"
                onClick={() => handleShortcut(7)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                ۱ هفته بعد
              </button>
            </div>
          )}

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-[#F7F4EC] dark:bg-slate-800 border border-[#D9DED9] dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#123C35]"
              >
                {PERSIAN_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-[#F7F4EC] dark:bg-slate-800 border border-[#D9DED9] dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#123C35]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
            {WEEKDAYS_SHORT.map((w, idx) => (
              <div key={idx} className={idx === 6 ? 'text-rose-500 font-black' : ''}>
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInViewMonth }, (_, i) => i + 1).map((d) => {
              const isSelected = parsedValue && 
                parsedValue.jy === viewYear && 
                parsedValue.jm === viewMonth && 
                parsedValue.jd === d;

              const isToday = 
                today.jy === viewYear && 
                today.jm === viewMonth && 
                today.jd === d;

              const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
              const isFriday = dayOfWeek === 6;

              return (
                <button
                  key={`day-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`h-8 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${
                    isSelected
                      ? 'bg-[#123C35] text-white shadow-md shadow-[#123C35]/30 ring-2 ring-[#123C35]/30'
                      : isToday
                        ? 'bg-[#E9E5DA] dark:bg-emerald-950/60 text-[#123C35] dark:text-emerald-300 border border-[#123C35]/30'
                        : isFriday
                          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{toPersianDigits(d)}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#123C35] dark:bg-emerald-400 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[#123C35] dark:text-emerald-400 font-bold hover:underline py-1 px-1.5"
            >
              برو به امروز ({toPersianDigits(today.jd)} {PERSIAN_MONTH_NAMES[today.jm - 1]})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
