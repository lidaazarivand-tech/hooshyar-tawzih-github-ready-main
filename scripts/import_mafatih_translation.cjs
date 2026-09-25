/**
 * Build-time importer for Mafatih al-Jinan Persian translations.
 * Source translator: Seyyed Hashem Rasouli Mahallati (سید هاشم رسولی محلاتی)
 * Source PDF: scripts/source/mafatih-janan-sheykhGhomi-ketabha.pdf
 * 
 * Strict constraints:
 * - Exactly 616 entries preserved
 * - All IDs, order, and Arabic text unchanged
 * - Only fills existing persianTranslation fields with real translations extracted from the PDF
 * - No generation, guessing, or third-party translations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PDF_PATH = path.join(PROJECT_ROOT, 'scripts', 'source', 'mafatih-janan-sheykhGhomi-ketabha.pdf');
const TXT_PATH = path.join(PROJECT_ROOT, 'scripts', 'source', 'mafatih_extracted.txt');
const JSON_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'mafatihFullData.json');

function ensureExtractedText() {
  if (fs.existsSync(TXT_PATH) && fs.statSync(TXT_PATH).size > 1000000) {
    console.log(`Using existing extracted text: ${TXT_PATH}`);
    return;
  }
  console.log(`Extracting text from PDF using Ghostscript: ${PDF_PATH}...`);
  execSync(`gs -sDEVICE=txtwrite -dFirstPage=1 -dLastPage=1659 -o "${TXT_PATH}" "${PDF_PATH}"`, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT
  });
  console.log('Extraction complete.');
}

function cleanNorm(t) {
  if (!t) return '';
  // Fix Ghostscript font ligature where لأ was extracted as أل or األ
  let s = t.replace(/ا[أإآا]ل/g, 'الا');
  s = s.replace(/[\u064B-\u065F\u0670\u0653\u0654\u0655ًٌٍَُِّّْـ\u200c\u200b]/g, '');
  s = s.replace(/[آإأٱءئ]/g, 'ا');
  s = s.replace(/[يى]/g, 'ی');
  s = s.replace(/ك/g, 'ک');
  s = s.replace(/[ةۀ]/g, 'ه');
  s = s.replace(/ؤ/g, 'و');
  s = s.replace(/سیم/g, 'سوم');
  // Strip all punctuation, commas, brackets, asterisks, symbols, whitespace
  s = s.replace(/[\s،؛؟\.\:\,\!\«\»\(\)\[\]\*\-\–\—\_\\\/\"\']+/g, '');
  // Keep only Arabic/Persian letters and digits
  s = s.replace(/[^\u0600-\u06FF0-9]/g, '');
  return s;
}

function isArabicPrayerLine(line) {
  const diacritics = (line.match(/[\u064B-\u065F\u0670ًٌٍَُِّْ]/g) || []).length;
  const letters = (line.match(/[\u0600-\u06FF]/g) || []).length;
  if (letters === 0) return false;
  return (diacritics / letters) > 0.12 || diacritics >= 4;
}

function cleanPersianLine(line) {
  let l = line.trim();
  if (/^\d+$/.test(l)) return '';
  l = l.replace(/^[\*\s\-\–\«\»\(\)]+/, '');
  l = l.replace(/[\*\s\-\–\«\»\(\)]+$/, '');
  l = l.replace(/\uFFFD/g, '').replace(/…/g, '');
  l = l.replace(/\.{2,}/g, '.');

  // Fix common Ghostscript ligatures
  l = l.replace(/صل\s*ى\s*اهلل/g, 'صلی الله');
  l = l.replace(/صّلى\s*اهلل/g, 'صلی الله');
  l = l.replace(/عّلیه\s*السالم/g, 'علیه السلام');
  l = l.replace(/علیه\s*السالم/g, 'علیه السلام');
  l = l.replace(/عّلیها\s*السالم/g, 'علیها السلام');
  l = l.replace(/علیها\s*السالم/g, 'علیها السلام');
  l = l.replace(/عّلیهم\s*السالم/g, 'علیهم السلام');
  l = l.replace(/علیهم\s*السالم/g, 'علیهم السلام');
  l = l.replace(/رسو\s*لاهلل/g, 'رسول الله');
  l = l.replace(/\bahll\b|\bاهلل\b/g, 'الله');

  // Fix detached prefixes and suffixes
  l = l.replace(/\bم\s+ى\s*/g, 'می ');
  l = l.replace(/\bم\s+ی\s*/g, 'می ');
  l = l.replace(/\bن\s+م\s+ى\s*/g, 'نمی ');
  l = l.replace(/\bن\s+م\s+ی\s*/g, 'نمی ');
  l = l.replace(/\bب\s+ى\s*/g, 'بی ');
  l = l.replace(/\bب\s+ی\s*/g, 'بی ');
  l = l.replace(/\s+ه\s*ا\b/g, '‌ها');
  l = l.replace(/\s+ه\s*اى\b/g, '‌های');
  l = l.replace(/\s+ه\s*ای\b/g, '‌های');
  return l.replace(/[ \t]+/g, ' ').trim();
}

