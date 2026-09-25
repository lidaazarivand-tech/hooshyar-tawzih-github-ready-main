const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = '/tmp/nahj_cache';
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 30,
  timeout: 10000
});

function fetchUrl(url, retries = 3) {
  return new Promise((resolve) => {
    function attempt(n) {
      const req = https.get(url, {
        agent,
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, n - 1).then(resolve);
        }
        const chunks = [];
        res.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          const data = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode === 200 && data.length > 500) {
            resolve(data);
          } else if (n > 1) {
            setTimeout(() => attempt(n - 1), 500);
          } else {
            resolve(null);
          }
        });
      });
      req.on('error', () => {
        if (n > 1) setTimeout(() => attempt(n - 1), 500);
        else resolve(null);
      });
      req.setTimeout(10000, () => {
        req.destroy();
        if (n > 1) setTimeout(() => attempt(n - 1), 500);
        else resolve(null);
      });
    }
    attempt(retries);
  });
}

function parseEntry(html, type, indexNumber, url) {
  if (!html) return null;

  // Title
  let title = '';
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s*-\s*پایگاه[\s\S]*$/, '').trim();
  }

  // Fallback title
  const typeName = type === 'sermon' ? 'خطبه' : type === 'letter' ? 'نامه' : 'حکمت';
  if (!title) {
    title = `${typeName} ${indexNumber}`;
  }

  // Faraz AR and TR
  const farazArBlocks = [];
  const farazTrBlocks = [];

  const arRegex = /faraz-txt-ar[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = arRegex.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) farazArBlocks.push(text);
  }

  const trRegex = /faraz-txt-tr[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  while ((m = trRegex.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) farazTrBlocks.push(text);
  }

  // Fallback if faraz classes are missing
  if (farazArBlocks.length === 0) {
    const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    for (const p of pMatches) {
      const clean = p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (clean.length > 20 && !clean.includes('پايگاه') && !clean.includes('حقوق')) {
        if (/[\u064B-\u0652]/.test(clean)) {
          farazArBlocks.push(clean);
        } else {
          farazTrBlocks.push(clean);
        }
      }
    }
  }

  const arabicText = farazArBlocks.join('\n\n');
  const persianTranslation = farazTrBlocks.join('\n\n');

  const categoryTitle = type === 'sermon' ? 'خطبه‌ها' : type === 'letter' ? 'نامه‌ها' : 'حکمت‌ها';

  return {
    id: `nahj_${type}_${indexNumber}`,
    categoryId: 'nahj',
    num: indexNumber,
    type,
    title: `${typeName} ${indexNumber}: ${title}`,
    shortTitle: `${typeName} ${indexNumber}`,
    category: categoryTitle,
    description: `${typeName} شماره ${indexNumber} نهج‌البلاغه شریف`,
    arabicText,
    persianTranslation,
    arabicFarazes: farazArBlocks,
    persianFarazes: farazTrBlocks,
    sourceCitation: 'متن عربی: نهج‌البلاغه، گردآوری سید شریف رضی (منبع: پایگاه تخصصی نهج‌البلاغه، fa.balaghah.net) | ترجمه فارسی: سید جعفر شهیدی (منبع: پایگاه تخصصی نهج‌البلاغه، fa.balaghah.net)',
    sourceUrl: url
  };
}

async function run() {
  const index = JSON.parse(fs.readFileSync('/tmp/nahj_index.json'));
  
  const tasks = [];
  
  ['sermon', 'letter', 'wisdom'].forEach(type => {
    const items = index[type] || [];
    items.forEach((item, idx) => {
      const num = idx + 1;
      const cachePath = path.join(CACHE_DIR, `${type}_${num}.json`);
      tasks.push({
        type,
        num,
        url: item.url,
        cachePath
      });
    });
  });

  console.log(`Total tasks to download: ${tasks.length}`);

  let completed = 0;
  let cached = 0;
  const CONCURRENCY = 20;
  let running = 0;
  let taskIndex = 0;

  return new Promise((resolve) => {
    function next() {
      if (taskIndex >= tasks.length && running === 0) {
        console.log(`\nAll downloads finished! Completed: ${completed}, From cache: ${cached}`);
        return resolve();
      }

      while (running < CONCURRENCY && taskIndex < tasks.length) {
        const task = tasks[taskIndex++];
        running++;

        if (fs.existsSync(task.cachePath)) {
          cached++;
          running--;
          continue;
        }

        fetchUrl(task.url).then((html) => {
          running--;
          if (html) {
            const entry = parseEntry(html, task.type, task.num, task.url);
            if (entry && entry.arabicText.length > 0) {
              fs.writeFileSync(task.cachePath, JSON.stringify(entry, null, 2));
              completed++;
              if (completed % 25 === 0) {
                console.log(`Downloaded ${completed + cached}/${tasks.length} (${task.type} ${task.num})`);
              }
            } else {
              console.error(`Empty entry: ${task.type} ${task.num} - ${task.url}`);
            }
          } else {
            console.error(`Failed to fetch: ${task.type} ${task.num} - ${task.url}`);
          }
          next();
        });
      }
    }

    next();
  });
}

run();
