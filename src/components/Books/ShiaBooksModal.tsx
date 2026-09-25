import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen } from 'lucide-react';
import { BooksShelfView } from './BooksShelfView';
import { BookStageOneView } from './BookStageOneView';
import { QuranCatalogView } from './QuranCatalogView';
import { QuranReaderView } from './QuranReaderView';
import { ShiaBookCatalogView } from './ShiaBookCatalogView';
import { ShiaItemReaderView } from './ShiaItemReaderView';
import { TawzihMasailView } from './TawzihMasailView';
import { BookCategoryId } from '../../types/books';

export interface ShiaBooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategoryId?: BookCategoryId;
  initialSurahNumber?: number;
  currentLevel?: 'shelf' | 'catalog' | 'reader';
  onLevelChange?: (level: 'shelf' | 'catalog' | 'reader') => void;
}

type ViewLevel = 'shelf' | 'catalog' | 'reader';

export const ShiaBooksModal: React.FC<ShiaBooksModalProps> = ({
  isOpen,
  onClose,
  initialCategoryId = 'quran',
  initialSurahNumber,
  currentLevel,
  onLevelChange
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [internalViewLevel, setInternalViewLevel] = useState<ViewLevel>(currentLevel ?? 'shelf');

  useEffect(() => {
    if (currentLevel !== undefined) {
      setInternalViewLevel(currentLevel);
    }
  }, [currentLevel]);

  const viewLevel = internalViewLevel;
  
  const updateLevel = (newLevel: ViewLevel) => {
    setInternalViewLevel(newLevel);
    onLevelChange?.(newLevel);
  };

  const [selectedCategory, setSelectedCategory] = useState<BookCategoryId>(initialCategoryId);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedNahjItemId, setSelectedNahjItemId] = useState<string>('nahj_sermon_1');
  const [selectedMafatihItemId, setSelectedMafatihItemId] = useState<string>('mafatih_item_1');
  const [selectedSahifahItemId, setSelectedSahifahItemId] = useState<string>('sahifah_1');

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategory(initialCategoryId);
    }
    if (initialSurahNumber) {
      setSelectedSurah(initialSurahNumber);
    }
  }, [initialCategoryId, initialSurahNumber]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (viewLevel === 'reader') {
          updateLevel('catalog');
        } else if (viewLevel === 'catalog') {
          updateLevel('shelf');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, viewLevel, onClose]);

  // Reset when opening / closing
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      document.body.style.overflow = 'hidden';
      if (currentLevel !== undefined) {
        setInternalViewLevel(currentLevel);
      } else {
        setInternalViewLevel('shelf');
      }
    } else {
      document.body.style.overflow = 'unset';
      setInternalViewLevel('shelf');
      onLevelChange?.('shelf');
      setSelectedCategory(initialCategoryId);
      setSelectedSurah(initialSurahNumber || 1);
      previouslyFocusedRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialCategoryId, initialSurahNumber]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => dialogRef.current?.focus());
  }, [isOpen]);

  if (!isOpen) return null;

  // Actions
  const handleSelectBook = (categoryId: BookCategoryId) => {
    setSelectedCategory(categoryId);
    updateLevel('catalog');
  };

  const handleBackToShelf = () => {
    updateLevel('shelf');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      dir="rtl"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="books-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-5xl h-[92vh] bg-slate-100 dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden min-w-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Global Header Bar */}
        <div className="px-5 py-3.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="books-modal-title" className="text-sm md:text-base font-extrabold text-slate-800 dark:text-white">
                کتابخانه اسلامی
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                قرآن کریم • نهج‌البلاغه • مفاتیح الجنان • صحیفه سجادیه • توضیح المسائل
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-books-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            title="بستن کتابخانه"
            aria-label="بستن کتابخانه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 scrollbar-thin w-full max-w-full min-w-0">
          {viewLevel === 'shelf' ? (
            <BooksShelfView
              onSelectBook={handleSelectBook}
              onClose={onClose}
            />
          ) : selectedCategory === 'quran' ? (
            viewLevel === 'reader' ? (
              <QuranReaderView
                surahNumber={selectedSurah}
                onBackToCatalog={() => updateLevel('catalog')}
                onBackToShelf={handleBackToShelf}
                onSelectSurah={(num) => setSelectedSurah(num)}
              />
            ) : (
              <QuranCatalogView
                onSelectSurah={(surahNum) => {
                  setSelectedSurah(surahNum);
                  updateLevel('reader');
                }}
                onBackToShelf={handleBackToShelf}
              />
            )
          ) : selectedCategory === 'nahj' ? (
            viewLevel === 'reader' ? (
              <ShiaItemReaderView
                categoryId="nahj"
                itemId={selectedNahjItemId}
                onBackToCatalog={() => updateLevel('catalog')}
                onSelectItem={(id) => setSelectedNahjItemId(id)}
              />
            ) : (
              <ShiaBookCatalogView
                categoryId="nahj"
                onSelectItem={(itemId) => {
                  setSelectedNahjItemId(itemId);
                  updateLevel('reader');
                }}
                onBackToShelf={handleBackToShelf}
              />
            )
          ) : selectedCategory === 'mafatih' ? (
            viewLevel === 'reader' ? (
              <ShiaItemReaderView
                categoryId="mafatih"
                itemId={selectedMafatihItemId}
                onBackToCatalog={() => updateLevel('catalog')}
                onSelectItem={(id) => setSelectedMafatihItemId(id)}
              />
            ) : (
              <ShiaBookCatalogView
                categoryId="mafatih"
                onSelectItem={(itemId) => {
                  setSelectedMafatihItemId(itemId);
                  updateLevel('reader');
                }}
                onBackToShelf={handleBackToShelf}
              />
            )
          ) : selectedCategory === 'sahifah' ? (
            viewLevel === 'reader' ? (
              <ShiaItemReaderView
                categoryId="sahifah"
                itemId={selectedSahifahItemId}
                onBackToCatalog={() => updateLevel('catalog')}
                onSelectItem={(id) => setSelectedSahifahItemId(id)}
              />
            ) : (
              <ShiaBookCatalogView
                categoryId="sahifah"
                onSelectItem={(itemId) => {
                  setSelectedSahifahItemId(itemId);
                  updateLevel('reader');
                }}
                onBackToShelf={handleBackToShelf}
              />
            )
          ) : selectedCategory === 'tawzih' ? (
            <TawzihMasailView
              onBackToShelf={handleBackToShelf}
            />
          ) : (
            <BookStageOneView
              bookId={selectedCategory}
              onBackToShelf={handleBackToShelf}
            />
          )}
        </div>
      </div>
    </div>
  );
};
