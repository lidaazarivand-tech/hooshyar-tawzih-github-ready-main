import { QuranSurahDetail } from '../types/books';
import { SURAH_LIST } from '../data/quranSurahs';
import { QURAN_FULL_SURAHS } from '../data/quranSurahDetails';

let fullQuranCache: Record<string, QuranSurahDetail> | null = null;

async function getFullQuranMap(): Promise<Record<string, QuranSurahDetail>> {
  if (fullQuranCache) return fullQuranCache;
  try {
    const response = await fetch('/data/quranFullData.json', {
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`Quran data request failed: ${response.status}`);
    fullQuranCache = await response.json() as Record<string, QuranSurahDetail>;
  } catch (e) {
    console.warn('Could not load cached Quran data artifact:', e);
    try {
      const rawModule = await import('../data/quranFullData.json');
      fullQuranCache = (rawModule.default || rawModule) as unknown as Record<string, QuranSurahDetail>;
    } catch (fallbackError) {
      console.warn('Could not load bundled Quran fallback:', fallbackError);
      return {};
    }
  }
  return fullQuranCache;
}

export async function fetchSurahFullData(surahNumber: number): Promise<QuranSurahDetail> {
  const summary = SURAH_LIST.find(s => s.number === surahNumber);
  
  // 1. Check complete 114-surah offline database (dynamically loaded local asset)
  const fullQuranMap = await getFullQuranMap();
  const fullOfflineSurah = fullQuranMap[surahNumber.toString()];
  if (fullOfflineSurah && fullOfflineSurah.ayahs && fullOfflineSurah.ayahs.length > 0) {
    return {
      ...fullOfflineSurah,
      name: summary?.name || fullOfflineSurah.name,
      englishName: summary?.englishName || fullOfflineSurah.englishName,
      persianName: summary?.persianName || '',
      numberOfAyahs: summary?.numberOfAyahs || fullOfflineSurah.numberOfAyahs,
      revelationType: summary?.revelationType || fullOfflineSurah.revelationType,
      juz: summary?.juz || fullOfflineSurah.juz,
      virtue: summary?.virtue || '',
      theme: summary?.theme || '',
      bismillah: surahNumber !== 9
    };
  }

  // 2. Check in-memory preloaded data
  if (QURAN_FULL_SURAHS[surahNumber]) {
    return QURAN_FULL_SURAHS[surahNumber];
  }

  // Fallback default
  return {
    number: surahNumber,
    name: summary?.name || '',
    englishName: summary?.englishName || '',
    persianName: summary?.persianName || '',
    numberOfAyahs: summary?.numberOfAyahs || 0,
    revelationType: summary?.revelationType || 'مکی',
    juz: summary?.juz || 1,
    virtue: summary?.virtue || '',
    theme: summary?.theme || '',
    bismillah: surahNumber !== 1 && surahNumber !== 9,
    ayahs: []
  };
}

