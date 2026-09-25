import { GregorianDate } from '../types/calendar';
import { toPersianDigits, padZero } from './persianNumber';

export interface CityLocation {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  timezone: number; // Iran is UTC+3.5
  qiblaAngle?: number; // Calculated or precomputed degrees from North clockwise
}

export const IRANIAN_CITIES: CityLocation[] = [
  { id: 'tehran', name: 'تهران', province: 'تهران', lat: 35.6892, lng: 51.3890, timezone: 3.5 },
  { id: 'mashhad', name: 'مشهد', province: 'خراسان رضوی', lat: 36.2605, lng: 59.6168, timezone: 3.5 },
  { id: 'isfahan', name: 'اصفهان', province: 'اصفهان', lat: 32.6546, lng: 51.6680, timezone: 3.5 },
  { id: 'shiraz', name: 'شیراز', province: 'فارس', lat: 29.5918, lng: 52.5837, timezone: 3.5 },
  { id: 'tabriz', name: 'تبریز', province: 'آذربایجان شرقی', lat: 38.0962, lng: 46.2738, timezone: 3.5 },
  { id: 'ahvaz', name: 'اهواز', province: 'خوزستان', lat: 31.3183, lng: 48.6706, timezone: 3.5 },
  { id: 'qom', name: 'قم', province: 'قم', lat: 34.6401, lng: 50.8764, timezone: 3.5 },
  { id: 'kermanshah', name: 'کرمانشاه', province: 'کرمانشاه', lat: 34.3277, lng: 47.0778, timezone: 3.5 },
  { id: 'rasht', name: 'رشت', province: 'گیلان', lat: 37.2809, lng: 49.5924, timezone: 3.5 },
  { id: 'urmia', name: 'ارومیه', province: 'آذربایجان غربی', lat: 37.5527, lng: 45.0761, timezone: 3.5 },
  { id: 'karaj', name: 'کرج', province: 'البرز', lat: 35.8400, lng: 50.9391, timezone: 3.5 },
  { id: 'zahedan', name: 'زاهدان', province: 'سیستان و بلوچستان', lat: 29.4963, lng: 60.8629, timezone: 3.5 },
  { id: 'hamedan', name: 'همدان', province: 'همدان', lat: 34.7989, lng: 48.5150, timezone: 3.5 },
  { id: 'kerman', name: 'کرمان', province: 'کرمان', lat: 30.2839, lng: 57.0834, timezone: 3.5 },
  { id: 'yazd', name: 'یزد', province: 'یزد', lat: 31.8974, lng: 54.3569, timezone: 3.5 },
  { id: 'ardabil', name: 'اردبیل', province: 'اردبیل', lat: 38.2498, lng: 48.2933, timezone: 3.5 },
  { id: 'bandar_abbas', name: 'بندرعباس', province: 'هرمزگان', lat: 27.1832, lng: 56.2666, timezone: 3.5 },
  { id: 'arak', name: 'اراک', province: 'مرکزی', lat: 34.0917, lng: 49.6892, timezone: 3.5 },
  { id: 'zanjan', name: 'زنجان', province: 'زنجان', lat: 36.6736, lng: 48.4787, timezone: 3.5 },
  { id: 'sanandaj', name: 'سنندج', province: 'کردستان', lat: 35.3219, lng: 46.9862, timezone: 3.5 },
  { id: 'qazvin', name: 'قزوین', province: 'قزوین', lat: 36.2797, lng: 50.0049, timezone: 3.5 },
  { id: 'khorramabad', name: 'خرم‌آباد', province: 'لرستان', lat: 33.4878, lng: 48.3558, timezone: 3.5 },
  { id: 'gorgan', name: 'گرگان', province: 'گلستان', lat: 36.8456, lng: 54.4394, timezone: 3.5 },
  { id: 'sari', name: 'ساری', province: 'مازندران', lat: 36.5659, lng: 53.0586, timezone: 3.5 },
  { id: 'bojnurd', name: 'بجنورد', province: 'خراسان شمالی', lat: 37.4747, lng: 57.3290, timezone: 3.5 },
  { id: 'birjand', name: 'بیرجند', province: 'خراسان جنوبی', lat: 32.8663, lng: 59.2211, timezone: 3.5 },
  { id: 'bushehr', name: 'بوشهر', province: 'بوشهر', lat: 28.9234, lng: 50.8203, timezone: 3.5 },
  { id: 'ilam', name: 'ایلام', province: 'ایلام', lat: 33.6374, lng: 46.4227, timezone: 3.5 },
  { id: 'shahr_kord', name: 'شهرکرد', province: 'چهارمحال و بختیاری', lat: 32.3256, lng: 50.8644, timezone: 3.5 },
  { id: 'yasuj', name: 'یاسوج', province: 'کهگیلویه و بویراحمد', lat: 30.6684, lng: 51.5876, timezone: 3.5 },
  { id: 'semnan', name: 'سمنان', province: 'سمنان', lat: 35.5729, lng: 53.3971, timezone: 3.5 },
  { id: 'kish', name: 'جزیره کیش', province: 'هرمزگان', lat: 26.5578, lng: 54.0194, timezone: 3.5 },
  { id: 'qeshm', name: 'جزیره قشم', province: 'هرمزگان', lat: 26.9585, lng: 56.2718, timezone: 3.5 },
  { id: 'kashan', name: 'کاشان', province: 'اصفهان', lat: 33.9850, lng: 51.4100, timezone: 3.5 },
  { id: 'neyshabur', name: 'نیشابور', province: 'خراسان رضوی', lat: 36.2133, lng: 58.7958, timezone: 3.5 },
  { id: 'abadan', name: 'آبادان', province: 'خوزستان', lat: 30.3392, lng: 48.3043, timezone: 3.5 },
  { id: 'dezful', name: 'دزفول', province: 'خوزستان', lat: 32.3837, lng: 48.4069, timezone: 3.5 },
  { id: 'babol', name: 'بابل', province: 'مازندران', lat: 36.5513, lng: 52.6789, timezone: 3.5 },
  { id: 'amol', name: 'آمل', province: 'مازندران', lat: 36.4676, lng: 52.3507, timezone: 3.5 },
  { id: 'saveh', name: 'ساوه', province: 'مرکزی', lat: 35.0208, lng: 50.3601, timezone: 3.5 },
  { id: 'maragheh', name: 'مراغه', province: 'آذربایجان شرقی', lat: 37.3916, lng: 46.2393, timezone: 3.5 },
  { id: 'khoy', name: 'خوی', province: 'آذربایجان غربی', lat: 38.5522, lng: 44.9525, timezone: 3.5 },
  { id: 'chabahar', name: 'چابهار', province: 'سیستان و بلوچستان', lat: 25.2919, lng: 60.6430, timezone: 3.5 },
  { id: 'gonbad', name: 'گنبد کاووس', province: 'گلستان', lat: 37.2500, lng: 55.1672, timezone: 3.5 },
  { id: 'shahroud', name: 'شاهرود', province: 'سمنان', lat: 36.4182, lng: 54.9763, timezone: 3.5 },
  { id: 'borujerd', name: 'بروجرد', province: 'لرستان', lat: 33.8973, lng: 48.7516, timezone: 3.5 },
  { id: 'sirjan', name: 'سیرجان', province: 'کرمان', lat: 29.4520, lng: 55.6812, timezone: 3.5 },
  { id: 'rafsanjan', name: 'رفسنجان', province: 'کرمان', lat: 30.4067, lng: 55.9939, timezone: 3.5 },
  { id: 'marivan', name: 'مریوان', province: 'کردستان', lat: 35.5269, lng: 46.1764, timezone: 3.5 },
  { id: 'saqqez', name: 'سقز', province: 'کردستان', lat: 36.2425, lng: 46.2735, timezone: 3.5 }
];

