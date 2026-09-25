import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SHIA_BOOKS_CONTENT } from '../data/shiaBooksData';
import { ShiaBookItem } from '../types/books';
import { removePersianDiacritics } from '../utils/persianNumber';

describe('Sahifa al-Sajjadiyya Complete Verified Data Integrity & Structure', () => {
  const jsonPath = path.join(__dirname, '../data/sahifahFullData.json');

  it('1. sahifahFullData.json exists and is valid JSON with exactly 54 supplications', () => {
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const items: ShiaBookItem[] = JSON.parse(raw);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(54);
  });

  it('2. SHIA_BOOKS_CONTENT["sahifah"] contains exactly 54 items', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    expect(items).toBeDefined();
    expect(items.length).toBe(54);
  });

  it('3. IDs are unique and numbered sequentially 1..54 with first and last correctly numbered', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    const ids = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const expectedNum = i + 1;
      expect(it.num).toBe(expectedNum);
      expect(it.id).toBe(`sahifah_${expectedNum}`);
      expect(ids.has(it.id)).toBe(false);
      ids.add(it.id);
    }
    expect(ids.size).toBe(54);
    expect(items[0].num).toBe(1);
    expect(items[0].id).toBe('sahifah_1');
    expect(items[53].num).toBe(54);
    expect(items[53].id).toBe('sahifah_54');
  });

  it('4. every item has non-empty title, Arabic text, Persian translation, and translator attribution', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    for (const it of items) {
      expect(it.title).toBeTruthy();
      expect(it.title.trim().length).toBeGreaterThan(3);

      expect(it.arabicText).toBeTruthy();
      expect(it.arabicText.trim().length).toBeGreaterThan(100);

      expect(it.persianTranslation).toBeTruthy();
      expect(it.persianTranslation.trim().length).toBeGreaterThan(100);

      expect(it.category).toBe('صحیفه سجادیه');
      expect(it.sourceCitation).toContain('الهی قمشه‌ای');
      expect(it.sourceCitation).toContain('صحیفه کامله سجادیه');
    }
  });

  it('5. contains NO Unicode replacement characters (\\uFFFD) anywhere in any field', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    for (const it of items) {
      expect(it.arabicText).not.toContain('\uFFFD');
      expect(it.persianTranslation).not.toContain('\uFFFD');
      expect(it.title).not.toContain('\uFFFD');
      if (it.description) expect(it.description).not.toContain('\uFFFD');
    }
  });

  it('6. contains NO obvious placeholder text or fallback markers', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    for (const it of items) {
      expect(it.arabicText.toLowerCase()).not.toContain('placeholder');
      expect(it.persianTranslation.toLowerCase()).not.toContain('placeholder');
      expect(it.title.toLowerCase()).not.toContain('placeholder');
      expect(it.arabicText).not.toContain('در حال آماده‌سازی');
      expect(it.persianTranslation).not.toContain('در حال آماده‌سازی');
    }
  });

  it('7. contains NO accidental placeholder ellipses ("...", "…") inserted by importer', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    for (const it of items) {
      expect(it.arabicText.trim()).not.toMatch(/^(\.{3,}|…)$/);
      expect(it.persianTranslation.trim()).not.toMatch(/^(\.{3,}|…)$/);
      expect(it.arabicText).not.toContain('â€¦');
      expect(it.persianTranslation).not.toContain('â€¦');
      expect(it.arabicText).not.toMatch(/\[\s*متن\s*دعا\s*(\.{3,}|…)\s*\]/);
      expect(it.persianTranslation).not.toMatch(/\[\s*متن\s*ترجمه\s*(\.{3,}|…)\s*\]/);
    }
  });

  it('8. contains NO duplicate full translation bodies or duplicate Arabic texts across all 54 items', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    const faTexts = new Set<string>();
    const arTexts = new Set<string>();

    for (const it of items) {
      expect(faTexts.has(it.persianTranslation)).toBe(false);
      faTexts.add(it.persianTranslation);

      expect(arTexts.has(it.arabicText)).toBe(false);
      arTexts.add(it.arabicText);
    }
    expect(faTexts.size).toBe(54);
    expect(arTexts.size).toBe(54);
  });

  it('9. Arabic and Persian text are NOT swapped', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    for (const it of items) {
      // Persian translation must contain authentic Persian particles and vocabulary
      const hasPersianKeywords = /خدا|پروردگار|درود|ای|است|بود|که|به|این|آن|او|ما|تو/.test(it.persianTranslation);
      expect(hasPersianKeywords).toBe(true);

      // Arabic text must contain standard Arabic supplication starters and Quranic phrasing
      const arClean = removePersianDiacritics(it.arabicText);
      const hasArabicSupplicationMarkers = /اللهم|الحمد|يا|إلهي|الهي|رب|سبحان/.test(arClean);
      expect(hasArabicSupplicationMarkers).toBe(true);

      // Arabic text should NOT contain specific Persian letters (گ, چ, پ, ژ)
      const persianSpecificCharsInArabic = /[گچپژ]/.test(it.arabicText);
      expect(persianSpecificCharsInArabic).toBe(false);
    }
  });

  it('10. no item contains the text of neighboring supplications (no bleed/merge)', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];

      // Current supplication must not start with or swallow the next supplication's opening
      const nextArStart = removePersianDiacritics(next.arabicText).slice(0, 60);
      expect(removePersianDiacritics(current.arabicText).slice(0, 100)).not.toContain(nextArStart);

      // Next supplication must not start with or swallow the current supplication's opening
      const currArStart = removePersianDiacritics(current.arabicText).slice(0, 60);
      expect(removePersianDiacritics(next.arabicText).slice(0, 100)).not.toContain(currArStart);
    }
  });

  it('11. Content Audit: explicitly inspects and verifies required supplications', () => {
    const items = SHIA_BOOKS_CONTENT['sahifah'] as ShiaBookItem[];
    const norm = (s: string) =>
      removePersianDiacritics(s)
        .replace(/[،,؛;\.ـ:!؟?«»()\[\]]/g, ' ')
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/\bو\s+/g, 'و')
        .replace(/\s+/g, ' ')
        .trim();

    // دعای 1: التحمید لله عز و جل
    const dua1 = items.find(it => it.num === 1);
    expect(dua1).toBeDefined();
    expect(dua1?.title).toContain('التحمید');
    const dua1Ar = norm(dua1?.arabicText || '');
    expect(dua1Ar).toContain('الحمد لله الاول بلا اول كان قبله');
    expect(dua1Ar).toContain('الحمد لله الذي اختار لنا محاسن الخلق');
    expect(dua1?.persianTranslation).toContain('ستایش مخصوص خداست');
    expect(dua1?.persianTranslation).toContain('هستی او اول در وجود');

    // دعای 3: الصلاة علی حملة العرش
    const dua3 = items.find(it => it.num === 3);
    expect(dua3).toBeDefined();
    expect(dua3?.title).toContain('حملة العرش');
    const dua3Ar = norm(dua3?.arabicText || '');
    expect(dua3Ar).toContain('حمله عرشك');
    expect(dua3Ar).toContain('اسرافيل صاحب الصور');
    expect(dua3?.persianTranslation).toContain('حاملان عرش');

    // دعای 7: الدعاء فی المهمات
    const dua7 = items.find(it => it.num === 7);
    expect(dua7).toBeDefined();
    expect(dua7?.title).toContain('المهمات');
    const dua7Ar = norm(dua7?.arabicText || '');
    expect(dua7Ar).toContain('يا من تحل به عقد المكاره');
    expect(dua7Ar).toContain('يفثا به حد الشدائد');
    expect(dua7?.persianTranslation).toContain('گره ناگواریهای عالم به او گشایش می یابد');

    // دعای 20: مکارم الاخلاق
    const dua20 = items.find(it => it.num === 20);
    expect(dua20).toBeDefined();
    expect(dua20?.title).toContain('مکارم الأخلاق');
    const dua20Ar = norm(dua20?.arabicText || '');
    expect(dua20Ar).toContain('اللهم صل علي محمد');
    expect(dua20Ar).toContain('اكمل الايمان');
    expect(dua20Ar).toContain('بنيتي الي احسن النيات');
    expect(dua20?.persianTranslation).toContain('اخلاق ستوده');
    expect(dua20?.persianTranslation).toContain('سعادت');

    // دعای 24: الدعاء لأبویه
    const dua24 = items.find(it => it.num === 24);
    expect(dua24).toBeDefined();
    expect(dua24?.title).toContain('لأبویه');
    const dua24Ar = norm(dua24?.arabicText || '');
    expect(dua24Ar).toContain('اللهم صل علي محمد عبدك');
    expect(dua24Ar).toContain('خفض لهما صوتي');
    expect(dua24?.persianTranslation).toContain('والدین');

    // دعای 31: الدعاء بالتوبة و الإنابة
    const dua31 = items.find(it => it.num === 31);
    expect(dua31).toBeDefined();
    expect(dua31?.title).toContain('التوبة');
    const dua31Ar = norm(dua31?.arabicText || '');
    expect(dua31Ar).toContain('اللهم يا من لا يصفه نعت الواصفين');
    expect(dua31Ar).toContain('هذا مقام من تداولته ايدي الذنوب');
    expect(dua31?.persianTranslation).toContain('اوصاف کمال');

    // دعای 42: الدعاء عند ختم القرآن
    const dua42 = items.find(it => it.num === 42);
    expect(dua42).toBeDefined();
    expect(dua42?.title).toContain('ختم القرآن');
    const dua42Ar = norm(dua42?.arabicText || '');
    expect(dua42Ar).toContain('اللهم انك اعنتني علي ختم كتابك');
    expect(dua42?.persianTranslation).toContain('ختم کتاب آسمانی قرآن');

    // دعای 44: الدعاء لدخول شهر رمضان
    const dua44 = items.find(it => it.num === 44);
    expect(dua44).toBeDefined();
    expect(dua44?.title).toContain('رمضان');
    const dua44Ar = norm(dua44?.arabicText || '');
    expect(dua44Ar).toContain('الحمد لله الذي هدانا لحمده');
    expect(dua44Ar).toContain('شهر الصيام');
    expect(dua44Ar).toContain('شهر الاسلام');
    expect(dua44?.persianTranslation).toContain('ستایش مخصوص');
    expect(dua44?.persianTranslation).toContain('رمضان');

    // دعای 45: الدعاء لوداع شهر رمضان
    const dua45 = items.find(it => it.num === 45);
    expect(dua45).toBeDefined();
    expect(dua45?.title).toContain('وداع');
    const dua45Ar = norm(dua45?.arabicText || '');
    expect(dua45Ar).toContain('اللهم يا من لا يرغب في الجزاء');
    expect(dua45Ar).toContain('السلام عليك يا شهر الله الاكبر');
    expect(dua45?.persianTranslation).toContain('احسان به خلق پاداش نخواهی');

    // دعای 51: التضرع و الاستکانة
    const dua51 = items.find(it => it.num === 51);
    expect(dua51).toBeDefined();
    expect(dua51?.title).toContain('التضرع');
    const dua51Ar = norm(dua51?.arabicText || '');
    expect(dua51Ar).toContain('الهي احمدك');
    expect(dua51Ar).toContain('للحمد اهل');
    expect(dua51?.persianTranslation).toContain('شایسته ستایش');

    // دعای 53: التذلل لله عز و جل
    const dua53 = items.find(it => it.num === 53);
    expect(dua53).toBeDefined();
    expect(dua53?.title).toContain('التذلل');
    const dua53Ar = norm(dua53?.arabicText || '');
    expect(dua53Ar).toContain('رب افحمتني ذنوبي');
    expect(dua53Ar).toContain('انقطعت مقالتي');
    expect(dua53?.persianTranslation).toContain('گناهانم مرا');

    // دعای 54: استکشاف الهموم و دفع الأحزان
    const dua54 = items.find(it => it.num === 54);
    expect(dua54).toBeDefined();
    expect(dua54?.title).toContain('الهموم');
    const dua54Ar = norm(dua54?.arabicText || '');
    expect(dua54Ar).toContain('يا فارج الهم');
    expect(dua54Ar).toContain('رسول الله المصطفي');
    expect(dua54?.persianTranslation).toContain('هم و غم');
  });
});