const PRAYER_KEYWORDS = [
  'اللهم', 'الهی', 'سبحان', 'السلام علیک', 'یا رب', 'استغفر الله', 
  'یا من اظهر', 'یا عماد', 'یا بار', 'یا صانع', 'یا عدتی', 'اشهد',
  'لا اله الا الله', 'الحمد لله', 'تبارکت', 'ربنا'
].map(cleanNorm);

function getItemProbes(it) {
  if (it.isHeading) return [];
  const probes = [];

  const ar = (it.arabicText || '').trim();
  const arLines = ar.split(/\r?\n/);
  for (let i = 0; i < Math.min(15, arLines.length); i++) {
    const lc = cleanNorm(arLines[i]);
    for (const kw of PRAYER_KEYWORDS) {
      if (lc.includes(kw)) {
        const pos = lc.indexOf(kw);
        const sub = lc.substring(pos, pos + 14);
        if (sub.length >= 10) {
          probes.push(['ar_prayer_key', sub]);
          break;
        }
      }
    }
    if (probes.length >= 4) break;
  }

  const arClean = cleanNorm(ar);
  const arNoPrefix = arClean.replace(/^(بسماللهالرحمنالرحیم|وبعد|چنانکه|روایتشده|منقولاست|بدانکه|درمصباح|درزادالمعاد|شیخدرمصباح)+/, '');
  if (arNoPrefix.length >= 10) {
    probes.push(['ar_noprefix1', arNoPrefix.substring(0, 12)]);
    if (arNoPrefix.length >= 24) {
      probes.push(['ar_noprefix2', arNoPrefix.substring(12, 24)]);
    }
  }
  if (arClean.length >= 12) {
    probes.push(['ar_c1', arClean.substring(0, 12)]);
  }

  const tClean = cleanNorm(it.title || '');
  const tCore = tClean.replace(/^(فصل|باب|مطلب|امر|مقدمت|قسم|تذییل|در)?(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|سیزدهم|چهاردهم|پانزدهم|شانزدهم|هفدهم|هجدهم|نوزدهم|بیست|بیستویک|بیستودو|بیستوسوم|بیستوچهار|بیستوپنجم|بیستوشش|بیستوهفت|بیستوهشت|بیستونهم|سی)?/, '');
  if (tCore.startsWith('دعا')) {
    const sub = tCore.substring(3);
    if (sub.length >= 4 && !sub.startsWith('انحضرت')) {
      probes.push(['title_dua', sub.substring(0, 12)]);
    }
  }
  if (tCore.length >= 8 && !tCore.startsWith('دعایانحضرت')) {
    probes.push(['title_core', tCore.substring(0, 12)]);
  }

  return probes;
}

