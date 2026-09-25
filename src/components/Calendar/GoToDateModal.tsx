import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Sparkles, Compass, Calendar } from 'lucide-react';
import { 
  PERSIAN_MONTH_NAMES, 
  toPersianDigits 
} from '../../utils/persianNumber';
import { getJalaliMonthLength } from '../../utils/jalali';

interface GoToDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate?: (year: number, month: number, day: number) => void;
  onSelect?: (year: number, month: number, day?: number) => void;
  currentYear: number;
  currentMonth: number;
}

export const GoToDateModal: React.FC<GoToDateModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  onSelect,
  currentYear,
  currentMonth
}) => {
  // ALL HOOKS UNCONDITIONALLY AT THE TOP LEVEL
  const [year, setYear] = useState<number>(currentYear || 1404);
  const [month, setMonth] = useState<number>(currentMonth || 1);
  const [day, setDay] = useState<number>(1);

  // Sync state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (currentYear) setYear(currentYear);
      if (currentMonth) setMonth(currentMonth);
    }
  }, [isOpen, currentYear, currentMonth]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const daysInMonth = getJalaliMonthLength(year, month);
  const validDay = Math.min(day, daysInMonth);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSelectDate) {
      onSelectDate(year, month, validDay);
    } else if (onSelect) {
      onSelect(year, month, validDay);
    }
    onClose();
  };

  const QUICK_PRESETS = [
    { label: 'عید نوروز', y: year, m: 1, d: 1 },
    { label: 'سیزده‌بدر', y: year, m: 1, d: 13 },
    { label: 'بزرگداشت فردوسی', y: year, m: 2, d: 25 },
    { label: 'روز حافظ', y: year, m: 7, d: 20 },
    { label: 'شب یلدا', y: year, m: 9, d: 30 },
    { label: 'پیروزی انقلاب', y: year, m: 11, d: 22 },
    { label: 'ملی شدن نفت', y: year, m: 12, d: 29 },
  ];

  return (
    <div 
      id="goto-date-modal-overlay"
      className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="goto-date-modal-content"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md shadow-xs">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black">برو به تاریخ مشخص</h2>
              <p className="text-xs text-slate-300">انتقال سریع به هر روز در سال‌های ۱۴۰۰ تا ۱۴۲۰</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* Year Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سال
              </label>
              <select
                id="select-goto-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {Array.from({ length: 21 }, (_, i) => 1400 + i).map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ماه
              </label>
              <select
                id="select-goto-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {PERSIAN_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                روز
              </label>
              <select
                id="select-goto-day"
                value={validDay}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {toPersianDigits(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>مناسبت‌های سریع در سال {toPersianDigits(year)}:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMonth(p.m);
                    setDay(p.d);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200/70 dark:border-slate-700"
                >
                  {p.label} ({toPersianDigits(p.d)} {PERSIAN_MONTH_NAMES[p.m - 1]})
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>
            <button
              id="btn-confirm-goto-date"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span>مشاهده در تقویم</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
