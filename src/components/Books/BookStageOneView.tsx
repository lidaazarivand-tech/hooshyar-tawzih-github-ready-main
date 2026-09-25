import React from 'react';
import { 
  BookOpen, 
  ScrollText, 
  Layers, 
  Compass, 
  Scale, 
  ArrowRight, 
  Clock, 
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { BookCategoryId } from '../../types/books';
import { SHIA_BOOK_CATEGORIES } from '../../data/shiaBooksData';

interface BookStageOneViewProps {
  bookId: BookCategoryId;
  onBackToShelf: () => void;
}

export const BookStageOneView: React.FC<BookStageOneViewProps> = ({
  bookId,
  onBackToShelf
}) => {
  const book = SHIA_BOOK_CATEGORIES.find(b => b.id === bookId) || SHIA_BOOK_CATEGORIES[0];

  const getIcon = () => {
    switch (book.id) {
      case 'quran':
        return <BookOpen className="w-10 h-10 text-emerald-300" />;
      case 'nahj':
        return <ScrollText className="w-10 h-10 text-amber-300" />;
      case 'mafatih':
        return <Layers className="w-10 h-10 text-rose-300" />;
      case 'sahifah':
        return <Compass className="w-10 h-10 text-blue-300" />;
      case 'tawzih':
      case 'ahkam':
        return <Scale className="w-10 h-10 text-teal-300" />;
      default:
        return <BookOpen className="w-10 h-10 text-emerald-300" />;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn max-w-3xl mx-auto" dir="rtl">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          id="btn-back-to-shelf"
          onClick={onBackToShelf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all shadow-xs cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>بازگشت به قفسه کتابخانه اسلامی</span>
        </button>

        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          مرحله اول: ساختار قفسه کتب
        </span>
      </div>

      {/* Book Banner */}
      <div className={`p-6 sm:p-7 rounded-3xl bg-gradient-to-br ${book.colorClass} text-white shadow-xl relative overflow-hidden border border-white/10`}>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-black/25 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-white/15 rounded-full text-xs font-bold text-white/90 mb-1.5 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{book.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {book.persianTitle}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 font-medium">
              {book.authorOrSource}
            </p>
          </div>
        </div>
      </div>

      {/* Content Status Container (Clean, Honest, Dignified) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            محتوای این کتاب در حال آماده‌سازی است.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            در فاز اول بازسازی کتابخانه اسلامی «هوشیار»، قفسه و هویت ۵ اثر بنیادین معارف اسلامی تعریف گردیده است.
            متن اصلی، ترجمه، اعراب‌گذاری و فهرست تفصیلی در مراحل بعد و پس از اعتبارسنجی دقیق منابع به این بخش افزوده خواهد شد.
          </p>
        </div>

        {/* Book Metadata Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-right text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">نام کتاب:</span>
            <div className="font-bold text-slate-800 dark:text-slate-100">{book.title}</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">پدیدآورنده / منبع:</span>
            <div className="font-bold text-slate-800 dark:text-slate-100">{book.authorOrSource}</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">وضعیت کارکرد:</span>
            <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>کاملاً آفلاین و بدون اینترنت</span>
            </div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">وضعیت محتوا:</span>
            <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>در حال آماده‌سازی مرحله بعد</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            id="btn-return-to-shelf"
            onClick={onBackToShelf}
            className="px-6 py-2.5 bg-slate-900 hover:bg-[#123C35] dark:bg-slate-700 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <span>بازگشت به قفسه کتابخانه اسلامی</span>
            <span>←</span>
          </button>
        </div>
      </div>
    </div>
  );
};
