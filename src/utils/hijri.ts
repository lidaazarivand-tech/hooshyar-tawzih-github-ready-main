import { HijriDate, GregorianDate, JalaliDate } from '../types/calendar';
import { jalaliToGregorian, gregorianToJalali } from './jalali';
import { IRAN_OFFICIAL_HIJRI_MONTH_STARTS, IranHijriMonthStart } from '../data/iranOfficialHijriData';

// Pre-computed UTC timestamps for official Iranian calendar starts
const SORTED_OFFICIAL_STARTS: (IranHijriMonthStart & { utc: number })[] = IRAN_OFFICIAL_HIJRI_MONTH_STARTS
  .map(m => ({
    ...m,
    utc: Date.UTC(m.gy, m.gm - 1, m.gd, 12, 0, 0)
  }))
  .sort((a, b) => a.utc - b.utc);

const FIRST_OFFICIAL_UTC = SORTED_OFFICIAL_STARTS[0]?.utc ?? 0;
const LAST_OFFICIAL_UTC = SORTED_OFFICIAL_STARTS[SORTED_OFFICIAL_STARTS.length - 1]?.utc ?? 0;

/**
 * Official Iranian Lunar Calendar lookup based on Calendar Center of University of Tehran
 */
function getOfficialIranHijri(gy: number, gm: number, gd: number, adjustment: number = 0): HijriDate | null {
  if (SORTED_OFFICIAL_STARTS.length === 0) return null;
  const targetUtc = Date.UTC(gy, gm - 1, gd + adjustment, 12, 0, 0);

  if (targetUtc >= FIRST_OFFICIAL_UTC && targetUtc <= LAST_OFFICIAL_UTC + 35 * 86400000) {
    for (let i = SORTED_OFFICIAL_STARTS.length - 1; i >= 0; i--) {
      const monthStart = SORTED_OFFICIAL_STARTS[i];
      if (targetUtc >= monthStart.utc) {
        const diffMs = targetUtc - monthStart.utc;
        const diffDays = Math.round(diffMs / 86400000);
        const hd = diffDays + 1;
        if (hd > 30) {
          return null;
        }
        return {
          hy: monthStart.hy,
          hm: monthStart.hm,
          hd: Math.max(1, hd)
        };
      }
    }
  }
  return null;
}

/**
 * Official Iranian Lunar Calendar reverse lookup (Hijri to Gregorian)
 */
function getOfficialIranGregorian(hy: number, hm: number, hd: number, adjustment: number = 0): GregorianDate | null {
  const monthStart = SORTED_OFFICIAL_STARTS.find(m => m.hy === hy && m.hm === hm);
  if (!monthStart) return null;

  const targetUtc = monthStart.utc + (hd - 1 - adjustment) * 86400000;
  const d = new Date(targetUtc);
  return {
    gy: d.getUTCFullYear(),
    gm: d.getUTCMonth() + 1,
    gd: d.getUTCDate()
  };
}

// Reuse single DateTimeFormat instance instead of creating new instances on every call
let cachedIntlFormatter: Intl.DateTimeFormat | null = null;
let intlFormatterTested = false;

function getIntlFormatter(): Intl.DateTimeFormat | null {
  if (!intlFormatterTested) {
    intlFormatterTested = true;
    try {
      cachedIntlFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      cachedIntlFormatter = null;
    }
  }
  return cachedIntlFormatter;
}

// In-memory memoization cache for rapid repeated lookups
const hijriLookupCache = new Map<string, HijriDate>();

/**
 * Standard Islamic / Hijri conversion
 * 1. Checks Official Iranian Hijri table (100% accurate for official Iran holidays & dates)
 * 2. Uses browser/platform standard Intl Umm al-Qura calendar with day adjustment support
 * 3. Fallback to robust astronomical mathematics.
 */
