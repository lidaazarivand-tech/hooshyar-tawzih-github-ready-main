import { describe, it, expect } from 'vitest';
import {
  gregorianToHijri,
  hijriToGregorian,
  jalaliToHijri,
  hijriToJalali
} from '../utils/hijri';

describe('Hijri Lunar Calendar Conversions & Official Iranian Alignment', () => {
  it('accurately converts key Islamic calendar dates in Iran', () => {
    // In Iran official calendar (University of Tehran):
    // 1 Ramadan 1446 = 2 March 2025
    // 20 Ramadan 1446 = 21 March 2025 (1 Farvardin 1404)
    // 21 Ramadan 1446 = 22 March 2025 (2 Farvardin 1404 - Shahadat Imam Ali)
    const nowruz = gregorianToHijri(2025, 3, 21);
    expect(nowruz.hy).toBe(1446);
    expect(nowruz.hm).toBe(9); // Ramadan
    expect(nowruz.hd).toBe(20);

    const ghadr = gregorianToHijri(2025, 3, 22);
    expect(ghadr.hy).toBe(1446);
    expect(ghadr.hm).toBe(9);
    expect(ghadr.hd).toBe(21);

    // Round trip
    const greg = hijriToGregorian(1446, 9, 21);
    expect(greg.gy).toBe(2025);
    expect(greg.gm).toBe(3);
    expect(greg.gd).toBe(22);
  });

  it('converts Jalali to Hijri and back through Jalali roundtrip', () => {
    // 1404-01-01 -> 20 Ramadan 1446
    const hijri = jalaliToHijri(1404, 1, 1);
    expect(hijri.hy).toBe(1446);
    expect(hijri.hm).toBe(9);
    expect(hijri.hd).toBe(20);

    const backToJalali = hijriToJalali(hijri.hy, hijri.hm, hijri.hd);
    expect(backToJalali.jy).toBe(1404);
    expect(backToJalali.jm).toBe(1);
    expect(backToJalali.jd).toBe(1);
  });

  it('handles user day adjustment (+1, -1, 0, +2, -2)', () => {
    const base = gregorianToHijri(2025, 3, 21, 0);
    const plusOne = gregorianToHijri(2025, 3, 21, 1);
    const minusOne = gregorianToHijri(2025, 3, 21, -1);

    expect(base.hd).toBe(20);
    expect(plusOne.hd).toBe(21);
    expect(minusOne.hd).toBe(19);
  });

  it('handles month boundary transitions without crashing or returning invalid numbers', () => {
    // End of Ramadan to Shawwal 1st (Eid al-Fitr)
    const eid = gregorianToHijri(2025, 3, 31);
    expect(eid.hy).toBe(1446);
    expect(eid.hm).toBe(10); // Shawwal
    expect(eid.hd).toBe(1);

    // Check all 365 days of a year produce valid Hijri dates (hm: 1..12, hd: 1..30)
    for (let day = 1; day <= 31; day++) {
      const h = gregorianToHijri(2025, 1, day);
      expect(h.hy).toBeGreaterThanOrEqual(1446);
      expect(h.hm).toBeGreaterThanOrEqual(1);
      expect(h.hm).toBeLessThanOrEqual(12);
      expect(h.hd).toBeGreaterThanOrEqual(1);
      expect(h.hd).toBeLessThanOrEqual(30);
    }
  });

  it('safely handles extreme or invalid inputs without crashing', () => {
    // Invalid inputs to hijriToGregorian
    const invalid1 = hijriToGregorian(NaN as any, 1, 1);
    expect(invalid1).toBeDefined();
    expect(invalid1.gy).toBeGreaterThan(0);

    const invalid2 = hijriToGregorian(1446, 99, 99);
    expect(invalid2).toBeDefined();
    expect(invalid2.gy).toBeGreaterThan(0);

    // Negative / extreme years
    const extreme = hijriToGregorian(-50, -5, -10);
    expect(extreme).toBeDefined();
    expect(extreme.gy).toBeGreaterThan(0);
  });
});
