const fs = require('fs');
const path = require('path');

const CACHE_DIR = '/tmp/nahj_cache';
const TARGET_PATH = path.join(__dirname, '../src/data/nahjFullData.json');

function toPersianDigits(n) {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

const FAMOUS_TITLES = {
  'sermon_1': 'آفرینش جهان و انسان و بعثت انبیاء',
  'sermon_2': 'اوضاع جهان پیش از بعثت و ستایش اهل‌بیت (ع)',
  'sermon_3': 'خطبه شقشقیه (دردشناسانه و تاریخی)',
  'sermon_16': 'هنگام بیعت مردم در مدینه و اصول عدالت',
  'sermon_27': 'خطبه جهاد و فضیلت مجاهدان راه خدا',
  'sermon_91': 'خطبه اشباح (در اوصاف فرشتگان و آفرینش)',
  'sermon_92': 'هنگام بیعت مردم و شروط پذیرش حکومت',
  'sermon_109': 'در بیان قدرت پروردگار و شگفتی طاووس',
  'sermon_192': 'خطبه قاصعه (بزرگ‌ترین خطبه اخلاقی در نکوهش کبر)',
  'sermon_193': 'خطبه همام (اوصاف متقین و پارسایان)',
  'sermon_224': 'شگفتی خلقت مورچه و ملخ و حکمت خداوندی',
  'letter_31': 'وصیت اخلاقی و تربیتی به امام حسن مجتبی (ع)',
  'letter_47': 'وصیت پس از ضربت ابن‌ملجم به حسنین (ع)',
  'letter_53': 'عهدنامه مالک اشتر نخعی (منشور کشورداری و دادگستری)',
  'letter_62': 'نامه به مردم مصر در آغاز خلافت',
  'wisdom_1': 'رفتار مؤمن در فتنه‌ها (چون شتر دوساله)',
  'wisdom_147': 'سخنان با کمیل بن زیاد در انواع حاملان دانش',
};

const files = fs.readdirSync(CACHE_DIR);
const items = [];

for (const f of files) {
  if (!f.endsWith('.json')) continue;
  const content = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf-8'));
  
  if (content.type === 'sermon' && content.num > 241) continue;
  if (content.type === 'letter' && content.num > 79) continue;
  if (content.type === 'wisdom' && content.num > 480) continue;

  const typeName = content.type === 'sermon' ? 'خطبه' : content.type === 'letter' ? 'نامه' : 'حکمت';
  const categoryTitle = content.type === 'sermon' ? 'خطبه‌ها' : content.type === 'letter' ? 'نامه‌ها' : 'حکمت‌ها';
  const numFa = toPersianDigits(content.num);

  const key = `${content.type}_${content.num}`;
  const famous = FAMOUS_TITLES[key];

  let rawTitleText = content.title;
  // If title looks like "خطبه 1: خطبه یکم" or "حکمت 1: حکمت یکم"
  // Let's format nicely:
  const colonIdx = rawTitleText.indexOf(':');
  let sub = colonIdx !== -1 ? rawTitleText.substring(colonIdx + 1).trim() : rawTitleText;

  let title = `${typeName} ${numFa}: ${sub}`;
  if (famous) {
    title += ` (${famous})`;
  }

  const shortTitle = `${typeName} ${numFa}`;

  // Build clean description preview from translation
  let preview = '';
  if (content.persianTranslation) {
    const cleanTr = content.persianTranslation.replace(/\s+/g, ' ').trim();
    if (cleanTr.length > 130) {
      preview = cleanTr.substring(0, 130) + '...';
    } else {
      preview = cleanTr;
    }
  }

  const description = famous ? `${famous} — ${preview}` : preview || `${typeName} شماره ${numFa} نهج‌البلاغه شریف`;

  items.push({
    id: `nahj_${content.type}_${content.num}`,
    num: content.num,
    type: content.type,
    title,
    shortTitle,
    category: categoryTitle,
    description,
    arabicText: content.arabicText,
    persianTranslation: content.persianTranslation,
    arabicFarazes: content.arabicFarazes || [],
    persianFarazes: content.persianFarazes || [],
    virtueOrOccasion: famous || undefined,
    sourceCitation: 'متن عربی: نهج‌البلاغه، گردآوری سید شریف رضی (منبع: پایگاه تخصصی نهج‌البلاغه، fa.balaghah.net) | ترجمه فارسی: سید جعفر شهیدی (منبع: پایگاه تخصصی نهج‌البلاغه، fa.balaghah.net)',
    sourceUrl: content.sourceUrl
  });
}

// Sort order: sermon -> letter -> wisdom, then by num
const typePriority = { sermon: 1, letter: 2, wisdom: 3 };
items.sort((a, b) => {
  if (typePriority[a.type] !== typePriority[b.type]) {
    return typePriority[a.type] - typePriority[b.type];
  }
  return a.num - b.num;
});

console.log(`Writing ${items.length} formatted items to ${TARGET_PATH}...`);
fs.writeFileSync(TARGET_PATH, JSON.stringify(items));
const stat = fs.statSync(TARGET_PATH);
console.log(`Written successfully! Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
