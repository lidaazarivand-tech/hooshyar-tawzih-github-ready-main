import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  ArrowLeft, 
  Sparkles, 
  Tag,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  searchOccasions, 
  SearchOccasionResult 
} from '../../data/occasions';
import { Occasion } from '../../types/calendar';
import { 
  PERSIAN_MONTH_NAMES, 
  toPersianDigits 
} from '../../utils/persianNumber';
import { getJalaliDayOfWeek, getDayOfWeekName, getTodayJalali } from '../../utils/jalali';

interface OccasionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOccasionDate?: (year: number, month: number, day: number) => void;
  onSelectOccasion?: (occ: Occasion) => void;
  onSelectDate?: (year: number, month: number, day: number) => void;
  hijriAdjustment?: number;
}

const POPULAR_SEARCHES = [
  'نوروز',
  'روز مادر',
  'روز پدر',
  'شب یلدا',
  'عید فطر',
  'عید غدیر',
  'عاشورا',
  'نیمه شعبان',
  'فردوسی',
  'حافظ',
  'معلم',
  'کارگر',
  'پزشک',
  'تعطیل'
];

export const OccasionSearchModal: React.FC<OccasionSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectOccasionDate,
  onSelectOccasion,
  onSelectDate,
  hijriAdjustment = 0
}) => {
  const currentJalaliYear = useMemo(() => getTodayJalali().jy, []);
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentJalaliYear);
  const [filterType, setFilterType] = useState<'all' | 'holiday' | 'national' | 'religious' | 'international'>('all');

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

  // Lock body scroll when open
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

  // Fast Instant Search using memoized cached searchOccasions
  const searchResults = useMemo(() => {
    if (!isOpen) return [];

    const startY = selectedYear === 'all' ? 1403 : selectedYear;
    const endY = selectedYear === 'all' ? 1410 : selectedYear;

    let res: SearchOccasionResult[] = [];
    if (!query.trim()) {
      // Show major holidays when search is empty
      res = searchOccasions('', startY, endY, hijriAdjustment);
    } else {
      res = searchOccasions(query, startY, endY, hijriAdjustment);
    }

    if (filterType === 'holiday') {
      res = res.filter(r => r.occasion.isHoliday);
    } else if (filterType === 'national') {
      res = res.filter(r => r.occasion.type === 'national' || r.occasion.type === 'cultural' || r.occasion.type === 'historical');
    } else if (filterType === 'religious') {
      res = res.filter(r => r.occasion.type === 'religious');
    } else if (filterType === 'international') {
      res = res.filter(r => r.occasion.type === 'international');
    }

    return res;
  }, [isOpen, query, selectedYear, filterType, hijriAdjustment]);

  if (!isOpen) return null;

  return (
    <div 
      id="search-occasion-modal-overlay"
      className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="search-occasion-modal-content"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md shadow-xs">
              <Search className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">جستجوی سریع مناسبت‌ها</h2>
              <p className="text-xs text-slate-300">جستجو در تعطیلات و رویدادهای ملی، مذهبی و جهانی</p>
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

        {/* Search Bar & Filters Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 space-y-3 shrink-0">
          {/* Main Input */}
          <div className="relative">
            <input
              id="input-occasion-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مثلاً: «نوروز»، «روز مادر»، «شب یلدا»، «عید فطر»..."
              autoFocus
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-2xl py-3 pr-11 pl-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-xs"
            />
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-3 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Popular Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">
              پیشنهادی:
            </span>
            {POPULAR_SEARCHES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  query === tag 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Filter options */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70">
            {/* Year Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-bold">سال:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                <option value={currentJalaliYear}>سال جاری ({toPersianDigits(currentJalaliYear)})</option>
                <option value="all">همه سال‌ها (۱۴۰۳ تا ۱۴۱۰)</option>
                {[1403, 1404, 1405, 1406, 1407, 1408, 1409, 1410].filter(y => y !== currentJalaliYear).map(y => (
                  <option key={y} value={y}>{toPersianDigits(y)}</option>
                ))}
              </select>
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                همه
              </button>
              <button
                type="button"
                onClick={() => setFilterType('holiday')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'holiday' ? 'bg-rose-600 text-white' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
                }`}
              >
                🔴 تعطیلات رسمی
              </button>
              <button
                type="button"
                onClick={() => setFilterType('national')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'national' ? 'bg-blue-600 text-white' : 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100'
                }`}
              >
                🔵 ملی/فرهنگی
              </button>
              <button
                type="button"
                onClick={() => setFilterType('religious')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterType === 'religious' ? 'bg-emerald-600 text-white' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                }`}
              >
                🟢 مذهبی
              </button>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2 flex items-center justify-between">
            <span>{query ? `نتایج جستجو برای «${query}»:` : 'مناسبت‌ها و تعطیلات برگزیده:'}</span>
            <span>{toPersianDigits(searchResults.length)} مورد پیدا شد</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs sm:text-sm space-y-2">
              <p>مناسبتی منطبق با جستجوی شما یافت نشد.</p>
              <p className="text-[11px] text-slate-400">کلمات کلیدی مثل «نوروز»، «یلدا»، «مادر»، «فطر» یا «تعطیل» را امتحان کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {searchResults.slice(0, 80).map((res, index) => {
                const dayOfWeek = getJalaliDayOfWeek(res.jy, res.jm, res.jd);
                const dayName = getDayOfWeekName(dayOfWeek);

                return (
                  <div
                    key={`${res.dateKey}-${res.occasion.id}-${index}`}
                    className={`p-3.5 rounded-2xl border transition-all text-right flex flex-col justify-between ${
                      res.occasion.isHoliday
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                          {dayName}، {toPersianDigits(res.jd)} {PERSIAN_MONTH_NAMES[res.jm - 1]} {toPersianDigits(res.jy)}
                        </span>
                        {res.occasion.isHoliday && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold shadow-2xs">
                            🔴 تعطیل رسمی
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {res.occasion.title}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {res.occasion.type === 'national' ? 'ملی' : res.occasion.type === 'religious' ? 'مذهبی' : res.occasion.type === 'cultural' ? 'فرهنگی / تاریخی' : 'بین‌المللی'}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectOccasionDate) {
                            onSelectOccasionDate(res.jy, res.jm, res.jd);
                          } else if (onSelectDate) {
                            onSelectDate(res.jy, res.jm, res.jd);
                          } else if (onSelectOccasion) {
                            onSelectOccasion(res.occasion);
                          }
                          onClose();
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-100/70 dark:bg-rose-950/60 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <span>مشاهده در تقویم</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
