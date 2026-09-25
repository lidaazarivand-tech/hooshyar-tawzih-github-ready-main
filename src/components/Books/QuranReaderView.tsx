import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Play,
  Pause,
  Square,
  Volume2,
  Bookmark,
  Copy,
  Check,
  Type,
  Sun,
  Moon,
  Eye,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { QuranSurahDetail, Ayah } from '../../types/books';
import { fetchSurahFullData } from '../../services/quranService';
import { SURAH_LIST } from '../../data/quranSurahs';
import { getStoredQuranBookmarks, saveStoredQuranBookmarks } from '../../utils/storage';
import { toPersianDigits } from '../../utils/persianNumber';

interface QuranReaderViewProps {
  surahNumber: number;
  onBackToCatalog: () => void;
  onBackToShelf?: () => void;
  onSelectSurah: (num: number) => void;
}

interface ReciterOption {
  id: string;
  name: string;
  getUrl: (surahNum: number) => string;
  fallbackUrl?: (surahNum: number) => string;
}

const pad3 = (n: number) => String(n).padStart(3, '0');

const RECITERS: ReciterOption[] = [
  {
    id: 'ar.alafasy',
    name: 'استاد مشاری العفاسی',
    getUrl: (s) => `https://server8.mp3quran.net/afs/${pad3(s)}.mp3`,
    fallbackUrl: (s) => `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${s}.mp3`
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'استاد عبدالباسط عبدالصمد',
    getUrl: (s) => `https://server7.mp3quran.net/basit/${pad3(s)}.mp3`,
    fallbackUrl: (s) => `https://cdn.islamic.network/quran/audio-surah/128/ar.abdulbasitmurattal/${s}.mp3`
  },
  {
    id: 'ar.minshawi',
    name: 'استاد محمد صدیق منشاوی',
    getUrl: (s) => `https://server10.mp3quran.net/minsh/${pad3(s)}.mp3`
  },
  {
    id: 'ar.husary',
    name: 'استاد محمود خلیل الحصری',
    getUrl: (s) => `https://server13.mp3quran.net/husr/${pad3(s)}.mp3`
  },
  {
    id: 'ar.ghamdi',
    name: 'استاد سعد الغامدی',
    getUrl: (s) => `https://server7.mp3quran.net/s_gmd/${pad3(s)}.mp3`
  },
  {
    id: 'ar.sudais',
    name: 'استاد عبدالرحمن السدیس',
    getUrl: (s) => `https://server11.mp3quran.net/sds/${pad3(s)}.mp3`
  },
  {
    id: 'ar.ajmy',
    name: 'استاد احمد العجمی',
    getUrl: (s) => `https://server10.mp3quran.net/ajm/${pad3(s)}.mp3`
  }
];

