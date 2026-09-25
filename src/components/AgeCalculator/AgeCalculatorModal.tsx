import React, { useState } from 'react';
import { Sparkles, Calendar, Heart, Star, Clock, Trophy, Hourglass, ArrowLeft, Cake } from 'lucide-react';
import { JalaliDate } from '../../types/calendar';
import { toPersianDigits, PERSIAN_MONTH_NAMES } from '../../utils/persianNumber';
import { jalaliToGregorian, getDaysDifference, getTodayJalali, addDaysToJalali, getJalaliMonthLength } from '../../utils/jalali';

interface AgeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ZODIAC_INFO: Record<number, { name: string; symbol: string; element: string; stone: string; desc: string }> = {
  1: { name: 'فروردین (حمل)', symbol: '♈ قوچ', element: 'آتش', stone: 'الماس و یاقوت', desc: 'پرانرژی، پیشگام، شجاع و بااراده قوی' },
  2: { name: 'اردیبهشت (ثور)', symbol: '♉ گاو', element: 'خاک', stone: 'زمرد سبز', desc: 'صبور، وفادار، پرمهر و عاشق طبیعت و هنر' },
  3: { name: 'خرداد (جوزا)', symbol: '♊ دوپیکر', element: 'هوا', stone: 'مروارید و عقیق', desc: 'هوشمند، خوش‌سخن، کنجکاو و پرنشاط' },
  4: { name: 'تیر (سرطان)', symbol: '♋ خرچنگ', element: 'آب', stone: 'یاقوت سرخ', desc: 'احساساتی، حامی، مهربان و خانواده‌دوست' },
  5: { name: 'مرداد (اسد)', symbol: '♌ شیر', element: 'آتش', stone: 'زبرجد و کهربا', desc: 'بخشنده، پرجذبه، رهبر و با اعتمادبه‌نفس' },
  6: { name: 'شهریور (سنبله)', symbol: '♍ دوشیزه', element: 'خاک', stone: 'یاقوت کبود', desc: 'دقیق، منظم، پرتلاش و یار مهربان' },
  7: { name: 'مهر (میزان)', symbol: '♎ ترازو', element: 'هوا', stone: 'اوپال و زبرجد', desc: 'صلح‌جو، باانصاف، باذوق و دارای هارمونی بالا' },
  8: { name: 'آبان (عقرب)', symbol: '♏ کژدم', element: 'آب', stone: 'توپاز و عقیق سیاه', desc: 'پرشور، باوفا، عمیق و قوی در برابر چالش‌ها' },
  9: { name: 'آذر (قوس)', symbol: '♐ کماندار', element: 'آتـش', stone: 'فیروزه نیشابور', desc: 'ماجراجو، خوش‌بین، صادق و اهل سفر و دانش' },
  10: { name: 'دی (جدی)', symbol: '♑ بزغاله', element: 'خاک', stone: 'گارنت و لعل', desc: 'منضبط، هدفمند، استوار و قابل اعتماد' },
  11: { name: 'بهمن (دلو)', symbol: '♒ آب‌ریز', element: 'هوا', stone: 'آمیتیست بنفش', desc: 'نوآور، مستقل، انسان‌دوست و آینده‌نگر' },
  12: { name: 'اسفند (حوت)', symbol: '♓ ماهی', element: 'آب', stone: 'زمرد و مرجان', desc: 'رؤیاپرداز، شهودی، ایثارگر و دارای لطافت روح' }
};

