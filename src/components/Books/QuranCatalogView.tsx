import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, BookOpen, Sparkles, Filter, Bookmark, Star, ShieldCheck } from 'lucide-react';
import { SURAH_LIST } from '../../data/quranSurahs';
import { SurahSummary } from '../../types/books';

interface QuranCatalogViewProps {
  onSelectSurah: (surahNumber: number) => void;
  onBackToShelf: () => void;
}

const FEATURED_SURAHS = [1, 36, 55, 56, 67, 78, 18, 76, 62, 97, 108, 112, 113, 114];

export const QuranCatalogView: React.FC<QuranCatalogViewProps> = ({
  onSelectSurah,
  onBackToShelf
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'makki' | 'madani' | 'juz'>('all');
  const [selectedJuz, setSelectedJuz] = useState<number>(1);

  const filteredSurahs = useMemo(() => {
    let list = SURAH_LIST;

    if (filterType === 'featured') {
      list = list.filter(s => FEATURED_SURAHS.includes(s.number));
    } else if (filterType === 'makki') {
      list = list.filter(s => s.revelationType === 'مکی');
    } else if (filterType === 'madani') {
      list = list.filter(s => s.revelationType === 'مدنی');
    } else if (filterType === 'juz') {
      list = list.filter(s => s.juz === selectedJuz);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        s =>
          s.number.toString() === q ||
          s.name.includes(q) ||
          s.persianName.toLowerCase().includes(q) ||
          s.englishName.toLowerCase().includes(q) ||
          s.theme.toLowerCase().includes(q) ||
          s.virtue.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, filterType, selectedJuz]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Bar with Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBackToShelf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به کتابخانه اسلامی</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-full text-xs font-bold">
            📖 ۱۱۴ سوره کامل (آفلاین)
          </span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
            ۶۲۳۶ آیه شریفه
          </span>
        </div>
      </div>

      {/* Book Overview Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
              <BookOpen className="w-4 h-4" />
              <span>فهرست کامل ۱۱۴ سوره کلام‌الله مجید (۶۲۳۶ آیه)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              قرآن کریم با ترجمه فارسی روان و آیات کامل
            </h2>
            <p className="text-emerald-100/80 text-xs mt-1 max-w-xl">
              متن کامل عربی و ترجمه فارسی تمام سوره‌ها به صورت کاملاً آفلاین و بدون نیاز به اینترنت در دسترس است.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs text-white">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>متن کامل و بدون وابستگی آنلاین</span>
          </div>
        </div>
      </div>

      {/* Provenance & Attribution Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/70 pb-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>شناسنامه منابع و مجوزهای مصحف شریف</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            تأییدیه اصالت داده‌ها
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
          <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 dark:text-white">متن عربی قرآن کریم</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                مجوز CC BY 3.0
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              منبع: پایگاه تنزیل (Tanzil.net - رسم‌الخط عثمانی، نسخه ۱.۱) • مجوز متن عربی: Creative Commons Attribution 3.0
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 dark:text-white">ترجمه فارسی قرآن کریم</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                حجت‌الاسلام قرائتی
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              مترجم: حجت‌الاسلام محسن قرائتی • منبع ارائه ترجمه: Tanzil.net • استفاده از ترجمه تابع شرایط و مجوز مربوط به ترجمه است.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجوی سوره (نام سوره، شماره، موضوع یا فضیلت)..."
            className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded-md"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            همه ۱۱۴ سوره
          </button>

          <button
            type="button"
            onClick={() => setFilterType('featured')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
              filterType === 'featured'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            سوره‌های پرفضیلت (یس، الرحمن، واقعه...)
          </button>

          <button
            type="button"
            onClick={() => setFilterType('makki')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterType === 'makki'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            سوره‌های مکی
          </button>

          <button
            type="button"
            onClick={() => setFilterType('madani')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterType === 'madani'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            سوره‌های مدنی
          </button>

          <button
            type="button"
            onClick={() => setFilterType('juz')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterType === 'juz'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            بر اساس جزء (۱ تا ۳۰)
          </button>
        </div>

        {/* Juz Selector (if juz filter active) */}
        {filterType === 'juz' && (
          <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-bold text-slate-500 shrink-0">انتخاب جزء:</span>
            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
              <button
                key={j}
                type="button"
                onClick={() => setSelectedJuz(j)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                  selectedJuz === j
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                جزء {j}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Surahs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSurahs.map((surah: SurahSummary) => (
          <div
            key={surah.number}
            id={`surah-card-${surah.number}`}
            role="button"
            tabIndex={0}
            aria-label={`مطالعه سوره ${surah.name}`}
            onClick={() => onSelectSurah(surah.number)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectSurah(surah.number);
              }
            }}
            className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {surah.number}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      سوره {surah.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {surah.persianName}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    surah.revelationType === 'مکی'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                  }`}
                >
                  {surah.revelationType} • {surah.numberOfAyahs} آیه
                </span>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-2 line-clamp-2 leading-relaxed">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">فضیلت: </span>
                {surah.virtue}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span>جزء {surah.juz}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                  آفلاین
                </span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                مطالعه سوره ←
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredSurahs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
            سوره‌ای با این مشخصات یافت نشد
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            نمایش همه سوره‌ها
          </button>
        </div>
      )}
    </div>
  );
};
