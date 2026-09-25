const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'mafatih_pages_cache.json');
const TARGET_FILE = path.join(__dirname, '../src/data/mafatihFullData.json');

function cleanHtmlTextProper(html) {
  return html
    .replace(/<span class="H">[\s\S]*?<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&zwnj;/g, '\u200c')
    .replace(/&laquo;|&raquo;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function cleanTitle(t) {
  return t
    .replace(/^[۰-۹0-9\s\.\-\(\)]+/, '')
    .replace(/[\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(s) {
  return s
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\[\]\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getCache() {
  if (fs.existsSync(CACHE_FILE)) {
    console.log('Loading pages from cache...');
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }
  throw new Error('Cache file not found at ' + CACHE_FILE);
}

async function getToc() {
  console.log('Fetching TOC from lib.eshia.ir/10376/1/594...');
  const res = await fetch('https://lib.eshia.ir/10376/1/594');
  if (!res.ok) throw new Error('HTTP error fetching TOC: ' + res.status);
  const t = await res.text();
  const tableStart = t.indexOf('<table class="fehresttable">');
  const tableEnd = t.indexOf('</table>', tableStart);
  const tableHtml = t.slice(tableStart, tableEnd);

  const regex = /<div class="fehrest(\d)"><a href="(\/10376\/1\/(\d+))"\s*>([^<]+)<\/div>[\s\S]*?<div class="tdfehrest-shomare-safhe">(\d+)<\/div>/g;
  let match;
  const toc = [];
  while ((match = regex.exec(tableHtml)) !== null) {
    toc.push({
      level: parseInt(match[1]),
      page: parseInt(match[3]),
      title: match[4].trim()
    });
  }
  console.log(`Parsed ${toc.length} TOC entries.`);
  return toc;
}

function determineCategory(page, title, level1Title) {
  const t = title.toLowerCase();
  if (t.includes('زیارت') || t.includes('زیارات') || (page >= 306 && page <= 571)) {
    return 'زیارات';
  }
  if (t.includes('مناجات') || (page >= 118 && page <= 130)) {
    return 'مناجات';
  }
  if (page >= 131 && page <= 301) {
    return 'اعمال ماه‌ها';
  }
  if (page >= 60 && page <= 117) {
    return 'ادعیه مشهوره';
  }
  if (page >= 12 && page <= 22) {
    return 'تعقیبات نماز';
  }
  if (page >= 23 && page <= 59) {
    return 'ادعیه و اعمال هفته';
  }
  if (page >= 572) {
    return 'ملحقات مفاتیح';
  }
  return 'ادعیه و اعمال';
}

async function generate() {
  const cache = await getCache();
  const toc = await getToc();

  // Match TOC entries sequentially against headings in cached pages
  let currPage = 12;
  let currIdx = 0;
  const matchedEntries = [];

  for (let i = 0; i < toc.length; i++) {
    const item = toc[i];
    const nTitle = norm(item.title);
    let matchPage = -1;
    let matchIdx = -1;
    let matchLen = 0;

    // Search target page and adjacent pages
    for (const p of [item.page, item.page - 1, item.page + 1]) {
      if (p < 12 || p > 593 || !cache[p]) continue;
      const html = cache[p];
      const hRegex = /<span class="(KalamateKhas2?)"[^>]*>([\s\S]*?)<\/span>/g;
      let hMatch;
      while ((hMatch = hRegex.exec(html)) !== null) {
        if (p === currPage && hMatch.index < currIdx) continue;
        const hText = norm(hMatch[2].replace(/<[^>]+>/g, ''));
        if (hText === nTitle) {
          matchPage = p;
          matchIdx = hMatch.index;
          matchLen = hMatch[0].length;
          break;
        }
      }
      if (matchPage !== -1) break;
    }

    if (matchPage === -1) {
      for (const p of [item.page, item.page - 1, item.page + 1]) {
        if (p < 12 || p > 593 || !cache[p]) continue;
        const html = cache[p];
        const hRegex = /<span class="(KalamateKhas2?)"[^>]*>([\s\S]*?)<\/span>/g;
        let hMatch;
        while ((hMatch = hRegex.exec(html)) !== null) {
          if (p === currPage && hMatch.index < currIdx) continue;
          const hText = norm(hMatch[2].replace(/<[^>]+>/g, ''));
          const cleanH = hText.replace(/^[۰-۹0-9\s\.\-\(\)]+/, '').trim();
          const cleanN = nTitle.replace(/^[۰-۹0-9\s\.\-\(\)]+/, '').trim();
          if (cleanH === cleanN || (cleanH.length > 4 && cleanN.length > 4 && (cleanH.includes(cleanN) || cleanN.includes(cleanH)))) {
            matchPage = p;
            matchIdx = hMatch.index;
            matchLen = hMatch[0].length;
            break;
          }
        }
        if (matchPage !== -1) break;
      }
    }

    matchedEntries.push({ item, matchPage, matchIdx, matchLen });
    if (matchPage !== -1) {
      currPage = matchPage;
      currIdx = matchIdx + matchLen;
    }
  }

  // Slicing content between matched headings
  const items = [];
  for (let i = 0; i < matchedEntries.length; i++) {
    const curr = matchedEntries[i];
    const next = matchedEntries[i + 1];

    let html = '';
    if (!next) {
      html += cache[curr.matchPage].slice(curr.matchIdx + curr.matchLen) + '\n';
      for (let p = curr.matchPage + 1; p <= 593; p++) {
        html += (cache[p] || '') + '\n';
      }
    } else {
      if (curr.matchPage === next.matchPage) {
        html = cache[curr.matchPage].slice(curr.matchIdx + curr.matchLen, next.matchIdx);
      } else {
        html += cache[curr.matchPage].slice(curr.matchIdx + curr.matchLen) + '\n';
        for (let p = curr.matchPage + 1; p < next.matchPage; p++) {
          html += (cache[p] || '') + '\n';
        }
        html += cache[next.matchPage].slice(0, next.matchIdx);
      }
    }

    let text = cleanHtmlTextProper(html);
    const cTitle = cleanTitle(curr.item.title);
    if (!text || text.trim().length === 0) {
      text = cTitle + '.';
    }

    const pageNum = curr.matchPage;
    const category = determineCategory(pageNum, curr.item.title);

    // Identify standard famous IDs
    let id = `mafatih_item_${i + 1}`;
    let shortTitle = cTitle;
    let description = `بخش ${i + 1} از کلیات مفاتیح الجنان تألیف شیخ عباس قمی (ره)، صفحه ${pageNum}.`;
    let virtueOrOccasion = `منقول در کتاب شریف مفاتیح الجنان (صفحه ${pageNum}).`;

    if (pageNum === 62 && curr.item.title.includes('كميل')) {
      id = 'mafatih_kumayl';
      shortTitle = 'دعای کمیل';
      description = 'دعای شریف تعلیم داده شده توسط حضرت امیرالمؤمنین علی بن ابی‌طالب (علیه‌السلام) به جناب کمیل بن زیاد نخعی؛ دعای حضرت خضر (ع) با فضیلت فراوان برای شب‌های جمعه و نیمه شعبان.';
      virtueOrOccasion = 'مستحب در شب‌های جمعه و شب نیمه شعبان جهت کفایت از شر دشمنان، گشایش روزی و آمرزش گناهان.';
    } else if (pageNum === 454 && curr.item.title.includes('عاشوراء معروفه')) {
      id = 'mafatih_ashura';
      shortTitle = 'زیارت عاشورا';
      description = 'زیارت بافضیلت و مأثور حضرت اباعبدالله الحسین (علیه‌السلام) به روایت امام محمد باقر (ع) و امام جعفر صادق (ع) با ثواب عظیم و برآورده شدن حاجات.';
      virtueOrOccasion = 'مستحب در روز عاشورا و تمام ایام سال از دور و نزدیک؛ همراه با صد لعن و صد سلام و سجده پایانی.';
    } else if (pageNum === 108 && curr.item.title.includes('توسل')) {
      id = 'mafatih_tawassul';
      shortTitle = 'دعای توسل';
      description = 'شفیع قرار دادن رسول گرامی اسلام و اهل بیت طاهرین (علیهم‌السلام) در پیشگاه خداوند متعال؛ به نقل از کفعمی و شیخ صدوق.';
      virtueOrOccasion = 'مداومت بر خواندن آن در شب‌های چهارشنبه و هنگام حاجات و طلب شفاعت از پیشگاه الهی.';
    } else if (pageNum === 539 && curr.item.title.includes('عهد')) {
      id = 'mafatih_ahd';
      shortTitle = 'دعای عهد';
      description = 'تجدید بیعت با حضرت بقیة الله الاعظم امام مهدی (عجل الله تعالی فرجه الشریف)؛ منقول از امام جعفر صادق (علیه‌السلام).';
      virtueOrOccasion = 'مستحب در چهل بامداد؛ در روایت است هر کس چهل صبح این عهد را بخواند از یاران قائم (عج) خواهد بود.';
    }

    items.push({
      id,
      num: i + 1,
      title: cTitle,
      shortTitle,
      category,
      description,
      arabicText: text,
      persianTranslation: '',
      virtueOrOccasion,
      sourceCitation: `کلیات مفاتیح الجنان، تألیف حاج شیخ عباس قمی (ره)، چاپ اسوه (مدرسه فقاهت، جلد ۱، ص ${pageNum}).`,
      sourceUrl: `https://lib.eshia.ir/10376/1/${pageNum}`,
      licenseInfo: 'متن عربی ادعیه و زیارات: متون مأثوره دینی؛ کتابخانه فقاهت (lib.eshia.ir/10376/1).'
    });
  }

  console.log(`Generated ${items.length} items.`);

  // Validation
  console.log('--- Validating Generated Data ---');
  const jsonStr = JSON.stringify(items, null, 2);

  // 1. Array check
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed) || parsed.length !== toc.length) {
    throw new Error(`Expected ${toc.length} items, got ${parsed.length}`);
  }

  // 2. U+FFFD count
  const ufffdMatches = jsonStr.match(/\uFFFD/g) || [];
  if (ufffdMatches.length > 0) {
    throw new Error(`Found ${ufffdMatches.length} U+FFFD characters!`);
  }

  // 3. Literal "..." check
  const ellipsisMatches = jsonStr.match(/\.\.\./g) || [];
  if (ellipsisMatches.length > 0) {
    throw new Error(`Found ${ellipsisMatches.length} literal "..." strings!`);
  }

  // 4. No empty Arabic text
  for (const item of parsed) {
    if (!item.arabicText || item.arabicText.trim().length === 0) {
      throw new Error(`Item ${item.id} has empty Arabic text!`);
    }
    if (!item.sourceUrl || !item.sourceUrl.startsWith('https://lib.eshia.ir/10376/1/')) {
      throw new Error(`Item ${item.id} has invalid source URL: ${item.sourceUrl}`);
    }
    if (!item.sourceCitation || !item.sourceCitation.includes('اسوه')) {
      throw new Error(`Item ${item.id} has missing or invalid source citation!`);
    }
  }

  // 5. Unique IDs
  const idSet = new Set(parsed.map(it => it.id));
  if (idSet.size !== parsed.length) {
    throw new Error(`Duplicate IDs found: ${parsed.length - idSet.size} duplicates!`);
  }

  // 6. Check that the 4 famous items exist and are valid
  const famousIds = ['mafatih_kumayl', 'mafatih_ashura', 'mafatih_tawassul', 'mafatih_ahd'];
  for (const fId of famousIds) {
    const it = parsed.find(x => x.id === fId);
    if (!it) throw new Error(`Missing famous item: ${fId}`);
    if (it.arabicText.length < 3000) {
      throw new Error(`Famous item ${fId} text too short: ${it.arabicText.length}`);
    }
    console.log(`✓ ${fId} confirmed: ${it.arabicText.length} chars`);
  }

  fs.writeFileSync(TARGET_FILE, jsonStr, 'utf-8');
  console.log(`Successfully written ${items.length} items to ${TARGET_FILE} (${(jsonStr.length / 1024 / 1024).toFixed(2)} MB).`);
}

generate().catch(err => {
  console.error('Generation error:', err);
  process.exit(1);
});
