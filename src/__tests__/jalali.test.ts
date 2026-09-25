import { describe, it, expect } from 'vitest';
import {
  gregorianToJalali,
  jalaliToGregorian,
  isLeapYear,
  getJalaliMonthLength,
  isValidJalali,
  getPersianDayOfWeek,
  getJalaliDayOfWeek,
  getDayOfWeekName,
  getDaysDifference,
  addDaysToJalali
} from '../utils/jalali';

describe('Jalali Calendar Utilities', () => {
  it('converts known historical Gregorian dates to Jalali accurately', () => {
    // Nowruz 1404: March 20/21, 2025
    const nowruz1404 = gregorianToJalali(2025, 3, 20);
    expect(nowruz1404.jy).toBe(1403);
    expect(nowruz1404.jm).toBe(12);
    expect(nowruz1404.jd).toBe(30);

    const march21 = gregorianToJalali(2025, 3, 21);
    expect(march21.jy).toBe(1404);
    expect(march21.jm).toBe(1);
    expect(march21.jd).toBe(1);

    // Islamic Revolution: 11 Feb 1979 -> 22 Bahman 1357
    const bahman22 = gregorianToJalali(1979, 2, 11);
    expect(bahman22.jy).toBe(1357);
    expect(bahman22.jm).toBe(11);
    expect(bahman22.jd).toBe(22);
  });

  it('converts Jalali dates to Gregorian accurately (round-trip test)', () => {
    const originalJalali = { jy: 1404, jm: 5, jd: 15 };
    const greg = jalaliToGregorian(originalJalali.jy, originalJalali.jm, originalJalali.jd);
    const convertedBack = gregorianToJalali(greg.gy, greg.gm, greg.gd);

    expect(convertedBack.jy).toBe(originalJalali.jy);
    expect(convertedBack.jm).toBe(originalJalali.jm);
    expect(convertedBack.jd).toBe(originalJalali.jd);
  });

  it('accurately identifies Jalali leap years (سال کبیسه)', () => {
    // 1395 is leap, 1399 is leap, 1403 is leap
    expect(isLeapYear(1395)).toBe(true);
    expect(isLeapYear(1399)).toBe(true);
    expect(isLeapYear(1403)).toBe(true);

    // 1400, 1401, 1402, 1404 are normal years (365 days)
    expect(isLeapYear(1400)).toBe(false);
    expect(isLeapYear(1401)).toBe(false);
    expect(isLeapYear(1402)).toBe(false);
    expect(isLeapYear(1404)).toBe(false);
  });

  it('returns correct month lengths for all 12 Jalali months including leap years', () => {
    // First 6 months (Farvardin to Shahrivar) always have 31 days
    for (let m = 1; m <= 6; m++) {
      expect(getJalaliMonthLength(1404, m)).toBe(31);
    }

    // Next 5 months (Mehr to Bahman) always have 30 days
    for (let m = 7; m <= 11; m++) {
      expect(getJalaliMonthLength(1404, m)).toBe(30);
    }

    // Month 12 (Esfand) in normal year (1404) has 29 days
    expect(getJalaliMonthLength(1404, 12)).toBe(29);

    // Month 12 (Esfand) in leap year (1403) has 30 days
    expect(getJalaliMonthLength(1403, 12)).toBe(30);
  });

  it('validates Jalali dates with boundary awareness', () => {
    expect(isValidJalali(1404, 1, 1)).toBe(true);
    expect(isValidJalali(1404, 1, 31)).toBe(true);
    expect(isValidJalali(1404, 1, 32)).toBe(false);

    // Mehr has 30 days
    expect(isValidJalali(1404, 7, 30)).toBe(true);
    expect(isValidJalali(1404, 7, 31)).toBe(false);

    // Esfand in normal year has 29 days
    expect(isValidJalali(1404, 12, 29)).toBe(true);
    expect(isValidJalali(1404, 12, 30)).toBe(false);

    // Esfand in leap year 1403 has 30 days
    expect(isValidJalali(1403, 12, 30)).toBe(true);
    expect(isValidJalali(1403, 12, 31)).toBe(false);
  });

  it('maps Persian weekdays correctly (0 = شنبه, ..., 6 = جمعه)', () => {
    // 1 Farvardin 1404 is Friday (جمعه = 6)
    const dayOfWeek = getJalaliDayOfWeek(1404, 1, 1);
    expect(dayOfWeek).toBe(6);
    expect(getDayOfWeekName(6)).toBe('جمعه');

    // 2 Farvardin 1404 is Saturday (شنبه = 0)
    const nextDay = getJalaliDayOfWeek(1404, 1, 2);
    expect(nextDay).toBe(0);
    expect(getDayOfWeekName(0)).toBe('شنبه');
  });

  it('calculates days difference between Jalali dates across month and year boundaries', () => {
    const d1 = { jy: 1404, jm: 1, jd: 1 };
    const d2 = { jy: 1404, jm: 1, jd: 15 };
    expect(getDaysDifference(d1, d2)).toBe(14);

    // Crossing month boundary (Farvardin has 31 days)
    const endFarvardin = { jy: 1404, jm: 1, jd: 31 };
    const startOrdibehesht = { jy: 1404, jm: 2, jd: 1 };
    expect(getDaysDifference(endFarvardin, startOrdibehesht)).toBe(1);

    // Across one full standard year (1404 -> 1405 is 365 days)
    const nextYear = { jy: 1405, jm: 1, jd: 1 };
    expect(getDaysDifference(d1, nextYear)).toBe(365);
  });

  it('adds positive and negative days to Jalali dates safely', () => {
    const start = { jy: 1404, jm: 1, jd: 30 };
    const plusTwo = addDaysToJalali(start, 2); // 30 Farvardin + 2 days -> 1 Ordibehesht
    expect(plusTwo.jy).toBe(1404);
    expect(plusTwo.jm).toBe(2);
    expect(plusTwo.jd).toBe(1);

    const minusOne = addDaysToJalali(plusTwo, -1);
    expect(minusOne.jy).toBe(1404);
    expect(minusOne.jm).toBe(1);
    expect(minusOne.jd).toBe(31);
  });

  it('handles invalid or extreme numeric inputs gracefully without crashing', () => {
    // Fallback on invalid inputs
    const safe1 = gregorianToJalali(NaN, NaN, NaN);
    expect(safe1).toBeDefined();
    expect(Number.isFinite(safe1.jy)).toBe(true);

    const safe2 = jalaliToGregorian(999999, -5, 100);
    expect(safe2).toBeDefined();
    expect(Number.isFinite(safe2.gy)).toBe(true);

    expect(isLeapYear(NaN)).toBe(false);
    expect(isLeapYear(-1000)).toBe(false);
  });

  it('accurately verifies round trips across all 12 Jalali months', () => {
    for (let month = 1; month <= 12; month++) {
      const original = { jy: 1404, jm: month, jd: 15 };
      const greg = jalaliToGregorian(original.jy, original.jm, original.jd);
      const back = gregorianToJalali(greg.gy, greg.gm, greg.gd);

      expect(back.jy).toBe(original.jy);
      expect(back.jm).toBe(original.jm);
      expect(back.jd).toBe(original.jd);
    }
  });

  it('correctly handles leap year 1403 having 366 days and adding 366 days', () => {
    // 1403 is a leap year (366 days)
    expect(isLeapYear(1403)).toBe(true);
    const start1403 = { jy: 1403, jm: 1, jd: 1 };
    const end1403 = addDaysToJalali(start1403, 365);
    expect(end1403.jy).toBe(1403);
    expect(end1403.jm).toBe(12);
    expect(end1403.jd).toBe(30);

    const nextYear = addDaysToJalali(start1403, 366);
    expect(nextYear.jy).toBe(1404);
    expect(nextYear.jm).toBe(1);
    expect(nextYear.jd).toBe(1);
  });

  it('correctly determines future leap years in the standard Jalali cycle', () => {
    // Standard Iranian 4-year leap cycle: 1403, 1408, 1412, 1416
    expect(isLeapYear(1408)).toBe(true);
    expect(isLeapYear(1412)).toBe(true);
    expect(isLeapYear(1416)).toBe(true);
    expect(isLeapYear(1405)).toBe(false);
    expect(isLeapYear(1406)).toBe(false);
    expect(isLeapYear(1407)).toBe(false);
  });
});
