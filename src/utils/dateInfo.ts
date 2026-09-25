import { FullDateInfo, JalaliDate } from '../types/calendar';
import { jalaliToGregorian, getJalaliDayOfWeek, getDayOfWeekName, isLeapYear, getTodayJalali } from './jalali';
import { jalaliToHijri } from './hijri';
import { getOccasionsForDate } from '../data/occasions';
import { ZODIAC_SIGNS } from './persianNumber';

export function getFullDateInfo(
  jy: number, 
  jm: number, 
  jd: number, 
  hijriAdjustment: number = 0
): FullDateInfo {
  const jalali: JalaliDate = { jy, jm, jd };
  const gregorian = jalaliToGregorian(jy, jm, jd);
  const hijri = jalaliToHijri(jy, jm, jd, hijriAdjustment);
  const dayOfWeek = getJalaliDayOfWeek(jy, jm, jd);
  const dayOfWeekName = getDayOfWeekName(dayOfWeek);
  const isFriday = dayOfWeek === 6;

  const occasions = getOccasionsForDate(jy, jm, jd, hijriAdjustment);
  const hasOfficialHoliday = occasions.some(o => o.isHoliday);
  const isHoliday = isFriday || hasOfficialHoliday;

  const today = getTodayJalali();
  const isCurrentDay = today.jy === jy && today.jm === jm && today.jd === jd;
  const isLeap = isLeapYear(jy);

  // Zodiac & Season
  const zodiac = ZODIAC_SIGNS[jm - 1] || ZODIAC_SIGNS[0];
  const seasonName = jm <= 3 ? 'بهار' : jm <= 6 ? 'تابستان' : jm <= 9 ? 'پاییز' : 'زمستان';

  return {
    jalali,
    gregorian,
    hijri,
    dayOfWeek,
    dayOfWeekName,
    isFriday,
    isHoliday,
    isCurrentDay,
    isLeapYear: isLeap,
    zodiacSign: `${zodiac.symbol} ${zodiac.name}`,
    seasonName,
    occasions
  };
}
