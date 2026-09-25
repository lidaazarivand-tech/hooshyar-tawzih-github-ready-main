import * as jalaali from 'jalaali-js';
import { JalaliDate, GregorianDate } from '../types/calendar';
import { PERSIAN_WEEK_DAYS } from './persianNumber';

/**
 * Convert Gregorian date to Jalali date safely
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  try {
    const safeGy = Number.isFinite(gy) ? gy : 2025;
    const safeGm = Number.isFinite(gm) ? Math.max(1, Math.min(12, gm)) : 1;
    const safeGd = Number.isFinite(gd) ? Math.max(1, Math.min(31, gd)) : 1;
    return jalaali.toJalaali(safeGy, safeGm, safeGd);
  } catch (e) {
    return { jy: 1404, jm: 1, jd: 1 };
  }
}

/**
 * Convert Jalali date to Gregorian date safely
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  try {
    const safeJy = Number.isFinite(jy) ? Math.max(-60, Math.min(3000, jy)) : 1404;
    const safeJm = Number.isFinite(jm) ? Math.max(1, Math.min(12, jm)) : 1;
    const maxDays = getJalaliMonthLength(safeJy, safeJm);
    const safeJd = Number.isFinite(jd) ? Math.max(1, Math.min(maxDays, jd)) : 1;
    return jalaali.toGregorian(safeJy, safeJm, safeJd);
  } catch (e) {
    return { gy: 2025, gm: 3, gd: 21 };
  }
}

/**
 * Check if a Jalali year is leap year (کبیسه) safely
 */
export function isLeapYear(jy: number): boolean {
  try {
    if (!Number.isFinite(jy) || jy < -60 || jy > 3000) return false;
    return jalaali.isLeapJalaaliYear(jy);
  } catch (e) {
    return false;
  }
}

/**
 * Get the number of days in a specific Jalali month safely
 */
export function getJalaliMonthLength(jy: number, jm: number): number {
  try {
    const safeJy = Number.isFinite(jy) ? Math.max(-60, Math.min(3000, jy)) : 1404;
    const safeJm = Number.isFinite(jm) ? Math.max(1, Math.min(12, jm)) : 1;
    return jalaali.jalaaliMonthLength(safeJy, safeJm);
  } catch (e) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return 29;
  }
}

/**
 * Check if Jalali date is valid safely
 */
export function isValidJalali(jy: number, jm: number, jd: number): boolean {
  try {
    if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return false;
    return jalaali.isValidJalaaliDate(jy, jm, jd);
  } catch (e) {
    return false;
  }
}

/**
 * Get current system date in Jalali
 */
export function getTodayJalali(): JalaliDate {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Get today in Gregorian
 */
export function getTodayGregorian(): GregorianDate {
  const now = new Date();
  return {
    gy: now.getFullYear(),
    gm: now.getMonth() + 1,
    gd: now.getDate()
  };
}

/**
 * Get Persian Day of Week index (0 = شنبه, ..., 6 = جمعه)
 */
export function getPersianDayOfWeek(gy: number, gm: number, gd: number): number {
  const date = new Date(gy, gm - 1, gd);
  const gDay = date.getDay(); // 0 (Sunday) to 6 (Saturday)
  return (gDay + 1) % 7;
}

/**
 * Get Persian Day of Week for Jalali Date
 */
export function getJalaliDayOfWeek(jy: number, jm: number, jd: number): number {
  const g = jalaliToGregorian(jy, jm, jd);
  return getPersianDayOfWeek(g.gy, g.gm, g.gd);
}

/**
 * Get Persian Day of Week Name
 */
export function getDayOfWeekName(dayIndex: number): string {
  const item = PERSIAN_WEEK_DAYS.find(d => d.key === dayIndex);
  return item ? item.name : 'شنبه';
}

/**
 * Get Jalali month starting day-of-week index (0 = شنبه, ..., 6 = جمعه)
 */
export function getMonthFirstDayOfWeek(jy: number, jm: number): number {
  return getJalaliDayOfWeek(jy, jm, 1);
}

/**
 * Calculate difference in days between two Jalali dates safely using UTC noon
 */
export function getDaysDifference(d1: JalaliDate, d2: JalaliDate): number {
  const g1 = jalaliToGregorian(d1.jy, d1.jm, d1.jd);
  const g2 = jalaliToGregorian(d2.jy, d2.jm, d2.jd);
  
  const utc1 = Date.UTC(g1.gy, g1.gm - 1, g1.gd, 12, 0, 0);
  const utc2 = Date.UTC(g2.gy, g2.gm - 1, g2.gd, 12, 0, 0);
  
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a Jalali date safely using UTC noon (immune to DST and midnight edge shifts)
 */
export function addDaysToJalali(date: JalaliDate, days: number): JalaliDate {
  const g = jalaliToGregorian(date.jy, date.jm, date.jd);
  const dt = new Date(Date.UTC(g.gy, g.gm - 1, g.gd, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return gregorianToJalali(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