export const AgeCalculatorModal: React.FC<AgeCalculatorModalProps> = ({ isOpen, onClose }) => {
  const today = getTodayJalali();
  const [birthYear, setBirthYear] = useState<number>(1375);
  const [birthMonth, setBirthMonth] = useState<number>(5);
  const [birthDay, setBirthDay] = useState<number>(15);

  // Clamp birthDay if current month length is smaller (e.g. Esfand)
  const maxDaysInMonth = getJalaliMonthLength(birthYear, birthMonth);
  React.useEffect(() => {
    if (birthDay > maxDaysInMonth) {
      setBirthDay(maxDaysInMonth);
    }
  }, [birthYear, birthMonth, birthDay, maxDaysInMonth]);

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate live statistics
  const birthGregorian = jalaliToGregorian(birthYear, birthMonth, birthDay);
  const todayGregorian = jalaliToGregorian(today.jy, today.jm, today.jd);

  const birthDateObj = new Date(birthGregorian.gy, birthGregorian.gm - 1, birthGregorian.gd);
  const todayDateObj = new Date(todayGregorian.gy, todayGregorian.gm - 1, todayGregorian.gd);

  const diffMs = todayDateObj.getTime() - birthDateObj.getTime();
  const isFutureDate = diffMs < 0;
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = totalDays * 24;
  const totalHeartbeats = Math.floor(totalDays * 24 * 60 * 75); // approx 75 bpm

  // Exact Jalali Year, Month, Day age using calendar month length
  let ageYears = today.jy - birthYear;
  let ageMonths = today.jm - birthMonth;
  let ageDays = today.jd - birthDay;

  if (ageDays < 0) {
    ageMonths -= 1;
    const prevMonth = today.jm === 1 ? 12 : today.jm - 1;
    const prevYear = today.jm === 1 ? today.jy - 1 : today.jy;
    ageDays += getJalaliMonthLength(prevYear, prevMonth);
  }
  if (ageMonths < 0) {
    ageYears -= 1;
    ageMonths += 12;
  }

  if (isFutureDate) {
    ageYears = 0;
    ageMonths = 0;
    ageDays = 0;
  }

  // Days until next birthday
  let nextBirthdayYear = today.jy;
  if (today.jm > birthMonth || (today.jm === birthMonth && today.jd > birthDay)) {
    nextBirthdayYear = today.jy + 1;
  }
  const nextBirthdayGregorian = jalaliToGregorian(nextBirthdayYear, birthMonth, birthDay);
  const nextBirthdayDateObj = new Date(nextBirthdayGregorian.gy, nextBirthdayGregorian.gm - 1, nextBirthdayGregorian.gd);
  const daysUntilNextBirthday = isFutureDate
    ? Math.max(0, Math.ceil((birthDateObj.getTime() - todayDateObj.getTime()) / (1000 * 60 * 60 * 24)))
    : Math.max(0, Math.ceil((nextBirthdayDateObj.getTime() - todayDateObj.getTime()) / (1000 * 60 * 60 * 24)));

  const zodiac = ZODIAC_INFO[birthMonth] || ZODIAC_INFO[1];

  return (
    <div 
      id="age-calculator-modal-overlay"
      className="fixed inset-0 z-[75] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="age-calculator-modal-content"
        className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 relative my-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>محاسبه‌گر سن و سال‌شمار زندگی</span>
                <Sparkles className="w-4 h-4 text-rose-500" />
              </h3>
              <p className="text-[11px] text-slate-500">مشاهده دقیق روزها، ساعات و مشخصات طالع و سنگ ماه تولد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors text-xs font-bold"
          >
            بستن
          </button>
        </div>

        {/* Inputs */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">تاریخ تولد شما (شمسی):</label>
          <div className="grid grid-cols-3 gap-2">
            {/* Day */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">روز:</span>
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                {Array.from({ length: maxDaysInMonth }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{toPersianDigits(d)}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">ماه:</span>
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                {PERSIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">سال:</span>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                {Array.from({ length: 110 }, (_, i) => today.jy - i).map(y => (
                  <option key={y} value={y}>{toPersianDigits(y)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Banner */}
        <div className="bg-gradient-to-br from-rose-600 to-amber-600 text-white p-5 rounded-2xl shadow-lg shadow-rose-600/20 space-y-2 text-center">
          <span className="text-xs text-rose-100 font-bold block">
            {isFutureDate ? 'تاریخ انتخاب شده در آینده است:' : 'سن دقیق شما تا به امروز:'}
          </span>
          <div className="text-xl sm:text-2xl font-black">
            {isFutureDate 
              ? `${toPersianDigits(daysUntilNextBirthday)} روز تا این تاریخ باقی مانده`
              : `${toPersianDigits(ageYears)} سال و ${toPersianDigits(ageMonths)} ماه و ${toPersianDigits(ageDays)} روز`}
          </div>
          {!isFutureDate && (
            <div className="pt-2 border-t border-white/20 text-xs text-amber-100 flex items-center justify-center gap-1.5 font-bold">
              <Cake className="w-3.5 h-3.5" />
              <span>{toPersianDigits(daysUntilNextBirthday)} روز مانده تا تولد بعدی</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block">تعداد روزهای زیسته</span>
            <span className="text-sm font-black text-slate-800 mt-0.5 block">{toPersianDigits(totalDays.toLocaleString())}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block">تعداد هفته‌ها</span>
            <span className="text-sm font-black text-slate-800 mt-0.5 block">{toPersianDigits(totalWeeks.toLocaleString())}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block">ساعات عمر</span>
            <span className="text-sm font-black text-slate-800 mt-0.5 block">{toPersianDigits(totalHours.toLocaleString())}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block">تپش قلب تخمینی</span>
            <span className="text-xs sm:text-sm font-black text-rose-600 mt-0.5 block">{toPersianDigits(Math.floor(totalHeartbeats / 1000000))} میلیون</span>
          </div>
        </div>

        {/* Zodiac Card */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-600" />
              <span>برج فلکی: {zodiac.name}</span>
            </span>
            <span className="bg-white/80 px-2 py-0.5 rounded-md text-[11px] border border-amber-200 font-bold">
              عنصر {zodiac.element}
            </span>
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
            سنگ‌های ماه تولد: <strong>{zodiac.stone}</strong> • {zodiac.desc}
          </p>
        </div>
      </div>
    </div>
  );
};
