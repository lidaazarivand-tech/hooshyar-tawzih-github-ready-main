import { describe, it, expect } from 'vitest';
import { SURAH_LIST } from '../data/quranSurahs';
import { fetchSurahFullData } from '../services/quranService';
import fs from 'fs';
import path from 'path';

interface KnownReferenceVerse {
  surahNumber: number;
  surahName: string;
  verseNumber: number;
  expectedArabic: string;
  expectedPersian: string;
}

/**
 * Known reference verses extracted directly from the authoritative
 * Tanzil Uthmani text (v1.1) and Tanzil Qaraati Persian translation.
 */
const KNOWN_REFERENCE_VERSES: KnownReferenceVerse[] = [
  // 1. Beginning of Quran — Surah Al-Fatiha (Surah 1)
  {
    surahNumber: 1,
    surahName: 'الفَاتِحَة',
    verseNumber: 1,
    expectedArabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    expectedPersian: 'به نام خداوند بخشنده‌ی مهربان.'
  },
  {
    surahNumber: 1,
    surahName: 'الفَاتِحَة',
    verseNumber: 2,
    expectedArabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    expectedPersian: 'سپاس و ستایش مخصوص خداوندی است که پروردگار جهانیان است.'
  },
  {
    surahNumber: 1,
    surahName: 'الفَاتِحَة',
    verseNumber: 7,
    expectedArabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    expectedPersian: 'راه کسانی که به آنان نعمت دادی، نه کسانی که مورد غضب واقع شدند و نه گمراهان.'
  },

  // 2. Early Quran — Surah Al-Baqarah (Surah 2)
  {
    surahNumber: 2,
    surahName: 'البَقَرَة',
    verseNumber: 1,
    expectedArabic: 'الٓمٓ',
    expectedPersian: 'الف، لام، میم.'
  },
  {
    surahNumber: 2,
    surahName: 'البَقَرَة',
    verseNumber: 255, // Ayat al-Kursi
    expectedArabic: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ',
    expectedPersian: 'اللّه که جز او معبودی نیست، زنده و پاینده است. نه خواب سبک او را فرامی‌گیرد و نه خواب سنگین. [و لحظه‌ای از تدبیر جهان هستی، غافل نمی‌ماند.] آنچه در آسمان‌ها و آنچه در زمین است، از آنِ اوست. کیست آن که جز به اذن او در پیشگاهش شفاعت کند؟ گذشته و آینده‌ی همگان را می‌داند. و کسی به چیزی از علم او احاطه پیدا نمی‌کند مگر به مقداری که او بخواهد. اَریکه‌ی [حکومت] او آسمان‌ها و زمین را فراگرفته و حفظ و نگاهداشت آنها بر وی دشوار نیست. و او والا و بزرگ است.'
  },

  // 3. Middle of Quran — Surah Al-Kahf (Surah 18) & Surah Ya-Sin (Surah 36)
  {
    surahNumber: 18,
    surahName: 'الکَهف',
    verseNumber: 1,
    expectedArabic: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِىٓ أَنزَلَ عَلَىٰ عَبْدِهِ ٱلْكِتَٰبَ وَلَمْ يَجْعَل لَّهُۥ عِوَجَا',
    expectedPersian: 'ستایش مخصوص خدایی است كه كتاب بر بنده‌ی خود نازل كرد و برای آن هیچ‌گونه انحرافی قرار نداد.'
  },
  {
    surahNumber: 36,
    surahName: 'یس',
    verseNumber: 1,
    expectedArabic: 'يسٓ',
    expectedPersian: 'یاسین!'
  },
  {
    surahNumber: 36,
    surahName: 'یس',
    verseNumber: 83,
    expectedArabic: 'فَسُبْحَٰنَ ٱلَّذِى بِيَدِهِۦ مَلَكُوتُ كُلِّ شَىْءٍ وَإِلَيْهِ تُرْجَعُونَ',
    expectedPersian: 'پس منزّه است کسی که حاکمیت و مالکیت همه چیز به دست اوست و به سوی او بازگردانده می‌شوید.'
  },

  // 4. Later Quran — Surah Al-Ikhlas (Surah 112)
  {
    surahNumber: 112,
    surahName: 'الإخلَاص',
    verseNumber: 1,
    expectedArabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    expectedPersian: '[ای پیامبر!] بگو: «او خداوند یگانه است.'
  },
  {
    surahNumber: 112,
    surahName: 'الإخلَاص',
    verseNumber: 2,
    expectedArabic: 'ٱللَّهُ ٱلصَّمَدُ',
    expectedPersian: 'خدای بی‌نیاز [که نیازمندان فقط به او رو می‌کنند.]'
  },
  {
    surahNumber: 112,
    surahName: 'الإخلَاص',
    verseNumber: 3,
    expectedArabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    expectedPersian: 'نه فرزند دارد و نه فرزند کسی است.'
  },
  {
    surahNumber: 112,
    surahName: 'الإخلَاص',
    verseNumber: 4,
    expectedArabic: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    expectedPersian: 'و هیچ همتایی برای او نیست».'
  },

  // 5. End of Quran — Surah An-Nas (Surah 114)
  {
    surahNumber: 114,
    surahName: 'النَّاس',
    verseNumber: 1,
    expectedArabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
    expectedPersian: '[ای پیامبر!] بگو: «پناه می‌برم به پروردگار آدمیان،'
  },
  {
    surahNumber: 114,
    surahName: 'النَّاس',
    verseNumber: 6,
    expectedArabic: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
    expectedPersian: 'از جنس جنّ باشد یا از آدمیان».'
  }
];

