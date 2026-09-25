// Utility functions for Persian digits and strings
import * as jalaali from 'jalaali-js';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toPersianDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

export function toEnglishDigits(input: string): string {
  if (!input) return '';
  let str = input;
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), i.toString());
    str = str.replace(new RegExp(ARABIC_DIGITS[i], 'g'), i.toString());
  }
  return str;
}

export function removePersianDiacritics(str: string): string {
  if (!str) return '';
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
}

export function formatPrice(amount: number): string {
  const parts = amount.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits(parts.join('.'));
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export const GREGORIAN_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const GREGORIAN_MONTH_NAMES_FA = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر'
];

export const HIJRI_MONTH_NAMES = [
  'محرم',
  'صفر',
  'ربیع‌الاول',
  'ربیع‌الثانی',
  'جمادی‌الاول',
  'جمادی‌الثانی',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذیقعده',
  'ذیحجه'
];

export const PERSIAN_WEEK_DAYS = [
  { key: 0, name: 'شنبه', short: 'ش' },
  { key: 1, name: 'یکشنبه', short: 'ی' },
  { key: 2, name: 'دوشنبه', short: 'د' },
  { key: 3, name: 'سه‌شنبه', short: 'س' },
  { key: 4, name: 'چهارشنبه', short: 'چ' },
  { key: 5, name: 'پنج‌شنبه', short: 'پ' },
  { key: 6, name: 'جمعه', short: 'ج' },
];

export const ZODIAC_SIGNS = [
  { name: 'برج حمل (قوچ)', symbol: '♈', season: 'بهار', element: 'آتش' },
  { name: 'برج ثور (گاو)', symbol: '♉', season: 'بهار', element: 'خاک' },
  { name: 'برج جوزا (دوپیکر)', symbol: '♊', season: 'بهار', element: 'باد' },
  { name: 'برج سرطان (خرچنگ)', symbol: '♋', season: 'تابستان', element: 'آب' },
  { name: 'برج اسد (شیر)', symbol: '♌', season: 'تابستان', element: 'آتـش' },
  { name: 'برج سنبله (دوشیزه)', symbol: '♍', season: 'تابستان', element: 'خاک' },
  { name: 'برج میزان (ترازو)', symbol: '♎', season: 'پاییز', element: 'باد' },
  { name: 'برج عقرب (کژدم)', symbol: '♏', season: 'پاییز', element: 'آب' },
  { name: 'برج قوس (کماندار)', symbol: '♐', season: 'پاییز', element: 'آتش' },
  { name: 'برج جدی (بزغاله)', symbol: '♑', season: 'زمستان', element: 'خاک' },
  { name: 'برج دلو (آب‌کش)', symbol: '♒', season: 'زمستان', element: 'باد' },
  { name: 'برج حوت (ماهی)', symbol: '♓', season: 'زمستان', element: 'آب' },
];

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function makeDateKey(jy: number, jm: number, jd: number): string {
  return `${jy}-${padZero(jm)}-${padZero(jd)}`;
}

export function normalizeDateKey(input?: string | null): string {
  if (!input) return '';
  const eng = toEnglishDigits(input.toString().trim());
  const parts = eng.replace(/[/. _]/g, '-').split('-').filter(Boolean);
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      if (jalaali.isValidJalaaliDate(y, m, d)) {
        return makeDateKey(y, m, d);
      }
    }
    return '';
  }
  return eng;
}

export function parseDateKey(input?: string | null): { jy: number; jm: number; jd: number } | null {
  if (!input) return null;
  const norm = normalizeDateKey(input);
  const parts = norm.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { jy: y, jm: m, jd: d };
    }
  }
  return null;
}

export function isSameDateKey(key1?: string | null, key2?: string | null): boolean {
  if (!key1 || !key2) return false;
  return normalizeDateKey(key1) === normalizeDateKey(key2);
}