export function gregorianToHijri(gy: number, gm: number, gd: number, adjustment: number = 0): HijriDate {
  const cacheKey = `${gy}-${gm}-${gd}-${adjustment}`;
  const cached = hijriLookupCache.get(cacheKey);
  if (cached) return cached;

  // 1. Official Iran Calendar Check
  const official = getOfficialIranHijri(gy, gm, gd, adjustment);
  if (official) {
    hijriLookupCache.set(cacheKey, official);
    return official;
  }

  // 2. Intl Umm al-Qura
  const formatter = getIntlFormatter();
  if (formatter) {
    try {
      const date = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
      if (adjustment !== 0) {
        date.setUTCDate(date.getUTCDate() + adjustment);
      }

      const parts = formatter.formatToParts(date);
      let hy = 0, hm = 0, hd = 0;
      for (const p of parts) {
        if (p.type === 'year') hy = parseInt(p.value.replace(/[^0-9]/g, ''), 10);
        if (p.type === 'month') hm = parseInt(p.value, 10);
        if (p.type === 'day') hd = parseInt(p.value, 10);
      }

      if (hy > 0 && hm > 0 && hd > 0) {
        const result: HijriDate = {
          hy,
          hm: Math.max(1, Math.min(12, hm)),
          hd: Math.max(1, Math.min(30, hd))
        };
        hijriLookupCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      // Fallback below if Intl fails
    }
  }

  // 3. Robust Mathematical Fallback
  let day = gd + adjustment;
  let month = gm;
  let year = gy;

  if (month < 3) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;

  let epoch = 1948439.5;
  let daysSinceEpoch = jd - epoch;
  let cycles = Math.floor((daysSinceEpoch - 1) / 10631);
  let remDays = daysSinceEpoch - 1 - cycles * 10631;

  let hYear = Math.floor((remDays + 1) / 354.366) + cycles * 30 + 1;
  let dayOfYear = remDays - Math.floor((hYear - 1 - cycles * 30) * 354.366);

  let hMonth = Math.min(12, Math.max(1, Math.ceil((dayOfYear - 1) / 29.5) + 1));
  let hDay = Math.floor(dayOfYear - (hMonth - 1) * 29.5) + 1;

  if (hDay <= 0) {
    hMonth -= 1;
    if (hMonth <= 0) {
      hMonth = 12;
      hYear -= 1;
    }
    hDay = 30 + hDay;
  }
  if (hDay > 30) {
    hDay = hDay - 30;
    hMonth += 1;
    if (hMonth > 12) {
      hMonth = 1;
      hYear += 1;
    }
  }

  const result: HijriDate = {
    hy: Math.floor(hYear),
    hm: Math.max(1, Math.min(12, Math.floor(hMonth))),
    hd: Math.max(1, Math.min(30, Math.floor(hDay)))
  };
  hijriLookupCache.set(cacheKey, result);
  return result;
}

/**
 * Convert Jalali date to Hijri date
 */
export function jalaliToHijri(jy: number, jm: number, jd: number, adjustment: number = 0): HijriDate {
  const g = jalaliToGregorian(jy, jm, jd);
  return gregorianToHijri(g.gy, g.gm, g.gd, adjustment);
}

/**
 * Convert Hijri date to Gregorian date safely
 */
export function hijriToGregorian(hy: number, hm: number, hd: number, adjustment: number = 0): GregorianDate {
  try {
    const safeHy = Number.isFinite(hy) ? Math.max(1, Math.min(3000, hy)) : 1446;
    const safeHm = Number.isFinite(hm) ? Math.max(1, Math.min(12, hm)) : 1;
    const safeHd = Number.isFinite(hd) ? Math.max(1, Math.min(30, hd)) : 1;

    // 1. Check official table first
    const officialG = getOfficialIranGregorian(safeHy, safeHm, safeHd, adjustment);
    if (officialG) {
      return officialG;
    }

    // 2. Approximate starting Gregorian date:
    const approxDays = Math.round((safeHy - 1) * 354.367 + (safeHm - 1) * 29.5 + safeHd);
    const epochDate = new Date(Date.UTC(622, 6, 16, 12, 0, 0)); // July 16, 622
    const target = new Date(epochDate.getTime() + (approxDays - 1) * 86400000);

    if (isNaN(target.getTime())) {
      return { gy: 2025, gm: 3, gd: 21 };
    }

    // Exact iterative refinement using gregorianToHijri
    for (let step = 0; step < 15; step++) {
      const h = gregorianToHijri(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), adjustment);
      const diffDays = (safeHy - h.hy) * 354 + (safeHm - h.hm) * 29.5 + (safeHd - h.hd);
      if (Math.abs(diffDays) < 0.5 && h.hy === safeHy && h.hm === safeHm && h.hd === safeHd) {
        break;
      }
      const stepDiff = Math.max(-5, Math.min(5, Math.round(diffDays)));
      if (stepDiff === 0) {
        if (h.hd !== safeHd) {
          target.setUTCDate(target.getUTCDate() + (safeHd - h.hd));
        }
        break;
      }
      target.setUTCDate(target.getUTCDate() + stepDiff);
    }

    const resGy = target.getUTCFullYear();
    const resGm = target.getUTCMonth() + 1;
    const resGd = target.getUTCDate();

    if (!Number.isFinite(resGy) || !Number.isFinite(resGm) || !Number.isFinite(resGd)) {
      return { gy: 2025, gm: 3, gd: 21 };
    }

    return {
      gy: resGy,
      gm: resGm,
      gd: resGd
    };
  } catch (e) {
    return { gy: 2025, gm: 3, gd: 21 };
  }
}

/**
 * Convert Hijri date to Jalali date
 */
export function hijriToJalali(hy: number, hm: number, hd: number, adjustment: number = 0): JalaliDate {
  const g = hijriToGregorian(hy, hm, hd, adjustment);
  return gregorianToJalali(g.gy, g.gm, g.gd);
}