function importTranslations() {
  ensureExtractedText();

  console.log('Loading extracted text...');
  const fileContent = fs.readFileSync(TXT_PATH, 'utf-8');
  const rawLines = fileContent.split(/\r?\n/).map(l => l.trim().split('').reverse().join(''));
  const rawClean = rawLines.map(cleanNorm);

  console.log('Loading Mafatih JSON...');
  const items = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  if (!Array.isArray(items) || items.length !== 616) {
    throw new Error(`Expected exactly 616 items, but found ${items ? items.length : 0}`);
  }

  // Step 1: Detect structural chapter headings
  let headingsCount = 0;
  for (const it of items) {
    const arT = (it.arabicText || '').trim();
    it.isHeading = false;
    if (arT.length < 75) {
      if (['فصل', 'باب', 'مطلب اول', 'مطلب دوم', 'مطلب سوم', 'مطلب چهارم', 'قسم اول', 'قسم دوم'].some(w => it.title.includes(w)) ||
          arT.startsWith('[') || arT === it.title) {
        it.isHeading = true;
        headingsCount++;
      }
    }
  }
  console.log(`Structural headings identified: ${headingsCount}`);

  // Step 2: Calculate estimated line from eshia page
  for (const it of items) {
    const urlM = (it.sourceUrl || '').match(/\/10376\/1\/(\d+)/);
    const eshiaP = urlM ? parseInt(urlM[1], 10) : 1;
    it.eshiaP = eshiaP;
    it.estLine = Math.floor(400 + (eshiaP - 12) * ((39500 - 400) / (587 - 12)));
  }

  // Step 3: Find candidate matches for each item within a window around estLine
  const candidatesPerItem = {};
  for (const it of items) {
    if (it.isHeading) continue;
    const num = it.num;
    const estL = it.estLine;
    const wMin = Math.max(400, estL - 4000);
    const wMax = Math.min(rawClean.length, estL + 4000);

    const probes = getItemProbes(it);
    const foundHits = [];
    for (const [pType, p] of probes) {
      const hits = [];
      for (let idx = wMin; idx < wMax; idx++) {
        if (rawClean[idx].includes(p)) hits.push(idx);
      }
      if (hits.length > 0) {
        hits.sort((a, b) => Math.abs(a - estL) - Math.abs(b - estL));
        foundHits.push(...hits.slice(0, 2));
        break;
      }
    }
    if (foundHits.length > 0) {
      candidatesPerItem[num] = foundHits[0];
    }
  }

  console.log(`Initial candidate matches: ${Object.keys(candidatesPerItem).length} / ${items.length - headingsCount}`);

  // Step 4: Strict Monotonic DP to establish rock-solid anchor chain
  const candNums = Object.keys(candidatesPerItem).map(Number).sort((a, b) => a - b);
  const candLines = candNums.map(n => candidatesPerItem[n]);
  const n = candNums.length;

  const dp = new Array(n).fill(1);
  const parent = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (candLines[j] < candLines[i] && (candLines[i] - candLines[j]) <= (candNums[i] - candNums[j]) * 450) {
        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          parent[i] = j;
        }
      }
    }
  }

  let bestEnd = 0;
  for (let i = 1; i < n; i++) {
    if (dp[i] > dp[bestEnd]) bestEnd = i;
  }

  const lisIndices = [];
  let curr = bestEnd;
  while (curr !== -1) {
    lisIndices.push(curr);
    curr = parent[curr];
  }
  lisIndices.reverse();

  const anchors = {};
  for (const idx of lisIndices) {
    anchors[candNums[idx]] = candLines[idx];
  }
  console.log(`Monotonic verified anchors established: ${Object.keys(anchors).length}`);

  // Step 5: Bounded Interval Search for all intermediate items
  const boundaryMap = { ...anchors };
  boundaryMap[0] = 405;
  boundaryMap[617] = rawClean.length - 1;
  const allBoundNums = Object.keys(boundaryMap).map(Number).sort((a, b) => a - b);

  const finalStarts = { ...anchors };

  for (let bIdx = 0; bIdx < allBoundNums.length - 1; bIdx++) {
    const numA = allBoundNums[bIdx];
    const lineA = boundaryMap[numA];
    const numB = allBoundNums[bIdx + 1];
    const lineB = boundaryMap[numB];

    for (let unanchoredNum = numA + 1; unanchoredNum < numB; unanchoredNum++) {
      const it = items[unanchoredNum - 1];
      if (it.isHeading) continue;

      const probes = getItemProbes(it);
      let foundLine = null;
      for (const [pType, p] of probes) {
        for (let idx = lineA; idx <= lineB; idx++) {
          if (rawClean[idx].includes(p)) {
            foundLine = idx;
            break;
          }
        }
        if (foundLine !== null) break;
      }
      if (foundLine !== null) {
        finalStarts[unanchoredNum] = foundLine;
      }
    }
  }

  console.log(`Total resolved items with start lines: ${Object.keys(finalStarts).length}`);

  // Step 6: Extract Persian Translations
  const sortedMappedNums = Object.keys(finalStarts).map(Number).sort((a, b) => a - b);
  let mappedCount = 0;
  let unmappedCount = 0;
  const unmappedIds = [];

  for (const it of items) {
    const num = it.num;
    if (!finalStarts[num] || it.isHeading) {
      it.persianTranslation = '';
      unmappedCount++;
      unmappedIds.push(it.id);
      continue;
    }

    const startL = finalStarts[num];
    const idxInSorted = sortedMappedNums.indexOf(num);
    const nextStartL = (idxInSorted + 1 < sortedMappedNums.length)
      ? finalStarts[sortedMappedNums[idxInSorted + 1]]
      : rawLines.length - 1;

    const arLen = it.arabicText.length;
    const maxSpan = Math.max(35, Math.floor(arLen / 10));
    const effEndL = Math.min(nextStartL, startL + maxSpan);

    const transLines = [];
    for (let lIdx = startL; lIdx < effEndL; lIdx++) {
      const line = rawLines[lIdx];
      if (!line || /^\d+$/.test(line.trim())) continue;
      if (!isArabicPrayerLine(line)) {
        const cleaned = cleanPersianLine(line);
        if (cleaned && cleaned.length > 1) {
          transLines.push(cleaned);
        }
      }
    }

    if (transLines.length > 0) {
      let fullTrans = transLines.join(' ');
      const cleanTitle = cleanNorm(it.title);
      const tCore = cleanTitle.replace(/^(فصل|باب|مطلب|امر|مقدمت|قسم|تذییل|در)?(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|سیزدهم|چهاردهم|پانزدهم|شانزدهم|هفدهم|هجدهم|نوزدهم|بیست)?/, '');
      if (tCore.length >= 4 && cleanNorm(fullTrans).startsWith(tCore)) {
        fullTrans = fullTrans.substring(tCore.length).trim();
      }

      fullTrans = fullTrans.replace(/\.{2,}/g, '.').replace(/…/g, '').replace(/\uFFFD/g, '').replace(/\s+/g, ' ').trim();

      if (fullTrans.length < 30 && arLen > 300) {
        it.persianTranslation = '';
        unmappedCount++;
        unmappedIds.push(it.id);
      } else {
        it.persianTranslation = fullTrans;
        mappedCount++;
      }
    } else {
      it.persianTranslation = '';
      unmappedCount++;
      unmappedIds.push(it.id);
    }
  }

  // Prepare clean output with exact keys
  const cleanOutput = items.map(it => ({
    id: it.id,
    num: it.num,
    title: it.title,
    arabicText: it.arabicText,
    sourceUrl: it.sourceUrl || '',
    persianTranslation: it.persianTranslation || ''
  }));

  console.log(`Writing verified output to ${JSON_PATH}...`);
  fs.writeFileSync(JSON_PATH, JSON.stringify(cleanOutput, null, 2), 'utf-8');

  console.log('\n==============================================');
  console.log('MAFATIH AL-JINAN TRANSLATION IMPORT COMPLETE');
  console.log('==============================================');
  console.log(`Total entries:         ${items.length}`);
  console.log(`Mapped entries:        ${mappedCount} (${((mappedCount / items.length) * 100).toFixed(1)}%)`);
  console.log(`Unmapped entries:      ${unmappedCount} (${((unmappedCount / items.length) * 100).toFixed(1)}%)`);
  console.log('==============================================');

  return {
    total: items.length,
    mappedCount,
    unmappedCount,
    unmappedIds
  };
}

if (require.main === module) {
  try {
    importTranslations();
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

module.exports = { importTranslations };
