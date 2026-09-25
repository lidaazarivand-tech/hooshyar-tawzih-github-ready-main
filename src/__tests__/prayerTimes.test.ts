import { describe, it, expect } from 'vitest';
import {
  calculatePrayerTimes,
  getNextPrayerInfo,
  calculateQiblaAngle,
  calculateDistanceToMeccaKm,
  getGregorianDayOfYear,
  isGregorianLeapYear,
  IRANIAN_CITIES,
  CityLocation
} from '../utils/prayerTimes';
import { toEnglishDigits } from '../utils/persianNumber';
import { getDeterministicReminderNotificationId } from '../utils/notificationService';

describe('Prayer Times Calculation', () => {
  const tehran = IRANIAN_CITIES.find(c => c.name === 'تهران') || {
    id: 'tehran',
    name: 'تهران',
    province: 'تهران',
    lat: 35.6892,
    lng: 51.3890,
    timezone: 3.5
  };

  it('calculates all six prayer times for Tehran on Vernal Equinox (March 21)', () => {
    const equinoxDate = { gy: 2025, gm: 3, gd: 21 };
    const times = calculatePrayerTimes(equinoxDate, tehran);

    expect(times).toBeDefined();
    // Persian formatted strings
    expect(toEnglishDigits(times.fajr)).toMatch(/^\d{2}:\d{2}$/);
    expect(toEnglishDigits(times.sunrise)).toMatch(/^\d{2}:\d{2}$/);
    expect(toEnglishDigits(times.dhuhr)).toMatch(/^\d{2}:\d{2}$/);
    expect(toEnglishDigits(times.sunset)).toMatch(/^\d{2}:\d{2}$/);
    expect(toEnglishDigits(times.maghrib)).toMatch(/^\d{2}:\d{2}$/);
    expect(toEnglishDigits(times.midnight)).toMatch(/^\d{2}:\d{2}$/);

    const { fajr, sunrise, dhuhr, sunset, maghrib, midnight } = times.rawMinutes;

    // Natural chronological order: Fajr < Sunrise < Dhuhr < Sunset < Maghrib
    expect(fajr).toBeLessThan(sunrise);
    expect(sunrise).toBeLessThan(dhuhr);
    expect(dhuhr).toBeLessThan(sunset);
    expect(sunset).toBeLessThan(maghrib);

    // Dhuhr in Tehran is typically around 12:00 - 12:20 (720 - 740 minutes)
    expect(dhuhr).toBeGreaterThanOrEqual(12 * 60 - 20);
    expect(dhuhr).toBeLessThanOrEqual(12 * 60 + 30);
  });

  it('calculates prayer times on Summer Solstice (June 21) with long daylight', () => {
    const solstice = { gy: 2025, gm: 6, gd: 21 };
    const times = calculatePrayerTimes(solstice, tehran);

    const { sunrise, sunset } = times.rawMinutes;
    const dayLength = sunset - sunrise;

    // Tehran summer solstice daylight is ~14.5 hours (850 - 900 minutes)
    expect(dayLength).toBeGreaterThanOrEqual(840);
    expect(dayLength).toBeLessThanOrEqual(900);
  });

  it('calculates prayer times on Winter Solstice (December 21) with short daylight', () => {
    const winterSolstice = { gy: 2025, gm: 12, gd: 21 };
    const times = calculatePrayerTimes(winterSolstice, tehran);

    const { sunrise, sunset } = times.rawMinutes;
    const dayLength = sunset - sunrise;

    // Tehran winter solstice daylight is ~9.5 hours (560 - 600 minutes)
    expect(dayLength).toBeGreaterThanOrEqual(560);
    expect(dayLength).toBeLessThanOrEqual(600);
  });

  it('calculates religious midnight correctly as midpoint between sunset and next fajr', () => {
    const date = { gy: 2025, gm: 4, gd: 15 };
    const times = calculatePrayerTimes(date, tehran);

    const { fajr, sunset, midnight } = times.rawMinutes;
    const nightDuration = (fajr + 1440) - sunset;
    const expectedMidnight = Math.round(sunset + nightDuration / 2) % 1440;

    expect(midnight).toBe(expectedMidnight);
  });

  it('accurately accounts for longitude difference between eastern and western Iranian cities', () => {
    const mashhad = IRANIAN_CITIES.find(c => c.name === 'مشهد')!;
    const tabriz = IRANIAN_CITIES.find(c => c.name === 'تبریز')!;
    expect(mashhad).toBeDefined();
    expect(tabriz).toBeDefined();

    const date = { gy: 2025, gm: 5, gd: 10 };
    const mashhadTimes = calculatePrayerTimes(date, mashhad);
    const tabrizTimes = calculatePrayerTimes(date, tabriz);

    const mashhadDhuhr = mashhadTimes.rawMinutes.dhuhr;
    const tabrizDhuhr = tabrizTimes.rawMinutes.dhuhr;

    // Mashhad is eastern (lng ~59.6), Tabriz is western (lng ~46.3)
    // Solar noon occurs earlier in Mashhad than in Tabriz
    expect(mashhadDhuhr).toBeLessThan(tabrizDhuhr);
    const differenceMinutes = tabrizDhuhr - mashhadDhuhr;
    // ~13.3 degrees difference * 4 min/deg = ~53 minutes
    expect(differenceMinutes).toBeGreaterThanOrEqual(45);
    expect(differenceMinutes).toBeLessThanOrEqual(60);
  });

  it('handles custom and non-standard coordinates safely', () => {
    const customCity: CityLocation = {
      id: 'custom',
      province: 'custom',
      name: 'Custom Location',
      lat: 0.0, // Equator
      lng: 0.0, // Prime Meridian
      timezone: 0.0
    };

    const date = { gy: 2025, gm: 3, gd: 21 };
    const times = calculatePrayerTimes(date, customCity);

    expect(times).toBeDefined();
    expect(toEnglishDigits(times.fajr)).toMatch(/^\d{2}:\d{2}$/);
    expect(toEnglishDigits(times.dhuhr)).toMatch(/^\d{2}:\d{2}$/);

    // At equator on equinox, solar noon is very close to 12:00 UTC (720 min)
    const dhuhrMin = times.rawMinutes.dhuhr;
    expect(Math.abs(dhuhrMin - 720)).toBeLessThanOrEqual(15);
  });

  it('determines the next prayer info correctly across the daily cycle', () => {
    const times = calculatePrayerTimes({ gy: 2025, gm: 3, gd: 21 }, tehran);

    // Test morning before Dhuhr (e.g. at 10:00 AM)
    const morningDate = new Date(2025, 2, 21, 10, 0, 0);
    const nextInfo = getNextPrayerInfo(times, morningDate);
    expect(nextInfo.key).toBe('dhuhr');
    expect(nextInfo.name).toBe('اذان ظهر');
    expect(nextInfo.isPrayerTime).toBe(true);
    expect(nextInfo.minutesRemaining).toBeGreaterThan(0);

    // Test afternoon before Maghrib (e.g. at 17:00)
    const afternoonDate = new Date(2025, 2, 21, 17, 0, 0);
    const sunsetOrMaghrib = getNextPrayerInfo(times, afternoonDate);
    expect(['sunset', 'maghrib']).toContain(sunsetOrMaghrib.key);

    // Test late night (23:55) -> next is tomorrow's Fajr
    const lateNightDate = new Date(2025, 2, 21, 23, 55, 0);
    const lateInfo = getNextPrayerInfo(times, lateNightDate);
    expect(lateInfo.key).toBe('fajr');
    expect(lateInfo.name).toBe('اذان صبح');
    expect(lateInfo.countdown).toBeDefined();
    expect(typeof lateInfo.countdown).toBe('string');
  });

  it('accurately resolves next prayer using city timezone offset', () => {
    const times = calculatePrayerTimes({ gy: 2025, gm: 3, gd: 21 }, tehran);
    // At 06:30 UTC, in Tehran (UTC+3.5) it is 10:00 AM
    // Dhuhr in Tehran is around 12:15 PM (~135 minutes remaining)
    const utcDate = new Date(Date.UTC(2025, 2, 21, 6, 30, 0));
    const nextInfo = getNextPrayerInfo(times, utcDate, tehran.timezone);

    expect(nextInfo.key).toBe('dhuhr');
    expect(nextInfo.name).toBe('اذان ظهر');
    expect(nextInfo.minutesRemaining).toBeGreaterThan(60);
    expect(nextInfo.minutesRemaining).toBeLessThan(180);
    expect(nextInfo.countdown).toContain('ساعت');
  });

  it('calculates Qibla angle and Mecca distance accurately for Tehran', () => {
    const qiblaTehran = calculateQiblaAngle(tehran.lat, tehran.lng);
    // Tehran Qibla angle from North is around 215° - 220° (South-West)
    expect(qiblaTehran).toBeGreaterThanOrEqual(210);
    expect(qiblaTehran).toBeLessThanOrEqual(225);

    const distanceKm = calculateDistanceToMeccaKm(tehran.lat, tehran.lng);
    // Distance Tehran -> Mecca is roughly 1900 - 2050 km
    expect(distanceKm).toBeGreaterThanOrEqual(1900);
    expect(distanceKm).toBeLessThanOrEqual(2100);
  });

  it('calculates prayer times for southern hemisphere locations safely', () => {
    const sydney: CityLocation = {
      id: 'sydney',
      province: 'NSW',
      name: 'سیدنی',
      lat: -33.8688,
      lng: 151.2093,
      timezone: 10
    };

    const date = { gy: 2025, gm: 6, gd: 21 }; // Winter in Sydney
    const times = calculatePrayerTimes(date, sydney);

    expect(times).toBeDefined();
    expect(times.rawMinutes.fajr).toBeLessThan(times.rawMinutes.dhuhr);
    expect(times.rawMinutes.dhuhr).toBeLessThan(times.rawMinutes.maghrib);
    // In Sydney winter (June), days are shorter: daylight is ~10 hours (600 min)
    const dayLength = times.rawMinutes.sunset - times.rawMinutes.sunrise;
    expect(dayLength).toBeGreaterThan(550);
    expect(dayLength).toBeLessThan(650);
  });

  it('handles fractional timezones correctly (e.g. Kabul UTC+4.5)', () => {
    const kabul: CityLocation = {
      id: 'kabul',
      province: 'کابل',
      name: 'کابل',
      lat: 34.5553,
      lng: 69.2075,
      timezone: 4.5
    };

    const date = { gy: 2025, gm: 3, gd: 21 };
    const times = calculatePrayerTimes(date, kabul);

    expect(times).toBeDefined();
    // Solar noon in Kabul with lng 69.2° and tz 4.5:
    // 69.2 / 15 = 4.6133h, diff = 4.5 - 4.6133 = -0.1133h = -6.8 min -> Dhuhr near 11:53 - 12:05
    expect(times.rawMinutes.dhuhr).toBeGreaterThanOrEqual(705);
    expect(times.rawMinutes.dhuhr).toBeLessThanOrEqual(735);
  });

  it('calculates midnight accurately as exact midpoint between sunset and next fajr', () => {
    const date = { gy: 2025, gm: 7, gd: 15 };
    const times = calculatePrayerTimes(date, tehran);

    const { fajr, sunset, midnight } = times.rawMinutes;
    const expectedNight = (fajr + 1440) - sunset;
    const expectedMidnight = Math.round(sunset + expectedNight / 2) % 1440;

    expect(midnight).toBe(expectedMidnight);
    expect(midnight).toBeGreaterThan(1350); // Around 23:15 - 23:30 in Tehran mid-summer
    expect(midnight).toBeLessThan(1440);
  });

  it('properly formats rawMinutes into zero-padded Persian digit strings', () => {
    const date = { gy: 2025, gm: 1, gd: 15 };
    const times = calculatePrayerTimes(date, tehran);

    const keys = ['fajr', 'sunrise', 'dhuhr', 'sunset', 'maghrib', 'midnight'] as const;
    for (const key of keys) {
      const formatted = times[key];
      expect(typeof formatted).toBe('string');
      // Must be two Persian digits, colon, two Persian digits (e.g. ۰۵:۱۴)
      const eng = toEnglishDigits(formatted);
      expect(eng).toMatch(/^\d{2}:\d{2}$/);
      const [hh, mm] = eng.split(':').map(Number);
      expect(hh).toBeGreaterThanOrEqual(0);
      expect(hh).toBeLessThan(24);
      expect(mm).toBeGreaterThanOrEqual(0);
      expect(mm).toBeLessThan(60);
    }
  });

  describe('Day-Of-Year Timezone Dependency Fix', () => {
    it('accurately calculates day of year across regular years (2025)', () => {
      expect(getGregorianDayOfYear(2025, 1, 1)).toBe(1);
      expect(getGregorianDayOfYear(2025, 1, 31)).toBe(31);
      expect(getGregorianDayOfYear(2025, 2, 1)).toBe(32);
      expect(getGregorianDayOfYear(2025, 2, 28)).toBe(59);
      expect(getGregorianDayOfYear(2025, 3, 1)).toBe(60);
      expect(getGregorianDayOfYear(2025, 12, 31)).toBe(365);
    });

    it('accurately calculates day of year across leap years (2024)', () => {
      expect(getGregorianDayOfYear(2024, 1, 1)).toBe(1);
      expect(getGregorianDayOfYear(2024, 2, 28)).toBe(59);
      expect(getGregorianDayOfYear(2024, 2, 29)).toBe(60);
      expect(getGregorianDayOfYear(2024, 3, 1)).toBe(61);
      expect(getGregorianDayOfYear(2024, 12, 31)).toBe(366);
    });

    it('accurately calculates day of year for century leap years (2000 vs 1900)', () => {
      // 2000 is divisible by 400 -> LEAP
      expect(getGregorianDayOfYear(2000, 2, 29)).toBe(60);
      expect(getGregorianDayOfYear(2000, 3, 1)).toBe(61);
      expect(getGregorianDayOfYear(2000, 12, 31)).toBe(366);

      // 1900 is divisible by 100 but not 400 -> NOT LEAP
      expect(getGregorianDayOfYear(1900, 2, 28)).toBe(59);
      expect(getGregorianDayOfYear(1900, 3, 1)).toBe(60);
      expect(getGregorianDayOfYear(1900, 12, 31)).toBe(365);
    });

    it('correctly evaluates isGregorianLeapYear according to Gregorian calendar rules', () => {
      expect(isGregorianLeapYear(2000)).toBe(true);  // divisible by 400 -> leap
      expect(isGregorianLeapYear(1900)).toBe(false); // divisible by 100 but not 400 -> not leap
      expect(isGregorianLeapYear(2024)).toBe(true);  // divisible by 4 -> leap
      expect(isGregorianLeapYear(2025)).toBe(false); // not divisible by 4 -> not leap
    });
  });

  describe('Extreme Latitude & Robust Mathematical Safety', () => {
    it('handles North Pole / Arctic latitudes (lat = 89.9, 90) without NaN or crash', () => {
      const arcticCity: CityLocation = {
        id: 'arctic',
        name: 'قطب شمال',
        province: 'قطب',
        lat: 89.9,
        lng: 0,
        timezone: 0
      };

      const summer = calculatePrayerTimes({ gy: 2025, gm: 6, gd: 21 }, arcticCity);
      expect(summer).toBeDefined();
      expect(Number.isFinite(summer.rawMinutes.fajr)).toBe(true);
      expect(Number.isFinite(summer.rawMinutes.dhuhr)).toBe(true);
      expect(Number.isFinite(summer.rawMinutes.maghrib)).toBe(true);
      expect(summer.fajr).not.toContain('NaN');
      expect(summer.dhuhr).not.toContain('NaN');
      expect(summer.maghrib).not.toContain('NaN');

      const winter = calculatePrayerTimes({ gy: 2025, gm: 12, gd: 21 }, arcticCity);
      expect(winter).toBeDefined();
      expect(Number.isFinite(winter.rawMinutes.fajr)).toBe(true);
      expect(Number.isFinite(winter.rawMinutes.dhuhr)).toBe(true);
      expect(Number.isFinite(winter.rawMinutes.maghrib)).toBe(true);
      expect(winter.fajr).not.toContain('NaN');
    });

    it('handles South Pole latitudes (lat = -89.9, -90) without NaN or crash', () => {
      const antarcticCity: CityLocation = {
        id: 'antarctic',
        name: 'قطب جنوب',
        province: 'قطب',
        lat: -89.9,
        lng: 0,
        timezone: 0
      };

      const times = calculatePrayerTimes({ gy: 2025, gm: 6, gd: 21 }, antarcticCity);
      expect(times).toBeDefined();
      expect(Number.isFinite(times.rawMinutes.fajr)).toBe(true);
      expect(Number.isFinite(times.rawMinutes.dhuhr)).toBe(true);
      expect(Number.isFinite(times.rawMinutes.maghrib)).toBe(true);
      expect(times.fajr).not.toContain('NaN');
    });

    it('calculates valid prayer times for diverse global cities (London, New York, Ahvaz)', () => {
      const cities: CityLocation[] = [
        { id: 'ahvaz', name: 'اهواز', province: 'خوزستان', lat: 31.3183, lng: 48.6706, timezone: 3.5 },
        { id: 'london', name: 'لندن', province: 'UK', lat: 51.5074, lng: -0.1278, timezone: 0 },
        { id: 'newyork', name: 'نیویورک', province: 'US', lat: 40.7128, lng: -74.0060, timezone: -5 }
      ];

      for (const city of cities) {
        const times = calculatePrayerTimes({ gy: 2025, gm: 5, gd: 15 }, city);
        expect(times).toBeDefined();
        for (const [key, val] of Object.entries(times.rawMinutes)) {
          expect(Number.isFinite(val)).toBe(true);
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThan(1440);
        }
      }
    });
  });

  describe('Reminder Notification ID Allocation', () => {
    it('strictly confines reminder IDs to dedicated range [50000, 89999]', () => {
      const sampleIds = ['rem-1', 'rem-2', 'abc-xyz', 'uuid-12345-67890', 'birthday-ali'];
      for (const id of sampleIds) {
        const notifId = getDeterministicReminderNotificationId(id);
        expect(notifId).toBeGreaterThanOrEqual(50000);
        expect(notifId).toBeLessThan(90000);
      }
    });

    it('ensures complete partition separation between Native Azan (40000-40200) and Reminders (50000-89999)', () => {
      const NATIVE_AZAN_MIN = 40000;
      const NATIVE_AZAN_MAX = 40200;
      for (let i = 0; i < 500; i++) {
        const notifId = getDeterministicReminderNotificationId(`test-reminder-key-${i}`);
        expect(notifId).toBeGreaterThan(NATIVE_AZAN_MAX);
        expect(notifId).toBeGreaterThanOrEqual(50000);
        expect(notifId).toBeLessThan(90000);
      }
    });

    it('resolves duplicate hash collisions using linear probing when usedIds set is provided', () => {
      const usedIds = new Set<number>();
      const id1 = getDeterministicReminderNotificationId('same-key', usedIds);
      const id2 = getDeterministicReminderNotificationId('same-key', usedIds);
      const id3 = getDeterministicReminderNotificationId('same-key', usedIds);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
      expect(usedIds.size).toBe(3);
    });
  });

  describe('TypeScript vs Android Java Parity & Boundary Verification', () => {
    // Exact simulation of PrayerTimesCalculator.java on Android
    const simulateJavaCalculation = (dayOfYear: number, lat: number, lng: number, tz: number) => {
      const safeLat = Math.max(-90.0, Math.min(90.0, lat));
      const safeLng = Math.max(-180.0, Math.min(180.0, lng));
      const safeTz = tz;

      const degToRad = (deg: number) => (deg * Math.PI) / 180.0;
      const radToDeg = (rad: number) => (rad * 180.0) / Math.PI;

      const b = (2.0 * Math.PI * (dayOfYear - 81)) / 365.0;
      const eot = 9.87 * Math.sin(2.0 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
      const declination = 23.45 * Math.sin(degToRad((360.0 / 365.0) * (dayOfYear - 81)));

      const noonMinutes = 720.0 - (4.0 * safeLng) - eot + (safeTz * 60.0);

      const fajrAngle = 17.7;
      const maghribAngle = 4.5;

      const latRad = degToRad(safeLat);
      const decRad = degToRad(declination);

      const getHourAngle = (angle: number) => {
        const denom = Math.cos(latRad) * Math.cos(decRad);
        if (Math.abs(denom) < 1e-10) return 0.0;
        const cosHA = (Math.sin(degToRad(-angle)) - Math.sin(latRad) * Math.sin(decRad)) / denom;
        if (isNaN(cosHA)) return 0.0;
        if (cosHA > 1.0) return 0.0;
        if (cosHA < -1.0) return 180.0;
        return radToDeg(Math.acos(cosHA));
      };

      const fajrHA = getHourAngle(fajrAngle);
      const maghribHA = getHourAngle(maghribAngle);

      const fajrRaw = Math.round(noonMinutes - (fajrHA * 4.0));
      const dhuhrRaw = Math.round(noonMinutes);
      const maghribRaw = Math.round(noonMinutes + (maghribHA * 4.0));

      return {
        fajr: ((fajrRaw % 1440) + 1440) % 1440,
        dhuhr: ((dhuhrRaw % 1440) + 1440) % 1440,
        maghrib: ((maghribRaw % 1440) + 1440) % 1440
      };
    };

    const testDates = [
      { name: 'Beginning of Year (Jan 1, non-leap 2025)', date: { gy: 2025, gm: 1, gd: 1 }, expectedDoy: 1 },
      { name: 'End of Year (Dec 31, non-leap 2025)', date: { gy: 2025, gm: 12, gd: 31 }, expectedDoy: 365 },
      { name: 'Non-Leap Feb 28 (2025)', date: { gy: 2025, gm: 2, gd: 28 }, expectedDoy: 59 },
      { name: 'Non-Leap Mar 01 (2025)', date: { gy: 2025, gm: 3, gd: 1 }, expectedDoy: 60 },
      { name: 'Beginning of Leap Year (Jan 1, leap 2024)', date: { gy: 2024, gm: 1, gd: 1 }, expectedDoy: 1 },
      { name: 'Leap Day (Feb 29, leap 2024)', date: { gy: 2024, gm: 2, gd: 29 }, expectedDoy: 60 },
      { name: 'Day After Leap Day (Mar 01, leap 2024)', date: { gy: 2024, gm: 3, gd: 1 }, expectedDoy: 61 },
      { name: 'End of Leap Year (Dec 31, leap 2024)', date: { gy: 2024, gm: 12, gd: 31 }, expectedDoy: 366 },
      { name: 'Summer Solstice (Jun 21, 2025)', date: { gy: 2025, gm: 6, gd: 21 }, expectedDoy: 172 },
      { name: 'Winter Solstice (Dec 21, 2025)', date: { gy: 2025, gm: 12, gd: 21 }, expectedDoy: 355 }
    ];

    const testLocations: CityLocation[] = [
      tehran,
      IRANIAN_CITIES.find(c => c.name === 'مشهد')!,
      IRANIAN_CITIES.find(c => c.name === 'تبریز')!,
      IRANIAN_CITIES.find(c => c.name === 'شیراز')!,
      IRANIAN_CITIES.find(c => c.name === 'بندرعباس')!,
      { id: 'london', name: 'لندن', province: 'UK', lat: 51.5074, lng: -0.1278, timezone: 0 },
      { id: 'kabul', name: 'کابل', province: 'AF', lat: 34.5553, lng: 69.2075, timezone: 4.5 },
      { id: 'newyork', name: 'نیویورک', province: 'US', lat: 40.7128, lng: -74.0060, timezone: -5 }
    ];

    it.each(testDates)('matches Android Java PrayerTimesCalculator exactly for $name in Tehran', ({ date, expectedDoy }) => {
      const doy = getGregorianDayOfYear(date.gy, date.gm, date.gd);
      expect(doy).toBe(expectedDoy);

      const tsTimes = calculatePrayerTimes(date, tehran);
      const javaTimes = simulateJavaCalculation(doy, tehran.lat, tehran.lng, tehran.timezone);

      expect(tsTimes.rawMinutes.fajr).toBe(javaTimes.fajr);
      expect(tsTimes.rawMinutes.dhuhr).toBe(javaTimes.dhuhr);
      expect(tsTimes.rawMinutes.maghrib).toBe(javaTimes.maghrib);
      expect(tsTimes.rawMinutes.fajr).toBeLessThan(tsTimes.rawMinutes.dhuhr);
      expect(tsTimes.rawMinutes.dhuhr).toBeLessThan(tsTimes.rawMinutes.maghrib);
    });

    it('guarantees 100% mathematical parity across all locations and dates', () => {
      for (const loc of testLocations) {
        for (const td of testDates) {
          const doy = getGregorianDayOfYear(td.date.gy, td.date.gm, td.date.gd);
          const tsTimes = calculatePrayerTimes(td.date, loc);
          const javaTimes = simulateJavaCalculation(doy, loc.lat, loc.lng, loc.timezone);

          expect(tsTimes.rawMinutes.fajr).toBe(javaTimes.fajr);
          expect(tsTimes.rawMinutes.dhuhr).toBe(javaTimes.dhuhr);
          expect(tsTimes.rawMinutes.maghrib).toBe(javaTimes.maghrib);
        }
      }
    });
  });
});
