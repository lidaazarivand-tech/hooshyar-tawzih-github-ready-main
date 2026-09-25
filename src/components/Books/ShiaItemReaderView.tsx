import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Bookmark,
  Copy,
  Check,
  Type,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  AlertCircle,
  ShieldCheck,
  AlignJustify
} from 'lucide-react';
import { SHIA_BOOKS_CONTENT, SHIA_BOOK_CATEGORIES, SAHIFAH_CATALOG_DUAS } from '../../data/shiaBooksData';
import { ShiaBookItem, BookCategoryId } from '../../types/books';
import { getStoredShiaBookmarks, saveStoredShiaBookmarks } from '../../utils/storage';
import { toPersianDigits } from '../../utils/persianNumber';

interface ShiaItemReaderViewProps {
  categoryId: BookCategoryId;
  itemId: string;
  onBackToCatalog: () => void;
  onSelectItem: (id: string) => void;
}

export const ShiaItemReaderView: React.FC<ShiaItemReaderViewProps> = ({
  categoryId,
  itemId,
  onBackToCatalog,
  onSelectItem
}) => {
  const [fontSize, setFontSize] = useState<number>(22);
  const [displayMode, setDisplayMode] = useState<'dual' | 'arabic' | 'persian'>('dual');
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);

  const items = SHIA_BOOKS_CONTENT[categoryId] || [];
  const currentItemIndex = items.findIndex(it => it.id === itemId);

  // If item found in detailed data
  const item: ShiaBookItem | undefined = currentItemIndex >= 0 ? items[currentItemIndex] : undefined;

  // Check if item is in catalog (e.g. 54 Duas catalog index of Sahifah)
  const catalogDua = categoryId === 'sahifah'
    ? SAHIFAH_CATALOG_DUAS.find(d => d.id === itemId)
    : undefined;

  const categoryMeta = SHIA_BOOK_CATEGORIES.find(c => c.id === categoryId);

  // Handle bookmarks
  useEffect(() => {
    try {
      const bms = getStoredShiaBookmarks();
      setBookmarked(bms.includes(itemId));
    } catch (e) {
      // ignore
    }
  }, [itemId]);

  useEffect(() => {
    if (item && !item.persianTranslation) {
      setDisplayMode('arabic');
    }
  }, [item]);

  const toggleBookmark = () => {
    try {
      const bms = getStoredShiaBookmarks();
      let updated: string[];
      if (bms.includes(itemId)) {
        updated = bms.filter((id: string) => id !== itemId);
        setBookmarked(false);
      } else {
        updated = [...bms, itemId];
        setBookmarked(true);
      }
      saveStoredShiaBookmarks(updated);
    } catch (e) {
      // ignore
    }
  };

  const handleCopy = () => {
    if (!item) return;
    const translationBlock = item.persianTranslation
      ? (categoryId === 'nahj'
          ? `\n\nترجمه فارسی (استاد دکتر سید جعفر شهیدی):\n${item.persianTranslation}`
          : categoryId === 'mafatih'
          ? `\n\nترجمه: سید هاشم رسولی محلاتی:\n${item.persianTranslation}`
          : categoryId === 'sahifah'
          ? `\n\nترجمه: مهدی الهی قمشه‌ای:\n${item.persianTranslation}`
          : `\n\nترجمه فارسی:\n${item.persianTranslation}`)
      : '';
    const text = `«${item.title}»\n\nمتن عربی:\n${item.arabicText}${translationBlock}\n\n${item.sourceCitation || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Theme styling helpers
  const getThemeClasses = () => {
    switch (readingTheme) {
      case 'sepia':
        return 'bg-[#fbf7ee] dark:bg-[#2b261f] text-[#3d3326] dark:text-[#ede4d8] border-[#e8ddc9] dark:border-[#4a3f32]';
      case 'dark':
        return 'bg-slate-900 text-slate-100 border-slate-800';
      case 'light':
      default:
        return 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700';
    }
  };

  const getCardThemeClasses = () => {
    switch (readingTheme) {
      case 'sepia':
        return 'bg-[#f4ebd9] dark:bg-[#383024] border-[#e2d5bd] dark:border-[#4a3f32]';
      case 'dark':
        return 'bg-slate-800/80 border-slate-700/80';
      case 'light':
      default:
        return 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50';
    }
  };

  // Missing content state (e.g. Sahifah item not yet loaded)
  if (!item && catalogDua) {
    return (
      <div className="space-y-4 animate-fadeIn">
        {/* Top App Bar & Navigation */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فهرست عناوین</span>
          </button>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {categoryMeta?.persianTitle || 'صحیفه سجادیه'}
          </span>
        </div>

        {/* Item Header Context Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-lg text-center relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-indigo-300 text-xs font-bold">
              <span>دعای شماره {toPersianDigits(catalogDua.num)} صحیفه</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-amber-300 font-serif">
              {catalogDua.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
              {catalogDua.desc}
            </p>
          </div>
        </div>

        {/* Honest Missing Content Notice */}
        <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-base md:text-lg font-extrabold text-slate-800 dark:text-white">
              محتوای این بخش در نسخه فعلی برنامه هنوز کامل نشده است.
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              متن کامل عربی و ترجمه فارسی این نیایش شریف در به‌روزرسانی‌های آتی اضافه خواهد شد.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              بازگشت به فهرست عناوین
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Invalid Item / Not found
  if (!item) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فهرست عناوین</span>
          </button>
        </div>

        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white">
              بخش مورد نظر یافت نشد.
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              شناسه این بخش نامعتبر است یا این عنوان در کتابخانه موجود نمی‌باشد.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              بازگشت به فهرست
            </button>
          </div>
        </div>
      </div>
    );
  }

  const prevItem = currentItemIndex > 0 ? items[currentItemIndex - 1] : null;
  const nextItem = currentItemIndex >= 0 && currentItemIndex < items.length - 1 ? items[currentItemIndex + 1] : null;

  const hasFarazes = item.arabicFarazes && item.arabicFarazes.length > 1;

  return (
    <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top App Bar & Navigation */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          id="btn-back-to-catalog"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>فهرست عناوین</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBookmark}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              bookmarked
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-amber-50'
            }`}
            title="نشانه‌گذاری"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{bookmarked ? 'نشانه‌گذاری شده' : 'نشان کردن'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
            title="کپی متن و ترجمه"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? 'کپی شد' : 'کپی متن'}</span>
          </button>
        </div>
      </div>

      {/* Item Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950 to-stone-950 p-4 sm:p-6 rounded-3xl text-white shadow-lg text-center relative overflow-hidden w-full max-w-full min-w-0 break-words">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-amber-300 text-xs font-bold">
            <span>{item.category || (categoryId === 'mafatih' ? (item.num ? `بخش ${toPersianDigits(item.num)}` : 'مفاتیح الجنان') : 'بخش')}</span>
            {item.shortTitle && <span>• {item.shortTitle}</span>}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-amber-300 font-serif leading-snug break-words">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-xs md:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed break-words">
              {item.description}
            </p>
          )}

          {item.virtueOrOccasion && (
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-200 bg-amber-900/50 border border-amber-500/30 px-3 py-1.5 rounded-xl backdrop-blur-sm mt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{item.virtueOrOccasion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Reader Preferences Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Display Mode Tabs (Dual / Arabic / Persian) */}
        {item.persianTranslation ? (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDisplayMode('dual')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                displayMode === 'dual'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              متن و ترجمه
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('arabic')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                displayMode === 'arabic'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              فقط عربی
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('persian')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                displayMode === 'persian'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              فقط ترجمه
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>متن کامل شریف</span>
          </div>
        )}

        {/* Font Size Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-xl">
          <Type className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-bold text-slate-600 dark:text-slate-300">اندازه قلم:</span>
          <button
            onClick={() => setFontSize(prev => Math.max(prev - 2, 16))}
            className="w-6 h-6 bg-white dark:bg-slate-800 rounded-md font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 shadow-xs"
          >
            -
          </button>
          <span className="font-mono px-1 font-bold text-amber-600">{toPersianDigits(fontSize)}</span>
          <button
            onClick={() => setFontSize(prev => Math.min(prev + 2, 40))}
            className="w-6 h-6 bg-white dark:bg-slate-800 rounded-md font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 shadow-xs"
          >
            +
          </button>
        </div>

        {/* Theme Palette */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
          <button
            onClick={() => setReadingTheme('light')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
              readingTheme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
            title="تم روشن"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setReadingTheme('sepia')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
              readingTheme === 'sepia' ? 'bg-[#f4ebd9] text-[#5c4a30] shadow-sm' : 'text-slate-500'
            }`}
            title="تم سپیا (کاغذ کهن)"
          >
            کاغذ
          </button>
          <button
            onClick={() => setReadingTheme('dark')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
              readingTheme === 'dark' ? 'bg-slate-900 text-amber-300 shadow-sm' : 'text-slate-500'
            }`}
            title="تم تیره"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Reading Canvas */}
      <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border shadow-sm transition-all duration-300 space-y-6 w-full max-w-full overflow-x-hidden min-w-0 break-words ${getThemeClasses()}`}>
        {!item.persianTranslation?.trim() && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 break-words">
            ترجمه فارسی معتبر این مدخل در نسخه فعلی موجود نیست؛ متن عربی بدون تغییر نمایش داده می‌شود.
          </div>
        )}
        {hasFarazes ? (
          /* Faraz-by-Faraz structured reading for multi-paragraph items */
          <div className="space-y-6 w-full max-w-full min-w-0">
            {item.arabicFarazes!.map((farazAr, idx) => {
              const farazTr = item.persianFarazes ? item.persianFarazes[idx] : null;
              return (
                <div key={idx} className={`p-4 sm:p-5 md:p-6 rounded-2xl border space-y-4 w-full max-w-full min-w-0 overflow-x-hidden break-words ${getCardThemeClasses()}`}>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                      بند {toPersianDigits(idx + 1)}
                    </span>
                    {idx === 0 && (
                      <span className="font-serif text-amber-800 dark:text-amber-300">
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </span>
                    )}
                  </div>

                  {/* Arabic Faraz */}
                  {(displayMode === 'dual' || displayMode === 'arabic') && (
                    <p
                      lang="ar"
                      dir="rtl"
                      className="text-right leading-[2.3] font-serif font-medium select-text whitespace-pre-line text-slate-900 dark:text-slate-100 break-words [overflow-wrap:anywhere]"
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: 'Amiri, Scheherazade New, serif'
                      }}
                    >
                      {farazAr}
                    </p>
                  )}

                  {/* Persian Translation Faraz */}
                  {(displayMode === 'dual' || displayMode === 'persian') && farazTr && (
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>{categoryId === 'nahj' ? 'ترجمه دکتر سید جعفر شهیدی:' : categoryId === 'sahifah' ? 'ترجمه مهدی الهی قمشه‌ای:' : categoryId === 'mafatih' ? 'ترجمه استاد رسولی محلاتی:' : 'ترجمه فارسی:'}</span>
                      </div>
                      <p lang="fa" dir="rtl" className="text-right text-sm md:text-base leading-relaxed select-text whitespace-pre-line text-slate-700 dark:text-slate-300 break-words [overflow-wrap:anywhere]">
                        {farazTr}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Single block view for wisdoms or single-faraz items */
          <div className="space-y-6 w-full max-w-full min-w-0">
            {/* Arabic Text Block */}
            {(displayMode === 'dual' || displayMode === 'arabic') && (
              <div className={`p-4 sm:p-5 md:p-6 rounded-2xl border w-full max-w-full min-w-0 overflow-x-hidden break-words ${getCardThemeClasses()}`}>
                <div className="flex items-center justify-between mb-3 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <span>{categoryId === 'nahj' ? 'متن شریف کلام امیرالمؤمنین (ع)' : (item.title || 'متن عربی شریف')}</span>
                  <span className="font-serif">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                </div>

                <p
                  lang="ar"
                  dir="rtl"
                  className="text-right leading-[2.3] font-serif font-medium select-text whitespace-pre-line text-slate-900 dark:text-slate-100 break-words [overflow-wrap:anywhere]"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: 'Amiri, Scheherazade New, serif'
                  }}
                >
                  {item.arabicText}
                </p>
              </div>
            )}

            {/* Persian Translation Block */}
            {(displayMode === 'dual' || displayMode === 'persian') && item.persianTranslation ? (
              <div className={`p-4 sm:p-5 md:p-6 rounded-2xl border w-full max-w-full min-w-0 overflow-x-hidden break-words ${getCardThemeClasses()}`}>
                <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    {categoryId === 'nahj'
                      ? 'ترجمه فارسی (استاد دکتر سید جعفر شهیدی):'
                      : categoryId === 'mafatih'
                      ? 'ترجمه: سید هاشم رسولی محلاتی'
                      : categoryId === 'sahifah'
                      ? 'ترجمه: مهدی الهی قمشه‌ای'
                      : 'ترجمه فارسی:'}
                  </span>
                </div>

                <p lang="fa" dir="rtl" className="text-right text-sm md:text-base leading-relaxed select-text whitespace-pre-line text-slate-700 dark:text-slate-200 break-words [overflow-wrap:anywhere]">
                  {item.persianTranslation}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Source Provenance & License Verification Block */}
        <div className={`p-4 md:p-5 rounded-2xl border text-xs space-y-2 w-full max-w-full min-w-0 break-words ${getCardThemeClasses()}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>مأخذ و استناد نسخه:</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              {categoryId === 'nahj'
                ? 'ترجمه استاد دکتر سید جعفر شهیدی'
                : (categoryId === 'mafatih' && item.persianTranslation
                ? 'ترجمه: سید هاشم رسولی محلاتی'
                : (categoryId === 'sahifah'
                ? 'ترجمه: مهدی الهی قمشه‌ای'
                : (item.licenseInfo ? 'استناد معتبر نسخه' : 'نسخه معتبر')))}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-right break-words">
            {item.sourceCitation || (categoryId === 'mafatih' ? 'متن و ادعیه: کلیات مفاتیح الجنان شیخ عباس قمی (ره) — منبع: انتشارات اسوه (کتابخانه فقاهت) | ترجمه فارسی: سید هاشم رسولی محلاتی' : (categoryId === 'sahifah' ? 'صحیفه کامله سجادیه — ترجمه مهدی الهی قمشه‌ای' : 'متن عربی: نهج‌البلاغه، گردآوری سید شریف رضی — منبع: پایگاه تخصصی نهج‌البلاغه، balaghah.net | ترجمه فارسی: سید جعفر شهیدی — منبع: پایگاه تخصصی نهج‌البلاغه'))}
          </p>
          {item.sourceUrl && (
            <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 break-all">
              <span className="font-bold">پیوند منبع دیجیتال: </span>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-700 dark:text-amber-400 hover:underline font-mono direction-ltr inline-block break-all max-w-full"
              >
                {item.sourceUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer (Prev / Next) */}
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 w-full max-w-full overflow-hidden">
        {prevItem ? (
          <button
            type="button"
            onClick={() => onSelectItem(prevItem.id)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shrink min-w-0"
          >
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1 max-w-[85px] xs:max-w-[110px] sm:max-w-[130px] truncate">{prevItem.shortTitle || prevItem.title}</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onBackToCatalog}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          فهرست بخش‌ها
        </button>

        {nextItem ? (
          <button
            type="button"
            onClick={() => onSelectItem(nextItem.id)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shrink min-w-0"
          >
            <span className="line-clamp-1 max-w-[85px] xs:max-w-[110px] sm:max-w-[130px] truncate">{nextItem.shortTitle || nextItem.title}</span>
            <ChevronLeft className="w-4 h-4 shrink-0" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
