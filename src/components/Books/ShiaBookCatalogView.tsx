import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  ScrollText, 
  Compass, 
  Layers,
  FileText
} from 'lucide-react';
import { 
  SHIA_BOOK_CATEGORIES, 
  SHIA_BOOKS_CONTENT,
  SAHIFAH_CATALOG_DUAS,
  SahifahCatalogEntry
} from '../../data/shiaBooksData';
import { ShiaBookItem, BookCategoryId } from '../../types/books';
import { toPersianDigits, toEnglishDigits, removePersianDiacritics } from '../../utils/persianNumber';

interface ShiaBookCatalogViewProps {
  categoryId: BookCategoryId;
  onSelectItem: (itemId: string) => void;
  onBackToShelf: () => void;
}

export const ShiaBookCatalogView: React.FC<ShiaBookCatalogViewProps> = ({
  categoryId,
  onSelectItem,
  onBackToShelf
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(40);

  const categoryMeta = SHIA_BOOK_CATEGORIES.find(c => c.id === categoryId);
  const items = SHIA_BOOKS_CONTENT[categoryId] || [];

  const subCategories = useMemo(() => {
    if (categoryId === 'sahifah') return [];
    if (categoryId === 'nahj') {
      return ['خطبه‌ها', 'نامه‌ها', 'حکمت‌ها'];
    }
    const set = new Set<string>();
    items.forEach(it => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [items, categoryId]);

  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(it => {
      if (it.category) {
        counts[it.category] = (counts[it.category] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Reset pagination on filter or category change
  useEffect(() => {
    setVisibleCount(40);
  }, [categoryId, selectedSubCategory, searchQuery]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (categoryId === 'sahifah') {
      let list = SAHIFAH_CATALOG_DUAS;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const qClean = removePersianDiacritics(q);
        const qEn = toEnglishDigits(q);
        const qFa = toPersianDigits(q);
        list = list.filter(
          d => {
            const numStr = d.num.toString();
            const item = items.find(it => it.id === d.id);
            const arClean = item ? removePersianDiacritics((item.arabicText || '').toLowerCase()) : '';
            const trClean = item ? removePersianDiacritics((item.persianTranslation || '').toLowerCase()) : '';
            return (
              numStr === qEn ||
              numStr === qFa ||
              removePersianDiacritics(d.title.toLowerCase()).includes(qClean) ||
              removePersianDiacritics(d.desc.toLowerCase()).includes(qClean) ||
              arClean.includes(qClean) ||
              trClean.includes(qClean)
            );
          }
        );
      }
      return list;
    }

    let list = items;
    if (selectedSubCategory !== 'all') {
      list = list.filter(it => it.category === selectedSubCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qClean = removePersianDiacritics(q);
      const qEn = toEnglishDigits(q);
      const qFa = toPersianDigits(q);

      list = list.filter(it => {
        const titleClean = removePersianDiacritics((it.title || '').toLowerCase());
        const descClean = removePersianDiacritics((it.description || '').toLowerCase());
        const arClean = removePersianDiacritics((it.arabicText || '').toLowerCase());
        const trClean = removePersianDiacritics((it.persianTranslation || '').toLowerCase());
        const numStr = it.num ? it.num.toString() : '';

        return (
          titleClean.includes(qClean) ||
          descClean.includes(qClean) ||
          arClean.includes(qClean) ||
          trClean.includes(qClean) ||
          (it.shortTitle && it.shortTitle.includes(q)) ||
          (numStr && (numStr === qEn || numStr === qFa || q.includes(numStr)))
        );
      });
    }
    return list;
  }, [categoryId, items, selectedSubCategory, searchQuery]);

  const getCategoryIcon = () => {
    switch (categoryId) {
      case 'nahj':
        return <ScrollText className="w-8 h-8 text-amber-200" />;
      case 'sahifah':
        return <Compass className="w-8 h-8 text-blue-200" />;
      case 'mafatih':
        return <Layers className="w-8 h-8 text-rose-200" />;
      case 'kafi':
      case 'tawzih':
      default:
        return <FileText className="w-8 h-8 text-emerald-200" />;
    }
  };

  const getBadgeStyle = (category?: string) => {
    if (!category) {
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-700';
    }
    if (category.includes('خطبه')) {
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
    }
    if (category.includes('نامه')) {
      return 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
    }
    if (category.includes('حکمت')) {
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600';
  };

  const displayedItems = filteredItems.slice(0, visibleCount);

  return (
    <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top App Bar & Navigation */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          id="btn-back-to-shelf"
          onClick={onBackToShelf}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به قفسه کتابخانه</span>
        </button>

        <div className="text-left">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {categoryMeta?.badge}
          </span>
        </div>
      </div>

      {/* Book Hero Header */}
      <div
        className={`bg-gradient-to-r ${categoryMeta?.colorClass || 'from-slate-900 to-slate-800'} p-6 rounded-3xl text-white shadow-lg relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shrink-0 border border-white/10">
            {getCategoryIcon()}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black">{categoryMeta?.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs">
                {categoryMeta?.status.label}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-200/90 leading-relaxed max-w-2xl">
              {categoryMeta?.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="font-semibold">مؤلف / منبع: {categoryMeta?.authorOrSource}</span>
              <span>•</span>
              <span>{categoryMeta?.sourceProvenance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Sub-Category Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              categoryId === 'nahj'
                ? 'جستجو در نهج‌البلاغه (شماره، عنوان، متن عربی یا ترجمه شهیدی)...'
                : categoryId === 'mafatih'
                ? 'جستجو در مفاتیح الجنان (شماره، عنوان، متن عربی یا ترجمه رسولی محلاتی)...'
                : categoryId === 'sahifah'
                ? 'جستجو در صحیفه سجادیه (شماره، عنوان، متن عربی یا ترجمه الهی قمشه‌ای)...'
                : `جستجو در ${categoryMeta?.title || 'کتاب'} (شماره، عنوان، متن یا ترجمه)...`
            }
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

        {/* Sub Categories Tabs */}
        {subCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedSubCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedSubCategory === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              همه ({toPersianDigits(items.length)})
            </button>
            {subCategories.map(sub => {
              const count = subCategoryCounts[sub] || 0;
              const isSelected = selectedSubCategory === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{sub}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}>
                    {toPersianDigits(count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>
            تعداد یافته‌ها: <strong className="text-slate-800 dark:text-slate-200 font-bold">{toPersianDigits(filteredItems.length)}</strong> بخش
          </span>
          {visibleCount < filteredItems.length && (
            <span>
              نمایش ۱ تا {toPersianDigits(Math.min(visibleCount, filteredItems.length))}
            </span>
          )}
        </div>
      </div>

      {/* Items List / Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {categoryId === 'sahifah'
          ? (displayedItems as SahifahCatalogEntry[]).map(dua => {
              const hasFullContent = items.some(it => it.id === dua.id);
              return (
                <div
                  key={dua.id}
                  id={`item-card-${dua.id}`}
                  onClick={() => onSelectItem(dua.id)}
                  className={`group bg-white dark:bg-slate-800 p-4 rounded-2xl border ${
                    hasFullContent
                      ? 'border-blue-200/90 dark:border-blue-800/60 hover:border-blue-500 dark:hover:border-blue-400'
                      : 'border-slate-200/90 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-500 opacity-90'
                  } shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between`}
                >
                  <span id={`sahifah-card-${dua.num}`} className="sr-only" aria-hidden="true" />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center transition-colors ${
                            hasFullContent
                              ? 'bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white'
                              : 'bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {toPersianDigits(dua.num)}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {dua.title}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          hasFullContent
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {hasFullContent ? 'متن کامل' : 'در فهرست'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-2 leading-relaxed">
                      {dua.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>دعای شماره {toPersianDigits(dua.num)} صحیفه</span>
                    <span
                      className={`font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1 ${
                        hasFullContent
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {hasFullContent ? 'مطالعه متن دعا ←' : 'مشاهده وضعیت ←'}
                    </span>
                  </div>
                </div>
              );
            })
          : (displayedItems as ShiaBookItem[]).map((item: ShiaBookItem) => (
              <div
                key={item.id}
                id={`item-card-${item.id}`}
                role="button"
                tabIndex={0}
                aria-label={`مطالعه ${item.title}`}
                onClick={() => onSelectItem(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectItem(item.id);
                  }
                }}
                className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${getBadgeStyle(item.category)}`}>
                      {item.category || (categoryId === 'mafatih' ? (item.num ? `بخش ${toPersianDigits(item.num)}` : 'مفاتیح الجنان') : 'بخش')}
                    </span>
                    {item.shortTitle ? (
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {item.shortTitle}
                      </span>
                    ) : item.virtueOrOccasion ? (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        فضیلت دار
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors mb-1.5 leading-snug">
                    {item.title}
                  </h3>

                  {item.description ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  ) : null}

                  {/* Short text preview */}
                  {item.arabicText && (
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-serif text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      «{item.arabicText.slice(0, 180)}»
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[210px]">
                    {!item.persianTranslation?.trim()
                      ? 'ترجمه فارسی موجود نیست'
                      : categoryId === 'nahj'
                      ? 'ترجمه استاد دکتر سید جعفر شهیدی'
                      : categoryId === 'mafatih'
                      ? 'ترجمه: سید هاشم رسولی محلاتی'
                      : (item.type ? 'ترجمه استاد دکتر سید جعفر شهیدی' : 'متن و ترجمه فارسی کامل')}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1 shrink-0">
                    مطالعه ←
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* Pagination Load More Button */}
      {visibleCount < filteredItems.length && (
        <div className="text-center pt-2 pb-2">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + 40)}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            بارگذاری ۴۰ مورد بیشتر (نمایش {toPersianDigits(Math.min(visibleCount, filteredItems.length))} از {toPersianDigits(filteredItems.length)} بخش)
          </button>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
            موردی مطابق با جستجوی شما یافت نشد
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSubCategory('all');
            }}
            className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            نمایش همه موارد
          </button>
        </div>
      )}
    </div>
  );
};