export const QuranReaderView: React.FC<QuranReaderViewProps> = ({
  surahNumber,
  onBackToCatalog,
  onBackToShelf,
  onSelectSurah
}) => {
  const [surahData, setSurahData] = useState<QuranSurahDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(24);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [fontFamily, setFontFamily] = useState<'uthmanic' | 'standard'>('uthmanic');
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);

  // Audio player state
  const [selectedReciter, setSelectedReciter] = useState<string>('ar.alafasy');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFallbackUsedRef = useRef<boolean>(false);
  const playTokenRef = useRef<number>(0);
  const isPlaybackCancelledRef = useRef<boolean>(false);

  // Helper to format mm:ss in Persian
  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '۰۰:۰۰';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return toPersianDigits(str);
  };

  // Stop and release audio completely
  const stopAudio = () => {
    playTokenRef.current++;
    isPlaybackCancelledRef.current = true;
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.onplay = null;
      audio.onpause = null;
      audio.onwaiting = null;
      audio.onplaying = null;
      audio.oncanplay = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {
        // ignore
      }
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setIsLoadingAudio(false);
    setAudioProgress(0);
  };

  // Full cleanup on unmount or when surah changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setAudioError(null);
    stopAudio();

    fetchSurahFullData(surahNumber).then(data => {
      if (isMounted) {
        setSurahData(data);
        setIsLoading(false);
      }
    });

    // Check bookmark
    try {
      const bms = getStoredQuranBookmarks();
      setBookmarked(bms.includes(surahNumber));
    } catch (e) {
      // ignore
    }

    return () => {
      isMounted = false;
      stopAudio();
    };
  }, [surahNumber]);

  // Pause on visibility change / tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlayingAudio(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopAudio);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopAudio);
    };
  }, []);

  const getActiveReciter = () => {
    return RECITERS.find(r => r.id === selectedReciter) || RECITERS[0];
  };

  // Initialize or get Audio instance
  const getOrCreateAudio = () => {
    const reciter = getActiveReciter();
    const primaryUrl = reciter.getUrl(surahNumber);

    if (!audioRef.current) {
      const audio = new Audio(primaryUrl);
      audio.preload = 'metadata';

      audio.onplay = () => {
        setIsPlayingAudio(true);
        setIsLoadingAudio(false);
      };

      audio.onpause = () => {
        setIsPlayingAudio(false);
      };

      audio.onwaiting = () => {
        setIsLoadingAudio(true);
      };

      audio.onplaying = () => {
        setIsLoadingAudio(false);
        setIsPlayingAudio(true);
      };

      audio.oncanplay = () => {
        setIsLoadingAudio(false);
      };

      audio.ontimeupdate = () => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
          if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setAudioDuration(audioRef.current.duration);
          }
        }
      };

      audio.onloadedmetadata = () => {
        if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
          setAudioDuration(audioRef.current.duration);
        }
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setIsLoadingAudio(false);
        setAudioProgress(0);
      };

      audio.onerror = () => {
        console.warn('Audio primary error, trying fallback if available');
        if (!isFallbackUsedRef.current && reciter.fallbackUrl) {
          isFallbackUsedRef.current = true;
          audio.src = reciter.fallbackUrl(surahNumber);
          audio.play().catch(() => {
            setIsPlayingAudio(false);
            setIsLoadingAudio(false);
            setAudioError('پخش صوت ترتیل با اینترنت برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.');
          });
        } else {
          setIsPlayingAudio(false);
          setIsLoadingAudio(false);
          setAudioError('پخش صوت ترتیل با خطا مواجه شد. لطفاً قاری دیگری را انتخاب کنید یا اتصال اینترنت را بررسی فرمایید.');
        }
      };

      audioRef.current = audio;
      isFallbackUsedRef.current = false;
    }

    return audioRef.current;
  };

  // Toggle Play / Pause
  const togglePlayAudio = () => {
    setAudioError(null);

    // Immediate check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAudioError('پخش صوت نیازمند اتصال اینترنت است. متن و ترجمه سوره کاملاً آفلاین در دسترس هستند.');
      return;
    }

    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    const currentToken = ++playTokenRef.current;
    isPlaybackCancelledRef.current = false;
    setIsLoadingAudio(true);

    const reciter = getActiveReciter();
    const targetUrl = isFallbackUsedRef.current && reciter.fallbackUrl 
      ? reciter.fallbackUrl(surahNumber) 
      : reciter.getUrl(surahNumber);

    const audio = getOrCreateAudio();
    if (!audio.src || !audio.src.includes('.mp3')) {
      audio.src = targetUrl;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) {
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch (e) {}
            return;
          }
          setIsPlayingAudio(true);
          setIsLoadingAudio(false);
        })
        .catch(err => {
          if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) {
            return;
          }
          console.warn('Audio play error:', err);
          setIsPlayingAudio(false);
          setIsLoadingAudio(false);

          if (reciter.fallbackUrl && !isFallbackUsedRef.current) {
            isFallbackUsedRef.current = true;
            if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) return;
            audio.src = reciter.fallbackUrl(surahNumber);
            const fallbackPromise = audio.play();
            if (fallbackPromise !== undefined) {
              fallbackPromise
                .then(() => {
                  if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) {
                    try {
                      audio.pause();
                      audio.currentTime = 0;
                    } catch (e) {}
                    return;
                  }
                  setIsPlayingAudio(true);
                  setIsLoadingAudio(false);
                })
                .catch(() => {
                  if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) return;
                  setAudioError('برای تلاوت صوتی به اینترنت نیاز است. متن و ترجمه سوره کاملاً آفلاین در دسترس است.');
                });
            }
          } else {
            setAudioError('پخش صوت نیازمند اتصال اینترنت است. تمام متون و ترجمه‌ها آفلاین هستند.');
          }
        });
    }
  };

  // Handle Seek in Audio
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setAudioProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleReciterChange = (reciterId: string) => {
    setSelectedReciter(reciterId);
    setAudioError(null);
    const wasPlaying = isPlayingAudio;
    stopAudio();

    if (wasPlaying) {
      const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
      const currentToken = ++playTokenRef.current;
      isPlaybackCancelledRef.current = false;
      setIsLoadingAudio(true);

      const audio = getOrCreateAudio();
      audio.src = reciter.getUrl(surahNumber);
      audio.play()
        .then(() => {
          if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) {
            try {
              audio.pause();
            } catch (e) {}
            return;
          }
          setIsPlayingAudio(true);
          setIsLoadingAudio(false);
        })
        .catch(() => {
          if (playTokenRef.current !== currentToken || isPlaybackCancelledRef.current) return;
          setIsPlayingAudio(false);
          setIsLoadingAudio(false);
        });
    }
  };

  const toggleBookmark = () => {
    try {
      const bms = getStoredQuranBookmarks();
      let updated: number[];
      if (bms.includes(surahNumber)) {
        updated = bms.filter((n: number) => n !== surahNumber);
        setBookmarked(false);
      } else {
        updated = [...bms, surahNumber];
        setBookmarked(true);
      }
      saveStoredQuranBookmarks(updated);
    } catch (e) {
      // ignore
    }
  };

  const handleCopyAyah = (ayah: Ayah) => {
    const text = `«${ayah.text}»\n(${surahData?.name}، آیه ${ayah.numberInSurah})\nترجمه: ${ayah.translation}`;
    navigator.clipboard.writeText(text);
    setCopiedAyah(ayah.numberInSurah);
    setTimeout(() => setCopiedAyah(null), 2000);
  };

  const handleCopyAllSurah = () => {
    if (!surahData) return;
    const text = `سوره مبارکه ${surahData.name} (${surahData.persianName})\n\n` +
      surahData.ayahs.map(a => `(${a.numberInSurah}) ${a.text}\n${a.translation}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const summary = SURAH_LIST.find(s => s.number === surahNumber);

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

  return (
    <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top App Bar & Navigation */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBackToShelf && (
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onBackToShelf();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
            >
              <span>قفسه کتابخانه</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopAudio();
              onBackToCatalog();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>فهرست سوره‌ها</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBookmark}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              bookmarked
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-amber-50'
            }`}
            title="نشانه‌گذاری سوره"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{bookmarked ? 'نشانه‌گذاری شده' : 'نشان کردن'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAllSurah}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
            title="کپی متن کامل سوره"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? 'کپی شد' : 'کپی سوره'}</span>
          </button>
        </div>
      </div>

      {/* Surah Header Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 p-6 rounded-3xl text-white shadow-lg text-center relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-emerald-200 text-xs font-bold">
            <span>سوره شماره {surahNumber}</span>
            <span>•</span>
            <span>جزء {summary?.juz || surahData?.juz}</span>
            <span>•</span>
            <span>{summary?.revelationType || surahData?.revelationType}</span>
            <span>•</span>
            <span>{summary?.numberOfAyahs || surahData?.numberOfAyahs} آیه</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-amber-300 font-serif">
            سُورَةُ {surahData?.name || summary?.name}
          </h1>
          <p className="text-sm font-medium text-emerald-100">
            {surahData?.persianName || summary?.persianName}
          </p>

          {summary?.virtue && (
            <p className="text-xs text-emerald-200/90 max-w-xl mx-auto pt-1 leading-relaxed bg-black/20 p-2.5 rounded-2xl backdrop-blur-sm">
              <span className="text-amber-300 font-bold">فضیلت: </span>
              {summary.virtue}
            </p>
          )}
        </div>
      </div>

      {/* Controls & Reader Preferences Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        {/* Recitation Audio Player Bar */}
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Play, Stop & Status */}
            <div className="flex items-center gap-3">
              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-11 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                title={isPlayingAudio ? 'توقف موقت (Pause)' : 'پخش صوت تلاوت (Play)'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlayingAudio ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Stop Button */}
              <button
                type="button"
                onClick={stopAudio}
                disabled={!isPlayingAudio && audioProgress === 0}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs"
                title="توقف کامل صوت (Stop)"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تلاوت صوتی سوره</span>
                  {isLoadingAudio && (
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded-md font-normal animate-pulse">
                      در حال بارگذاری...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {isPlayingAudio ? 'در حال پخش ترتیل صوتی آنلاین...' : 'پخش ترتیل صوتی آنلاین کل سوره (متن و ترجمه آفلاین است)'}
                </p>
              </div>
            </div>

            {/* Reciter Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">قاری:</label>
              <select
                value={selectedReciter}
                onChange={e => handleReciterChange(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              >
                {RECITERS.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio Scrubber & Time */}
          {(audioDuration > 0 || isPlayingAudio || audioProgress > 0) && (
            <div className="flex items-center gap-3 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                {formatAudioTime(audioProgress)}
              </span>
              <input
                type="range"
                min="0"
                max={audioDuration || 100}
                step="0.5"
                value={audioProgress}
                onChange={handleSeek}
                className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-emerald-200 dark:bg-emerald-900 rounded-lg"
              />
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                {formatAudioTime(audioDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Audio Error Alert if any */}
        {audioError && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            {audioError}
          </div>
        )}

        {/* Display Adjustments: Font, Size, Theme, Translation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
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
            <span className="font-mono px-1 font-bold text-emerald-600">{fontSize}</span>
            <button
              onClick={() => setFontSize(prev => Math.min(prev + 2, 42))}
              className="w-6 h-6 bg-white dark:bg-slate-800 rounded-md font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 shadow-xs"
            >
              +
            </button>
          </div>

          {/* Translation Toggle */}
          <button
            type="button"
            onClick={() => setShowTranslation(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              showTranslation
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ترجمه فارسی روان {showTranslation ? '✓' : ''}</span>
          </button>

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
      </div>

      {/* Main Reading Canvas */}
      <div className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all duration-300 ${getThemeClasses()}`}>
        {/* Al-Fatihah already includes Bismillah as ayah 1; At-Tawbah has no header. */}
        {surahNumber !== 1 && surahNumber !== 9 && (
          <div className="text-center my-6 py-4 border-b border-emerald-500/20">
            <p
              className="font-serif text-2xl md:text-3xl text-emerald-800 dark:text-emerald-300 font-extrabold tracking-wide"
              style={{ fontFamily: 'Amiri, Lateef, serif' }}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              به نام خداوند بخشنده مهربان
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              در حال بارگذاری متن شریف و اعراب‌گذاری آیات...
            </p>
          </div>
        ) : (
          /* Ayahs List */
          <div className="space-y-6">
            {surahData?.ayahs && surahData.ayahs.length > 0 ? (
              surahData.ayahs.map(ayah => (
                <div
                  key={ayah.numberInSurah}
                  id={`ayah-${ayah.numberInSurah}`}
                  className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 ${getCardThemeClasses()}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Verse Number Label & Circle Badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {ayah.numberInSurah}
                      </div>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                        آیه {toPersianDigits(ayah.numberInSurah)}
                      </span>
                    </div>

                    {/* Copy Ayah */}
                    <button
                      type="button"
                      onClick={() => handleCopyAyah(ayah)}
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-md transition-colors"
                      title="کپی آیه و ترجمه"
                    >
                      {copiedAyah === ayah.numberInSurah ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Arabic Quranic Text */}
                  <p
                    lang="ar"
                    dir="rtl"
                    className="text-right leading-[2.2] font-serif font-medium text-slate-900 dark:text-slate-50 select-text"
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: 'Amiri, Scheherazade New, serif'
                    }}
                  >
                    {ayah.text}{' '}
                    <span className="inline-block mx-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold">
                      ۝ {ayah.numberInSurah}
                    </span>
                  </p>

                  {/* Persian Translation */}
                  {showTranslation && ayah.translation && (
                    <div lang="fa" dir="rtl" className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 ml-1">
                        ترجمه:
                      </span>
                      {ayah.translation}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                  متن این سوره به زودی به صورت آفلاین نیز تکمیل می‌شود.
                </p>
                <p className="text-xs text-slate-500">
                  در صورت اتصال به اینترنت، آیات کامل به صورت خودکار بارگذاری و ذخیره می‌گردند.
                </p>
              </div>
            )}
            {/* Source & Attribution Footer */}
            <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                <div className="text-right space-y-0.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    متن عربی قرآن کریم: منبع Tanzil.net (رسم‌الخط عثمانی، نسخه ۱.۱)
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    مجوز متن عربی: Creative Commons Attribution 3.0
                  </p>
                </div>
                <div className="text-right sm:text-left space-y-0.5 border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pr-4">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    ترجمه فارسی: حجت‌الاسلام محسن قرائتی
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    منبع ارائه: Tanzil.net • استفاده از ترجمه تابع شرایط و مجوز مربوط به ترجمه است.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer: Prev Surah, Back to Catalog, Next Surah */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3">
        {surahNumber > 1 ? (
          <button
            type="button"
            onClick={() => {
              stopAudio();
              onSelectSurah(surahNumber - 1);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            <span>سوره قبلی ({surahNumber - 1})</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {onBackToShelf && (
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onBackToShelf();
              }}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              قفسه کتابخانه
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopAudio();
              onBackToCatalog();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            فهرست سوره‌ها
          </button>
        </div>

        {surahNumber < 114 ? (
          <button
            type="button"
            onClick={() => {
              stopAudio();
              onSelectSurah(surahNumber + 1);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <span>سوره بعدی ({surahNumber + 1})</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