describe('Quran Full Data Integrity (Tanzil + Qaraati)', () => {
  it('contains exactly 114 surahs in SURAH_LIST without duplicates', () => {
    expect(SURAH_LIST).toHaveLength(114);
    const seenNumbers = new Set<number>();

    for (let i = 0; i < 114; i++) {
      const s = SURAH_LIST[i];
      expect(s.number).toBe(i + 1);
      expect(seenNumbers.has(s.number)).toBe(false);
      seenNumbers.add(s.number);
      expect(s.name).toBeTruthy();
      expect(s.numberOfAyahs).toBeGreaterThan(0);
    }
    expect(seenNumbers.size).toBe(114);
  });

  it('contains exactly 114 surahs and exactly 6236 verses in quranFullData.json with valid structure', () => {
    const filePath = path.resolve(__dirname, '../data/quranFullData.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    const keys = Object.keys(data);
    expect(keys).toHaveLength(114);

    const surahNumbers = new Set<number>();
    let totalVerses = 0;

    for (let i = 1; i <= 114; i++) {
      const surahKey = i.toString();
      const surah = data[surahKey];
      expect(surah).toBeDefined();
      expect(surah.number).toBe(i);
      expect(surahNumbers.has(surah.number)).toBe(false);
      surahNumbers.add(surah.number);

      expect(surah.ayahs).toHaveLength(surah.numberOfAyahs);
      expect(surah.ayahs.length).toBe(SURAH_LIST[i - 1].numberOfAyahs);

      const ayahNumbers = new Set<number>();

      for (let a = 0; a < surah.ayahs.length; a++) {
        const ayah = surah.ayahs[a];
        // Correct verse ordering & no duplicates
        expect(ayah.numberInSurah).toBe(a + 1);
        expect(ayahNumbers.has(ayah.numberInSurah)).toBe(false);
        ayahNumbers.add(ayah.numberInSurah);

        // Non-empty Arabic text
        expect(typeof ayah.text).toBe('string');
        const trimmedText = ayah.text.trim();
        expect(trimmedText.length).toBeGreaterThan(0);
        expect(trimmedText).not.toMatch(/^(TODO|null|undefined|placeholder|\.{3}|\[در دست تکمیل\])$/i);

        // Non-empty Persian translation
        expect(typeof ayah.translation).toBe('string');
        const trimmedTranslation = ayah.translation.trim();
        expect(trimmedTranslation.length).toBeGreaterThan(0);
        expect(trimmedTranslation).not.toMatch(/^(TODO|null|undefined|placeholder|\.{3}|\[در دست تکمیل\])$/i);
      }

      expect(ayahNumbers.size).toBe(surah.ayahs.length);
      totalVerses += surah.ayahs.length;
    }

    expect(surahNumbers.size).toBe(114);
    expect(totalVerses).toBe(6236);
  });

  it('verifies exact known-reference verses across beginning, early, middle, later, and end of Quran', () => {
    const filePath = path.resolve(__dirname, '../data/quranFullData.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    for (const ref of KNOWN_REFERENCE_VERSES) {
      const surah = data[ref.surahNumber.toString()];
      expect(surah).toBeDefined();
      expect(surah.number).toBe(ref.surahNumber);

      const ayah = surah.ayahs[ref.verseNumber - 1];
      expect(ayah).toBeDefined();
      expect(ayah.numberInSurah).toBe(ref.verseNumber);

      // Verify exact Arabic text matching authoritative Tanzil reference
      expect(ayah.text).toBe(ref.expectedArabic);
      expect(ayah.text.length).toBeGreaterThan(0);

      // Verify exact Persian translation matching authoritative Qaraati reference
      expect(ayah.translation).toBe(ref.expectedPersian);
      expect(ayah.translation.length).toBeGreaterThan(0);
    }
  });

  it('successfully fetches full surah details through quranService and validates reference content', async () => {
    // 1. Beginning: Al-Fatiha
    const fatihah = await fetchSurahFullData(1);
    expect(fatihah.number).toBe(1);
    expect(fatihah.numberOfAyahs).toBe(7);
    expect(fatihah.ayahs).toHaveLength(7);
    expect(fatihah.ayahs[0].text).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
    expect(fatihah.ayahs[0].translation).toBe('به نام خداوند بخشنده‌ی مهربان.');
    expect(fatihah.ayahs[6].text).toBe('صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ');

    // 2. Early: Al-Baqarah
    const baqarah = await fetchSurahFullData(2);
    expect(baqarah.number).toBe(2);
    expect(baqarah.numberOfAyahs).toBe(286);
    expect(baqarah.ayahs[0].text).toBe('الٓمٓ');
    expect(baqarah.ayahs[0].translation).toBe('الف، لام، میم.');
    expect(baqarah.ayahs[254].text).toBe(KNOWN_REFERENCE_VERSES[4].expectedArabic); // Ayat al-Kursi (index 254 = verse 255)
    expect(baqarah.ayahs[254].translation).toBe(KNOWN_REFERENCE_VERSES[4].expectedPersian);

    // 3. Middle: Ya-Sin
    const yaseen = await fetchSurahFullData(36);
    expect(yaseen.number).toBe(36);
    expect(yaseen.numberOfAyahs).toBe(83);
    expect(yaseen.ayahs).toHaveLength(83);
    expect(yaseen.ayahs[0].text).toBe('يسٓ');
    expect(yaseen.ayahs[0].translation).toBe('یاسین!');
    expect(yaseen.ayahs[82].text).toBe('فَسُبْحَٰنَ ٱلَّذِى بِيَدِهِۦ مَلَكُوتُ كُلِّ شَىْءٍ وَإِلَيْهِ تُرْجَعُونَ');

    // 4. Later: Al-Ikhlas
    const ikhlas = await fetchSurahFullData(112);
    expect(ikhlas.number).toBe(112);
    expect(ikhlas.numberOfAyahs).toBe(4);
    expect(ikhlas.ayahs[0].text).toBe('قُلْ هُوَ ٱللَّهُ أَحَدٌ');
    expect(ikhlas.ayahs[3].text).toBe('وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ');

    // 5. End: An-Nas
    const nas = await fetchSurahFullData(114);
    expect(nas.number).toBe(114);
    expect(nas.numberOfAyahs).toBe(6);
    expect(nas.ayahs).toHaveLength(6);
    expect(nas.ayahs[0].text).toBe('قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ');
    expect(nas.ayahs[0].translation).toBe('[ای پیامبر!] بگو: «پناه می‌برم به پروردگار آدمیان،');
    expect(nas.ayahs[5].text).toBe('مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ');
    expect(nas.ayahs[5].translation).toBe('از جنس جنّ باشد یا از آدمیان».');
  });
});