export interface PrayerTimes {
  fajr: string; // اذان صبح
  sunrise: string; // طلوع آفتاب
  dhuhr: string; // اذان ظهر
  sunset: string; // غروب آفتاب
  maghrib: string; // اذان مغرب
  midnight: string; // نیمه‌شب شرعی
  rawMinutes: {
    fajr: number;
    sunrise: number;
    dhuhr: number;
    sunset: number;
    maghrib: number;
    midnight: number;
  };
}

// Astronomical formula based on University of Tehran standard (Fajr: 17.7 deg, Maghrib: 4.5 deg)
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Qibla Direction towards Kaaba (Mecca: 21.4225 N, 39.8262 E)
export const MECCA_COORDINATES = {
  lat: 21.422487,
  lng: 39.826206
};

export function calculateQiblaAngle(lat: number, lng: number): number {
  const latK = degToRad(MECCA_COORDINATES.lat);
  const lngK = degToRad(MECCA_COORDINATES.lng);
  const latU = degToRad(lat);
  const lngU = degToRad(lng);

  const deltaLng = lngK - lngU;
  const y = Math.sin(deltaLng);
  const x = Math.cos(latU) * Math.tan(latK) - Math.sin(latU) * Math.cos(deltaLng);

  let qiblaRad = Math.atan2(y, x);
  let qiblaDeg = (radToDeg(qiblaRad) + 360) % 360;
  return Math.round(qiblaDeg * 10) / 10;
}

