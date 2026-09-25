import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  CheckSquare, 
  FileText, 
  Bell, 
  CreditCard, 
  Users, 
  Calendar as CalendarIcon, 
  BookOpen, 
  Sparkles, 
  ArrowLeftRight,
  ArrowLeft
} from 'lucide-react';
import { UserTask, UserNote, UserReminder, ExpenseItem, DebtItem, Occasion, AppTab } from '../../types/calendar';
import { searchOccasions, SearchOccasionResult } from '../../data/occasions';
import { SURAH_LIST } from '../../data/quranSurahs';
import { SHIA_BOOK_CATEGORIES } from '../../data/shiaBooksData';
import { toPersianDigits, toEnglishDigits, removePersianDiacritics, PERSIAN_MONTH_NAMES } from '../../utils/persianNumber';
import { BookCategoryId } from '../../types/books';

export type BooksDeepLink =
  | { categoryId: 'quran'; surahNumber: number }
  | { categoryId: Exclude<BookCategoryId, 'quran'> };

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTasks: UserTask[];
  userNotes: UserNote[];
  userReminders: UserReminder[];
  expenses: ExpenseItem[];
  debts: DebtItem[];
  onNavigateTab: (tab: AppTab) => void;
  onOpenBooksModal: (target?: BooksDeepLink) => void;
  onSelectDate?: (year: number, month: number, day: number) => void;
  currentYear?: number;
  hijriAdjustment?: number;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  userTasks,
  userNotes,
  userReminders,
  expenses,
  debts,
  onNavigateTab,
  onOpenBooksModal,
  onSelectDate,
  currentYear = 1404,
  hijriAdjustment = 0
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

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

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => previouslyFocusedRef.current?.focus();
  }, [isOpen]);

  const searchResults = useMemo(() => {
    try {
      const q = debouncedQuery.toLowerCase();
      if (!q || q.length < 2) return null;
      const qEn = toEnglishDigits(q);
      const qFa = toPersianDigits(q);
      const qNorm = removePersianDiacritics(q);

      const matchesText = (str?: string) => {
        if (!str) return false;
        const lower = str.toLowerCase();
        if (lower.includes(q) || lower.includes(qEn) || lower.includes(qFa)) return true;
        const lowerNorm = removePersianDiacritics(lower);
        return lowerNorm.includes(qNorm);
      };

      // 1. Tasks
      const matchingTasks = (userTasks || []).filter(t => 
        matchesText(t?.text) || matchesText(t?.dateKey)
      );

      // 2. Notes
      const matchingNotes = (userNotes || []).filter(n => 
        matchesText(n?.title) || 
        matchesText(n?.content) ||
        matchesText(n?.dateKey)
      );

      // 3. Reminders
      const matchingReminders = (userReminders || []).filter(r => 
        matchesText(r?.title) || 
        matchesText(r?.notes) ||
        matchesText(r?.dateKey)
      );

      // 4. Occasions with true Jalali conversion
      const matchingOccasions: SearchOccasionResult[] = searchOccasions(q, currentYear, currentYear, hijriAdjustment);

      // 5. Debts
      const matchingDebts = (debts || []).filter(d => 
        matchesText(d?.personName) || 
        matchesText(d?.description)
      );

      // 6. Expenses
      const matchingExpenses = (expenses || []).filter(e => 
        matchesText(e?.description) || 
        matchesText(e?.category)
      );

      // 7. Quran Surahs
      const matchingQuran = (SURAH_LIST || []).filter(s => 
        matchesText(s?.persianName) || 
        matchesText(s?.name) || 
        matchesText(s?.englishName) ||
        (s?.number !== undefined && (s.number.toString() === qEn || s.number.toString() === q))
      );

      // 8. Shia Books
      const matchingBooks = (SHIA_BOOK_CATEGORIES || []).filter(b => 
        matchesText(b?.title) || 
        matchesText(b?.persianTitle) ||
        matchesText(b?.description)
      );

      const totalCount = 
        matchingTasks.length + 
        matchingNotes.length + 
        matchingReminders.length + 
        matchingOccasions.length + 
        matchingDebts.length + 
        matchingExpenses.length + 
        matchingQuran.length + 
        matchingBooks.length;

      return {
        tasks: matchingTasks,
        notes: matchingNotes,
        reminders: matchingReminders,
        occasions: matchingOccasions,
        debts: matchingDebts,
        expenses: matchingExpenses,
        quran: matchingQuran,
        books: matchingBooks,
        totalCount
      };
    } catch (err) {
      console.error('Error during global search:', err);
      return {
        tasks: [],
        notes: [],
        reminders: [],
        occasions: [],
        debts: [],
        expenses: [],
        quran: [],
        books: [],
        totalCount: 0
      };
    }
  }, [debouncedQuery, userTasks, userNotes, userReminders, expenses, debts, currentYear, hijriAdjustment]);

  if (!isOpen) return null;

  return (
    <div 
      id="global-search-overlay"
      className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={dialogRef}
        id="global-search-content"
        role="dialog"
        aria-modal="true"
        aria-label="جستجوی سراسری"
        tabIndex={-1}
        className="bg-white rounded-3xl p-4 sm:p-6 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-4 my-8 relative flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Search Header Input */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute right-4 pointer-events-none" />
          <input
            type="text"
            autoFocus
            aria-label="عبارت جستجو"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در کارها، یادداشت‌ها، مناسبت‌ها، کتابخانه اسلامی و مالی..."
            className="w-full bg-[#F7F4EC] border border-[#D9DED9] focus:border-[#123C35] focus:bg-white text-slate-900 rounded-2xl pr-12 pl-10 py-3.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#123C35]/20 focus:outline-none transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="پاک کردن عبارت جستجو"
              className="absolute left-3 p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <div className="py-10 text-center space-y-2 text-slate-400">
              <Search className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">برای جستجو، حداقل ۲ حرف تایپ کنید</p>
              <p className="text-[11px] text-slate-400">
                امکان جستجوی همزمان در کل بخش‌های برنامه، آیات، اشعار و مناسبت‌ها
              </p>
            </div>
          ) : searchResults?.totalCount === 0 ? (
            <div className="py-10 text-center space-y-2 text-slate-500">
              <p className="text-xs font-bold text-slate-700">موردی با عبارت «{debouncedQuery}» یافت نشد.</p>
              <p className="text-[11px] text-slate-400">لطفاً املای عبارت را بررسی کنید یا کلمه دیگری جستجو کنید.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between pb-1 border-b border-slate-100">
                <span>نتایج جستجو برای «{debouncedQuery}»</span>
                <span className="bg-[#E9E5DA] text-[#123C35] px-2.5 py-0.5 rounded-full">
                  {toPersianDigits(searchResults?.totalCount || 0)} مورد یافت شد
                </span>
              </div>

              {/* Tasks Results */}
              {searchResults && searchResults.tasks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>وظایف و کارها ({toPersianDigits(searchResults.tasks.length)})</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          onClose();
                          onNavigateTab('tasks');
                        }}
                        className="p-3 bg-[#F7F4EC] hover:bg-[#E9E5DA] rounded-xl border border-[#D9DED9] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className={`text-xs ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                          {task.text}
                        </span>
                        <span className="text-[10px] text-slate-400">{toPersianDigits(task.dateKey)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Results */}
              {searchResults && searchResults.notes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>یادداشت‌ها ({toPersianDigits(searchResults.notes.length)})</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.notes.map(note => (
                      <div
                        key={note.id}
                        onClick={() => {
                          onClose();
                          onNavigateTab('notes');
                        }}
                        className="p-3 bg-[#F7F4EC] hover:bg-[#E9E5DA] rounded-xl border border-[#D9DED9] cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{note.title}</span>
                          <span className="text-[10px] text-slate-400">{toPersianDigits(note.dateKey)}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-1">{note.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders Results */}
              {searchResults && searchResults.reminders.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <Bell className="w-4 h-4" />
                    <span>یادآورها ({toPersianDigits(searchResults.reminders.length)})</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.reminders.map(rem => (
                      <div
                        key={rem.id}
                        onClick={() => {
                          onClose();
                          onNavigateTab('reminders');
                        }}
                        className="p-3 bg-[#F7F4EC] hover:bg-[#E9E5DA] rounded-xl border border-[#D9DED9] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{rem.title}</div>
                          {rem.notes && <div className="text-[11px] text-slate-500">{rem.notes}</div>}
                        </div>
                        <span className="text-[10px] text-[#123C35] bg-white px-2 py-0.5 rounded-lg border border-[#D9DED9]">
                          {toPersianDigits(rem.dateKey)} {rem.time ? `ساعت ${toPersianDigits(rem.time)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Occasions Results */}
              {searchResults && searchResults.occasions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    <span>مناسبت‌های تقویم ({toPersianDigits(searchResults.occasions.length)})</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.occasions.map((item, idx) => (
                      <div
                        key={`${item.dateKey}-${item.occasion.id}-${idx}`}
                        onClick={() => {
                          onClose();
                          if (onSelectDate) {
                            onSelectDate(item.jy, item.jm, item.jd);
                          }
                          onNavigateTab('calendar');
                        }}
                        className="p-3 bg-[#F7F4EC] hover:bg-[#E9E5DA] rounded-xl border border-[#D9DED9] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.occasion.isHoliday ? '🔴' : '•'}</span>
                          <span className={`text-xs ${item.occasion.isHoliday ? 'font-bold text-rose-700' : 'text-slate-800 font-medium'}`}>
                            {item.occasion.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {toPersianDigits(item.jd)} {PERSIAN_MONTH_NAMES[item.jm - 1]} {toPersianDigits(item.jy)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quran Surahs Results */}
              {searchResults && searchResults.quran.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>سوره‌های قرآن کریم ({toPersianDigits(searchResults.quran.length)})</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.quran.map(surah => (
                      <div
                        key={surah.number}
                        onClick={() => {
                          onClose();
                          onOpenBooksModal({
                            categoryId: 'quran',
                            surahNumber: surah.number
                          });
                        }}
                        className="p-3 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl border border-emerald-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center font-sans">
                            {toPersianDigits(surah.number)}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-emerald-950">سوره {surah.persianName} ({surah.name})</div>
                            <div className="text-[10px] text-emerald-700">{surah.numberOfAyahs} آیه • جزء {toPersianDigits(surah.juz)} • {surah.revelationType}</div>
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shia Books Results */}
              {searchResults && searchResults.books.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>کتابخانه اسلامی ({toPersianDigits(searchResults.books.length)})</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.books.map(book => (
                      <div
                        key={book.id}
                        onClick={() => {
                          onClose();
                          onOpenBooksModal({
                            categoryId: book.id as Exclude<BookCategoryId, 'quran'>
                          });
                        }}
                        className="p-3 bg-amber-50 hover:bg-amber-100/80 rounded-xl border border-amber-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-amber-950">{book.title} ({book.persianTitle})</div>
                          <div className="text-[10px] text-amber-800 line-clamp-1">{book.description}</div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-amber-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Finance / Debts / Expenses Results */}
              {searchResults && (searchResults.debts.length > 0 || searchResults.expenses.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#123C35] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>تراکنش‌های مالی و بدهی‌ها</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.debts.map(d => (
                      <div
                        key={d.id}
                        onClick={() => {
                          onClose();
                          onNavigateTab('finance');
                        }}
                        className="p-3 bg-[#F7F4EC] hover:bg-[#E9E5DA] rounded-xl border border-[#D9DED9] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {d.type === 'debt' ? 'بدهی به' : 'طلب از'} {d.personName || ''}
                          </div>
                          {d.description && <div className="text-[10px] text-slate-500">{d.description}</div>}
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {toPersianDigits((d.amount || 0).toLocaleString())} تومان
                        </span>
                      </div>
                    ))}
                    {searchResults.expenses.map(exp => (
                      <div
                        key={exp.id}
                        onClick={() => {
                          onClose();
                          onNavigateTab('finance');
                        }}
                        className="p-3 bg-[#F7F4EC] hover:bg-[#E9E5DA] rounded-xl border border-[#D9DED9] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {exp.type === 'expense' ? 'هزینه:' : 'درآمد:'} {exp.category || ''}
                          </div>
                          {exp.description && <div className="text-[10px] text-slate-500">{exp.description}</div>}
                        </div>
                        <span className={`text-xs font-bold ${exp.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {exp.type === 'expense' ? '-' : '+'}{toPersianDigits((exp.amount || 0).toLocaleString())} تومان
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
