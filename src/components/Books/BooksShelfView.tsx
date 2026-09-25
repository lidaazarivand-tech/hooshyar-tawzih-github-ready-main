import React from 'react';
import { 
  BookOpen, 
  ScrollText, 
  Layers, 
  Compass, 
  Scale, 
  ChevronLeft 
} from 'lucide-react';
import { BookCategoryId } from '../../types/books';

interface BooksShelfViewProps {
  onSelectBook: (categoryId: BookCategoryId) => void;
  onClose?: () => void;
}

interface IslamicBookItem {
  id: BookCategoryId;
  title: string;
}

const ISLAMIC_BOOKS: IslamicBookItem[] = [
  { id: 'quran', title: 'قرآن کریم' },
  { id: 'nahj', title: 'نهج‌البلاغه' },
  { id: 'mafatih', title: 'مفاتیح الجنان' },
  { id: 'sahifah', title: 'صحیفه سجادیه' },
  { id: 'tawzih', title: 'توضیح المسائل' },
];

export const BooksShelfView: React.FC<BooksShelfViewProps> = ({ onSelectBook }) => {
  const getBookIcon = (id: BookCategoryId) => {
    switch (id) {
      case 'quran':
        return <BookOpen className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />;
      case 'nahj':
        return <ScrollText className="w-6 h-6 text-amber-700 dark:text-amber-400" />;
      case 'mafatih':
        return <Layers className="w-6 h-6 text-rose-700 dark:text-rose-400" />;
      case 'sahifah':
        return <Compass className="w-6 h-6 text-blue-700 dark:text-blue-400" />;
      case 'tawzih':
      case 'ahkam':
        return <Scale className="w-6 h-6 text-teal-700 dark:text-teal-400" />;
      default:
        return <BookOpen className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-3 animate-fadeIn" dir="rtl">
      {ISLAMIC_BOOKS.map((book) => (
        <button
          key={book.id}
          id={`book-shelf-item-${book.id}`}
          type="button"
          onClick={() => onSelectBook(book.id)}
          className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-200 group text-right cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {getBookIcon(book.id)}
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {book.title}
            </span>
          </div>

          <ChevronLeft className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:-translate-x-1 transition-transform" />
        </button>
      ))}
    </div>
  );
};