// Calculate distance to Mecca in Kilometers (Haversine formula)
export function calculateDistanceToMeccaKm(lat: number, lng: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = degToRad(MECCA_COORDINATES.lat - lat);
  const dLon = degToRad(MECCA_COORDINATES.lng - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat)) * Math.cos(degToRad(MECCA_COORDINATES.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Determines whether a given Gregorian year is a leap year.
 * Follows standard Gregorian calendar rules:
 * - divisible by 4 -> leap year
 * - divisible by 100 -> not leap year
 * - divisible by 400 -> leap year
 */
export function isGregorianLeapYear(gy: number): boolean {
  return (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
}

/**
 * Calculates day of year (1..366) using pure integer arithmetic and Gregorian calendar rules.
 * 100% independent of host/device timezone, local DST offsets, or system clock changes.
 */
export function getGregorianDayOfYear(gy: number, gm: number, gd: number): number {
  const isLeap = isGregorianLeapYear(gy);
  const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const safeGm = Math.max(1, Math.min(12, Math.floor(gm)));
  const safeGd = Math.max(1, Math.min(31, Math.floor(gd)));
  let day = daysBeforeMonth[safeGm - 1] + safeGd;
  if (safeGm > 2 && isLeap) {
    day += 1;
  }
  return day;
}

export function calculatePrayerTimes(date: GregorianDate, city: CityLocation): PrayerTimes {
  const dayOfYear = getGregorianDayOfYear(date.gy, date.gm, date.gd);

  // Solar declination & Equation of time
  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const declination = 23.45 * Math.sin(degToRad((360 / 365) * (dayOfYear - 81)));

  // Sanitize coordinates and timezone
  const safeLat = Number.isFinite(city.lat) ? Math.max(-90, Math.min(90, city.lat)) : 35.6892;
  const safeLng = Number.isFinite(city.lng) ? Math.max(-180, Math.min(180, city.lng)) : 51.3890;
  const safeTz = Number.isFinite(city.timezone) ? city.timezone : 3.5;

  // Solar noon
  const noonMinutes = 720 - 4 * safeLng - eot + safeTz * 60;

  // Sun angles (Tehran Geophysics Institute convention)
  const fajrAngle = 17.7;
  const sunriseAngle = 0.833;
  const maghribAngle = 4.5;

  const latRad = degToRad(safeLat);
  const decRad = degToRad(declination);

  const getHourAngle = (angle: number): number => {
    const denom = Math.cos(latRad) * Math.cos(decRad);
    if (Math.abs(denom) < 1e-10) {
      return 0;
    }
    const cosHA = (Math.sin(degToRad(-angle)) - Math.sin(latRad) * Math.sin(decRad)) / denom;
    if (isNaN(cosHA)) return 0;
    if (cosHA > 1) return 0;
    if (cosHA < -1) return 180;
    return radToDeg(Math.acos(cosHA));
  };

  const fajrHA = getHourAngle(fajrAngle);
  const sunriseHA = getHourAngle(sunriseAngle);
  const maghribHA = getHourAngle(maghribAngle);

  const fajrMin = Math.round(noonMinutes - (fajrHA * 4));
  const sunriseMin = Math.round(noonMinutes - (sunriseHA * 4));
  const dhuhrMin = Math.round(noonMinutes);
  const sunsetMin = Math.round(noonMinutes + (sunriseHA * 4));
  const maghribMin = Math.round(noonMinutes + (maghribHA * 4));
  // Midnight (نیمه‌شب شرعی) is the midpoint between sunset/maghrib and the next morning's fajr
  const nightDurationMin = Math.max(0, (fajrMin + 1440) - sunsetMin);
  const midnightMin = Math.round(sunsetMin + (nightDurationMin / 2)) % 1440;

  const formatMin = (minutes: number): string => {
    if (isNaN(minutes)) return '00:00';
    let m = Math.round(minutes) % 1440;
    if (m < 0) m += 1440;
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return `${padZero(hours)}:${padZero(mins)}`;
  };

  return {
    fajr: toPersianDigits(formatMin(fajrMin)),
    sunrise: toPersianDigits(formatMin(sunriseMin)),
    dhuhr: toPersianDigits(formatMin(dhuhrMin)),
    sunset: toPersianDigits(formatMin(sunsetMin)),
    maghrib: toPersianDigits(formatMin(maghribMin)),
    midnight: toPersianDigits(formatMin(midnightMin)),
    rawMinutes: {
      fajr: ((fajrMin % 1440) + 1440) % 1440,
      sunrise: ((sunriseMin % 1440) + 1440) % 1440,
      dhuhr: ((dhuhrMin % 1440) + 1440) % 1440,
      sunset: ((sunsetMin % 1440) + 1440) % 1440,
      maghrib: ((maghribMin % 1440) + 1440) % 1440,
      midnight: ((midnightMin % 1440) + 1440) % 1440
    }
  };
}

export interface NextPrayerInfo {
  name: string; // اذان صبح, طلوع آفتاب, اذان ظهر, غروب آفتاب, اذان مغرب, نیمه‌شب شرعی
  key: 'fajr' | 'sunrise' | 'dhuhr' | 'sunset' | 'maghrib' | 'midnight';
  timeStr: string;
  minutesRemaining: number;
  secondsRemaining: number;
  isPrayerTime: boolean; // is it an actual Azan time (fajr, dhuhr, maghrib)
  progressPercent: number; // progress of current interval
  countdown?: string;
}

export function getNextPrayerInfo(
  prayers: PrayerTimes,
  now: Date = new Date(),
  timezoneOffsetHours?: number
): NextPrayerInfo {
  let currentMinutes: number;
  let currentSeconds: number;

  if (typeof timezoneOffsetHours === 'number' && !isNaN(timezoneOffsetHours)) {
    // Determine the current instant's hours, minutes, and seconds relative to the city's timezone
    const cityOffsetMillis = Math.round(timezoneOffsetHours * 3600000);
    const cityNow = new Date(now.getTime() + cityOffsetMillis);
    currentMinutes = cityNow.getUTCHours() * 60 + cityNow.getUTCMinutes();
    currentSeconds = currentMinutes * 60 + cityNow.getUTCSeconds();
  } else {
    currentMinutes = now.getHours() * 60 + now.getMinutes();
    currentSeconds = currentMinutes * 60 + now.getSeconds();
  }

  const prayerItems: Array<{ name: string; key: 'fajr' | 'sunrise' | 'dhuhr' | 'sunset' | 'maghrib' | 'midnight'; minutes: number; timeStr: string; isPrayer: boolean }> = [
    { name: 'اذان صبح', key: 'fajr', minutes: prayers.rawMinutes.fajr, timeStr: prayers.fajr, isPrayer: true },
    { name: 'طلوع آفتاب', key: 'sunrise', minutes: prayers.rawMinutes.sunrise, timeStr: prayers.sunrise, isPrayer: false },
    { name: 'اذان ظهر', key: 'dhuhr', minutes: prayers.rawMinutes.dhuhr, timeStr: prayers.dhuhr, isPrayer: true },
    { name: 'غروب آفتاب', key: 'sunset', minutes: prayers.rawMinutes.sunset, timeStr: prayers.sunset, isPrayer: false },
    { name: 'اذان مغرب', key: 'maghrib', minutes: prayers.rawMinutes.maghrib, timeStr: prayers.maghrib, isPrayer: true },
    { name: 'نیمه‌شب شرعی', key: 'midnight', minutes: prayers.rawMinutes.midnight, timeStr: prayers.midnight, isPrayer: false }
  ];

  const formatCountdown = (totalSec: number) => {
    const totalMinutes = Math.max(0, Math.floor(totalSec / 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(mins)} دقیقه دیگر`;
    }
    return `${toPersianDigits(mins)} دقیقه دیگر`;
  };

  // Sort chronologically in 24h
  prayerItems.sort((a, b) => a.minutes - b.minutes);

  // Find the next upcoming item
  for (let i = 0; i < prayerItems.length; i++) {
    const item = prayerItems[i];
    if (item.minutes * 60 > currentSeconds) {
      const prevItem = i > 0 ? prayerItems[i - 1] : prayerItems[prayerItems.length - 1];
      const prevTotalSec = i > 0 ? prevItem.minutes * 60 : (prevItem.minutes - 1440) * 60;
      const targetSec = item.minutes * 60;
      const totalInterval = targetSec - prevTotalSec;
      const elapsed = currentSeconds - prevTotalSec;
      const progress = Math.min(100, Math.max(0, (elapsed / (totalInterval || 1)) * 100));

      const secDiff = targetSec - currentSeconds;
      return {
        name: item.name,
        key: item.key,
        timeStr: item.timeStr,
        minutesRemaining: Math.floor(secDiff / 60),
        secondsRemaining: secDiff % 60,
        isPrayerTime: item.isPrayer,
        progressPercent: progress,
        countdown: formatCountdown(secDiff)
      };
    }
  }

  // If passed all for today, next is tomorrow's Fajr
  const firstItem = prayerItems[0];
  const targetSec = (firstItem.minutes + 1440) * 60;
  const lastItem = prayerItems[prayerItems.length - 1];
  const totalInterval = targetSec - lastItem.minutes * 60;
  const elapsed = currentSeconds - lastItem.minutes * 60;
  const progress = Math.min(100, Math.max(0, (elapsed / (totalInterval || 1)) * 100));
  const secDiff = targetSec - currentSeconds;

  return {
    name: firstItem.name,
    key: firstItem.key,
    timeStr: firstItem.timeStr,
    minutesRemaining: Math.floor(secDiff / 60),
    secondsRemaining: secDiff % 60,
    isPrayerTime: firstItem.isPrayer,
    progressPercent: progress,
    countdown: formatCountdown(secDiff)
  };
}
