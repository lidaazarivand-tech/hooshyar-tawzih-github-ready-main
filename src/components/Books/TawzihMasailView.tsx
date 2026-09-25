import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Bookmark,
  Copy,
  Check,
  Type,
  Sun,
  Moon,
  Scale,
  Sparkles,
  Info,
  Layers,
  FileText,
  Filter,
  X,
  ExternalLink
} from 'lucide-react';
import { TAWZIH_VOLUMES, TawzihVolumeMeta } from '../../data/shiaBooksData';
import tawzihFullItemsRaw from '../../data/tawzihMasailFullData.json';
import { TawzihMasailItem } from '../../types/books';
import { toPersianDigits, toEnglishDigits, removePersianDiacritics } from '../../utils/persianNumber';
import { getStoredShiaBookmarks, saveStoredShiaBookmarks } from '../../utils/storage';

const tawzihFullItems = tawzihFullItemsRaw as unknown as TawzihMasailItem[];

interface TawzihMasailViewProps {
  onBackToShelf: () => void;
  initialItemId?: string;
}

type ViewStep = 'volumes' | 'sections' | 'issues' | 'reader';

export const TawzihMasailView: React.FC<TawzihMasailViewProps> = ({
  onBackToShelf,
  initialItemId
}) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('volumes');
  const [selectedVolume, setSelectedVolume] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TawzihMasailItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(20);
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [copied, setCopied] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [visibleIssuesCount, setVisibleIssuesCount] = useState<number>(50);

  // Initialize with initialItemId if provided
  useEffect(() => {
    if (initialItemId) {
      const found = tawzihFullItems.find(it => it.id === initialItemId);
      if (found) {
        setSelectedVolume(found.volume);
        setSelectedSection(found.section);
        setSelectedItem(found);
        setCurrentStep('reader');
      }
    }
  }, [initialItemId]);

  // Check bookmark status
  useEffect(() => {
    if (selectedItem) {
      try {
        const bms = getStoredShiaBookmarks();
        setBookmarked(bms.includes(selectedItem.id));
      } catch {
        // ignore
      }
    }
  }, [selectedItem]);

  // Handle bookmark toggle
  const toggleBookmark = () => {
    if (!selectedItem) return;
    try {
      const bms = getStoredShiaBookmarks();
      let updated: string[];
      if (bms.includes(selectedItem.id)) {
        updated = bms.filter((id: string) => id !== selectedItem.id);
        setBookmarked(false);
      } else {
        updated = [...bms, selectedItem.id];
        setBookmarked(true);
      }
      saveStoredShiaBookmarks(updated);
    } catch {
      // ignore
    }
  };

  // Handle copy
  const handleCopy = () => {
    if (!selectedItem) return;
    const text = `«${selectedItem.title}»\n${selectedItem.volumeTitle} - ${selectedItem.section}${selectedItem.subsection ? ` / ${selectedItem.subsection}` : ''}\n\n${selectedItem.text}\n\nمنبع: ${selectedItem.sourceCitation}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sections for the selected volume
  const volumeSections = useMemo(() => {
    if (!selectedVolume) return [];
    const itemsInVol = tawzihFullItems.filter(it => it.volume === selectedVolume);
    const sectionsMap = new Map<string, { count: number; firstSub?: string }>();
    for (const it of itemsInVol) {
      const existing = sectionsMap.get(it.section);
      if (!existing) {
        sectionsMap.set(it.section, { count: 1, firstSub: it.subsection });
      } else {
        existing.count += 1;
        if (!existing.firstSub && it.subsection) {
          existing.firstSub = it.subsection;
        }
      }
    }
    return Array.from(sectionsMap.entries()).map(([name, meta]) => ({
      name,
      count: meta.count,
      firstSub: meta.firstSub
    }));
  }, [selectedVolume]);

  // Issues in the selected volume and section
  const sectionIssues = useMemo(() => {
    if (!selectedVolume || !selectedSection) return [];
    return tawzihFullItems.filter(
      it => it.volume === selectedVolume && it.section === selectedSection
    );
  }, [selectedVolume, selectedSection]);

  // Global search results across all items or current scope
  const searchResults = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return [];
    const qLower = rawQuery.toLowerCase();
    const qClean = removePersianDiacritics(qLower);
    const qEn = toEnglishDigits(rawQuery);
    const qFa = toPersianDigits(rawQuery);
    const isPureNumber = /^\d+$/.test(qEn);

    const results: TawzihMasailItem[] = [];

    for (let i = 0; i < tawzihFullItems.length; i++) {
      const it = tawzihFullItems[i];
      if (selectedVolume && it.volume !== selectedVolume && currentStep !== 'volumes') {
        continue;
      }

      const numStr = it.issueNumber ? it.issueNumber.toString() : '';

      // Fast-path exact issue number match
      if (isPureNumber && (numStr === qEn || numStr === qFa)) {
        results.push(it);
        if (results.length >= 100) break;
        continue;
      }

      // Check titles, sections, issue numbers, and texts
      if (
        (it.issueNumber && (`مسأله ${numStr}`.includes(rawQuery) || `مسئله ${numStr}`.includes(rawQuery))) ||
        it.title.toLowerCase().includes(qLower) ||
        it.section.toLowerCase().includes(qLower) ||
        (it.subsection && it.subsection.toLowerCase().includes(qLower)) ||
        it.text.toLowerCase().includes(qLower) ||
        (qClean.length >= 2 && removePersianDiacritics(it.text.toLowerCase()).includes(qClean))
      ) {
        results.push(it);
        if (results.length >= 100) break;
      }
    }

    return results;
  }, [searchQuery, selectedVolume, currentStep]);

  // Filtered issues in current section (when not searching globally)
  const filteredSectionIssues = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults.filter(it => it.section === selectedSection);
    }
    return sectionIssues;
  }, [sectionIssues, searchResults, searchQuery, selectedSection]);

  // Prev and Next items for Reader view
  const { prevItem, nextItem } = useMemo(() => {
    if (!selectedItem) return { prevItem: null, nextItem: null };
    const idx = tawzihFullItems.findIndex(it => it.id === selectedItem.id);
    return {
      prevItem: idx > 0 ? tawzihFullItems[idx - 1] : null,
      nextItem: idx >= 0 && idx < tawzihFullItems.length - 1 ? tawzihFullItems[idx + 1] : null
    };
  }, [selectedItem]);

  // Theme styling classes
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

  // STEP 4: READER VIEW
  if (currentStep === 'reader' && selectedItem) {
    return (
      <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0" dir="rtl">
        {/* Navigation Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            id="btn-back-to-issues"
            onClick={() => setCurrentStep('issues')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>فهرست مسائل</span>
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
              title="نشانه‌گذاری مسأله"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{bookmarked ? 'نشان شده' : 'نشان کردن'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
              title="کپی مسأله و منبع"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کپی شد' : 'کپی متن'}</span>
            </button>
          </div>
        </div>

        {/* Reader Header Banner */}
        <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 p-6 rounded-3xl text-white shadow-lg text-center relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-teal-300 text-xs font-bold">
                {selectedItem.volumeTitle}
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-slate-200 text-xs">
                بخش: {selectedItem.section}
              </span>
              {selectedItem.subsection && (
                <span className="px-3 py-1 bg-emerald-900/50 backdrop-blur-md rounded-full text-emerald-300 text-xs">
                  {selectedItem.subsection}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-teal-300 font-serif leading-snug">
              {selectedItem.issueNumber ? `مسأله ${toPersianDigits(selectedItem.issueNumber)}` : selectedItem.title}
            </h1>

            {selectedItem.issueNumber && selectedItem.title && !selectedItem.title.startsWith('مسأله') && (
              <p className="text-xs md:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
                {selectedItem.title}
              </p>
            )}

            <div className="inline-flex items-center gap-1.5 text-xs text-teal-200 bg-teal-900/40 border border-teal-500/30 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Scale className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span>فتاوای حضرت آیت‌الله العظمی سیستانی (چاپ ۱۴۰۳)</span>
            </div>
          </div>
        </div>

        {/* Reading Controls Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Font Size */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-xl">
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-600 dark:text-slate-300">اندازه قلم:</span>
            <button
              type="button"
              onClick={() => setFontSize(prev => Math.max(prev - 2, 16))}
              className="w-6 h-6 bg-white dark:bg-slate-800 rounded-md font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 shadow-xs"
            >
              -
            </button>
            <span className="font-mono px-1 font-bold text-teal-600">{toPersianDigits(fontSize)}</span>
            <button
              type="button"
              onClick={() => setFontSize(prev => Math.min(prev + 2, 36))}
              className="w-6 h-6 bg-white dark:bg-slate-800 rounded-md font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 shadow-xs"
            >
              +
            </button>
          </div>

          {/* Reading Themes */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setReadingTheme('light')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                readingTheme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
              title="تم روشن"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setReadingTheme('sepia')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                readingTheme === 'sepia' ? 'bg-[#f4ebd9] text-[#5c4a30] shadow-sm' : 'text-slate-500'
              }`}
              title="تم کاغذ کهن"
            >
              کاغذ
            </button>
            <button
              type="button"
              onClick={() => setReadingTheme('dark')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                readingTheme === 'dark' ? 'bg-slate-900 text-teal-300 shadow-sm' : 'text-slate-500'
              }`}
              title="تم تیره"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Ruling Canvas */}
        <div className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all duration-300 space-y-6 ${getThemeClasses()}`}>
          <div className={`p-5 md:p-6 rounded-2xl border ${getCardThemeClasses()} space-y-4`}>
            <div className="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-400 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>متن حکم شرعی و فتوا</span>
              </span>
              <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            </div>

            <p
              className="text-right leading-[2.4] font-medium select-text whitespace-pre-line text-slate-900 dark:text-slate-100"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: 'IRANSansX, Vazirmatn, system-ui, sans-serif'
              }}
            >
              {selectedItem.text}
            </p>
          </div>

          {/* Footnotes Box if present */}
          {selectedItem.footnote && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span>پاورقی‌ها و توضیحات:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line select-text">
                {selectedItem.footnote}
              </p>
            </div>
          )}

          {/* Authoritative Source Citation & Official Link Box */}
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-300">
                <Info className="w-4 h-4 text-teal-600 shrink-0" />
                <span>سند و منبع رسمی فتوا:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedItem.sourceCitation}
              </p>
            </div>
            {selectedItem.sourceUrl && (
              <a
                href={selectedItem.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600/10 hover:bg-teal-600/20 text-teal-800 dark:text-teal-300 font-bold transition-colors shrink-0 text-xs"
              >
                <span>مشاهده در پایگاه رسمی sistani.org</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Previous / Next Issue Navigation */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3">
          {prevItem ? (
            <button
              type="button"
              onClick={() => {
                setSelectedItem(prevItem);
                setSelectedVolume(prevItem.volume);
                setSelectedSection(prevItem.section);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 font-bold text-xs transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              <span>
                {prevItem.issueNumber ? `مسأله قبلی (${toPersianDigits(prevItem.issueNumber)})` : 'بخش قبلی'}
              </span>
            </button>
          ) : (
            <div />
          )}

          {nextItem ? (
            <button
              type="button"
              onClick={() => {
                setSelectedItem(nextItem);
                setSelectedVolume(nextItem.volume);
                setSelectedSection(nextItem.section);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 font-bold text-xs transition-colors"
            >
              <span>
                {nextItem.issueNumber ? `مسأله بعدی (${toPersianDigits(nextItem.issueNumber)})` : 'بخش بعدی'}
              </span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    );
  }

  // STEP 3: ISSUES LIST FOR SELECTED SECTION
  if (currentStep === 'issues' && selectedVolume && selectedSection) {
    const displayedIssues = filteredSectionIssues.slice(0, visibleIssuesCount);

    return (
      <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0" dir="rtl">
        {/* Navigation Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            id="btn-back-to-sections"
            onClick={() => {
              setSearchQuery('');
              setCurrentStep('sections');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>فهرست بخش‌ها</span>
          </button>

          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
            {toPersianDigits(filteredSectionIssues.length)} مسأله
          </span>
        </div>

        {/* Section Header */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold">
            <span>جلد {toPersianDigits(selectedVolume)}</span>
            <span>•</span>
            <span>بخش {selectedSection}</span>
          </div>
          <h2 className="text-lg font-bold text-white">فهرست مسائل و احکام</h2>
        </div>

        {/* Search inside Section */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس شماره مسأله (مثلاً ۲۷) یا متن احکام..."
            className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Issues List */}
        <div className="space-y-2">
          {displayedIssues.length > 0 ? (
            displayedIssues.map((issue) => (
              <button
                key={issue.id}
                id={`issue-card-${issue.id}`}
                type="button"
                onClick={() => {
                  setSelectedItem(issue);
                  setCurrentStep('reader');
                }}
                className="w-full text-right p-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 font-bold text-xs border border-teal-300 dark:border-teal-700">
                      {issue.issueNumber ? `مسأله ${toPersianDigits(issue.issueNumber)}` : 'مقدمه / عنوان'}
                    </span>
                    {issue.subsection && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {issue.subsection}
                      </span>
                    )}
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {issue.text}
                </p>
              </button>
            ))
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              موردی مطابق با عبارت جستجو شده یافت نشد.
            </div>
          )}

          {/* Load More Button */}
          {filteredSectionIssues.length > visibleIssuesCount && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleIssuesCount(prev => prev + 50)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-xs font-bold transition-all"
              >
                بارگذاری مسائل بیشتر ({toPersianDigits(filteredSectionIssues.length - visibleIssuesCount)} مسأله باقی‌مانده)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: SECTIONS LIST FOR SELECTED VOLUME
  if (currentStep === 'sections' && selectedVolume) {
    const volMeta = TAWZIH_VOLUMES.find(v => v.volume === selectedVolume);

    // If searching globally while in sections view
    const showSearchResults = searchQuery.trim().length > 0;

    return (
      <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0" dir="rtl">
        {/* Navigation Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            id="btn-back-to-volumes"
            onClick={() => {
              setSearchQuery('');
              setSelectedVolume(null);
              setCurrentStep('volumes');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>انتخاب جلد</span>
          </button>

          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
            {volMeta?.title}
          </span>
        </div>

        {/* Volume Header Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 text-white shadow-md space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-teal-500/20 rounded-full text-teal-300 text-xs font-bold">
            <span>جلد {toPersianDigits(selectedVolume)} از ۴ جلد</span>
            <span>•</span>
            <span>{toPersianDigits(volMeta?.totalIssues || 0)} مسأله فقهی</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white">
            {volMeta?.title}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {volMeta?.description}
          </p>
        </div>

        {/* Search within selected rulings */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`جستجو در جلد ${toPersianDigits(selectedVolume)} بر اساس مسأله یا موضوع...`}
            className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sections Grid or Search Results */}
        {showSearchResults ? (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 px-1">
              نتایج جستجو در جلد {toPersianDigits(selectedVolume)}: ({toPersianDigits(searchResults.length)} مورد)
            </div>
            {searchResults.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  setSelectedSection(it.section);
                  setSelectedItem(it);
                  setCurrentStep('reader');
                }}
                className="w-full text-right p-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 font-bold text-xs">
                      {it.issueNumber ? `مسأله ${toPersianDigits(it.issueNumber)}` : 'مقدمه'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      بخش: {it.section}
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {it.text}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {volumeSections.map((sec) => (
              <button
                key={sec.name}
                id={`section-card-${sec.name}`}
                type="button"
                onClick={() => {
                  setSelectedSection(sec.name);
                  setVisibleIssuesCount(50);
                  setCurrentStep('issues');
                }}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all group text-right cursor-pointer"
              >
                <div className="space-y-1 pr-1">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors block">
                    {sec.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{toPersianDigits(sec.count)} مسأله</span>
                    {sec.firstSub && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{sec.firstSub}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-1 transition-transform shrink-0 mr-2" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // STEP 1: VOLUMES SELECTION (DEFAULT)
  const isGlobalSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0" dir="rtl">
      {/* Top Header & Navigation */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          id="btn-back-to-shelf"
          onClick={onBackToShelf}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>قفسه کتاب‌ها</span>
        </button>

        <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
          توضیح المسائل جامع (۴ جلد)
        </span>
      </div>

      {/* Main Title Hero Banner */}
      <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 p-6 md:p-8 rounded-3xl text-white shadow-lg text-center relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-teal-300 text-xs font-bold">
            <Scale className="w-3.5 h-3.5" />
            <span>رساله فقهی جامع • مطابق فتاوای آیت‌الله العظمی سیستانی</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-teal-300 font-serif leading-snug">
            توضیح المسائل جامع
          </h1>

          <p className="text-xs md:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            متن کامل هر چهار جلد توضیح المسائل جامع (چاپ ۱۴۰۳) شامل ۷٬۲۴۲ مدخل و مسأله فقهی با استناد رسمی
          </p>

          <div className="inline-flex items-center gap-2 text-xs text-teal-200 bg-teal-900/50 border border-teal-500/30 px-3 py-1.5 rounded-xl backdrop-blur-sm">
            <span>دوره کامل ۴ جلد</span>
            <span>•</span>
            <span>{toPersianDigits(tawzihFullItems.length)} مدخل و مسأله فقهی</span>
          </div>
        </div>
      </div>

      {/* Global Search across 4 volumes */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`جستجو بر اساس شماره مسأله (مثلاً ۱ یا ۲۷) یا عبارت فقهی در بین ${toPersianDigits(tawzihFullItems.length)} مسأله...`}
          className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* If Searching, show search results */}
      {isGlobalSearching ? (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 px-1">
            نتایج جستجو در مسائل نمایه‌شده چهار جلد: ({toPersianDigits(searchResults.length)} مورد)
          </div>
          {searchResults.length > 0 ? (
            searchResults.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  setSelectedVolume(it.volume);
                  setSelectedSection(it.section);
                  setSelectedItem(it);
                  setCurrentStep('reader');
                }}
                className="w-full text-right p-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 font-bold text-xs">
                      {it.issueNumber ? `مسأله ${toPersianDigits(it.issueNumber)}` : 'مقدمه'}
                    </span>
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                      جلد {toPersianDigits(it.volume)}: {it.section}
                    </span>
                    {it.subsection && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        ({it.subsection})
                      </span>
                    )}
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {it.text}
                </p>
              </button>
            ))
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              در بین مسائل نمایه‌شده موردی مطابق عبارت جستجو یافت نشد.
            </div>
          )}
        </div>
      ) : (
        /* 4 Volume Cards */
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
            انتخاب جلد کتاب:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TAWZIH_VOLUMES.map((vol) => (
              <button
                key={vol.volume}
                id={`btn-select-volume-${vol.volume}`}
                type="button"
                onClick={() => {
                  setSelectedVolume(vol.volume);
                  setSelectedSection(null);
                  setSearchQuery('');
                  setCurrentStep('sections');
                }}
                className="w-full text-right p-5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-extrabold text-xs border border-teal-200 dark:border-teal-800">
                      جلد {toPersianDigits(vol.volume)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {toPersianDigits(vol.totalIssues)} مسأله فقهی
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {vol.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {vol.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-400">
                  <span>مشاهده ابواب و احکام نمایه‌شده</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
