import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Calendar as CalendarIcon, 
  Sun, 
  Moon, 
  Sparkles, 
  Clock, 
  Share2, 
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { 
  JalaliDate, 
  GregorianDate, 
  HijriDate, 
  FullDateInfo 
} from '../../types/calendar';
import { 
  toPersianDigits, 
  toEnglishDigits, 
  PERSIAN_MONTH_NAMES, 
  GREGORIAN_MONTH_NAMES, 
  GREGORIAN_MONTH_NAMES_FA, 
  HIJRI_MONTH_NAMES 
} from '../../utils/persianNumber';
import { 
  gregorianToJalali, 
  jalaliToGregorian, 
  getJalaliMonthLength, 
  isLeapYear, 
  getTodayJalali,
  getTodayGregorian,
  getJalaliDayOfWeek,
  getDayOfWeekName,
  getDaysDifference
} from '../../utils/jalali';
import { 
  jalaliToHijri, 
  gregorianToHijri, 
  hijriToGregorian, 
  hijriToJalali 
} from '../../utils/hijri';
import { getOccasionsForDate } from '../../data/occasions';

interface DateConverterViewProps {
  initialDate?: JalaliDate;
  hijriAdjustment: number;
  onNavigateToCalendar: (year: number, month: number, day: number) => void;
}

type ConverterMode = 'jalali_to_others' | 'gregorian_to_others' | 'hijri_to_others';

export const DateConverterView: React.FC<DateConverterViewProps> = ({
  initialDate,
  hijriAdjustment,
  onNavigateToCalendar
}) => {
  const todayJalali = getTodayJalali();
  const todayGreg = getTodayGregorian();
  const todayHijri = jalaliToHijri(todayJalali.jy, todayJalali.jm, todayJalali.jd, hijriAdjustment);

  const [mode, setMode] = useState<ConverterMode>('jalali_to_others');
  const [copied, setCopied] = useState(false);

  // Jalali inputs
  const [jYearInput, setJYearInput] = useState<string>((initialDate?.jy || todayJalali.jy).toString());
  const [jMonth, setJMonth] = useState<number>(initialDate?.jm || todayJalali.jm);
  const [jDay, setJDay] = useState<number>(initialDate?.jd || todayJalali.jd);

  // Gregorian inputs
  const [gYearInput, setGYearInput] = useState<string>(todayGreg.gy.toString());
  const [gMonth, setGMonth] = useState<number>(todayGreg.gm);
  const [gDay, setGDay] = useState<number>(todayGreg.gd);

  // Hijri inputs
  const [hYearInput, setHYearInput] = useState<string>(todayHijri.hy.toString());
  const [hMonth, setHMonth] = useState<number>(todayHijri.hm);
  const [hDay, setHDay] = useState<number>(todayHijri.hd);

  const handleJYearChange = (val: string) => {
    const cleaned = toEnglishDigits(val).replace(/[^0-9]/g, '').slice(0, 4);
    setJYearInput(cleaned);
  };

  const handleGYearChange = (val: string) => {
    const cleaned = toEnglishDigits(val).replace(/[^0-9]/g, '').slice(0, 4);
    setGYearInput(cleaned);
  };

  const handleHYearChange = (val: string) => {
    const cleaned = toEnglishDigits(val).replace(/[^0-9]/g, '').slice(0, 4);
    setHYearInput(cleaned);
  };

  const effectiveJYear = useMemo(() => {
    const num = parseInt(toEnglishDigits(jYearInput), 10);
    if (!isNaN(num) && num >= 1 && num <= 3000) return num;
    return todayJalali.jy;
  }, [jYearInput, todayJalali.jy]);

  const effectiveGYear = useMemo(() => {
    const num = parseInt(toEnglishDigits(gYearInput), 10);
    if (!isNaN(num) && num >= 1 && num <= 3000) return num;
    return todayGreg.gy;
  }, [gYearInput, todayGreg.gy]);

  const effectiveHYear = useMemo(() => {
    const num = parseInt(toEnglishDigits(hYearInput), 10);
    if (!isNaN(num) && num >= 1 && num <= 3000) return num;
    return todayHijri.hy;
  }, [hYearInput, todayHijri.hy]);

  // Compute calculated converted dates
  const conversionResult = useMemo(() => {
    try {
      let finalJalali: JalaliDate = todayJalali;
      let finalGreg: GregorianDate = todayGreg;
      let finalHijri: HijriDate = todayHijri;

      if (mode === 'jalali_to_others') {
        const monthLength = getJalaliMonthLength(effectiveJYear, jMonth);
        const validDay = Math.max(1, Math.min(jDay, monthLength));
        finalJalali = { jy: effectiveJYear, jm: jMonth, jd: validDay };
        finalGreg = jalaliToGregorian(effectiveJYear, jMonth, validDay);
        finalHijri = jalaliToHijri(effectiveJYear, jMonth, validDay, hijriAdjustment);
      } else if (mode === 'gregorian_to_others') {
        const daysInMonth = new Date(effectiveGYear, gMonth, 0).getDate();
        const validDay = Math.max(1, Math.min(gDay, daysInMonth));
        finalGreg = { gy: effectiveGYear, gm: gMonth, gd: validDay };
        finalJalali = gregorianToJalali(effectiveGYear, gMonth, validDay);
        finalHijri = gregorianToHijri(effectiveGYear, gMonth, validDay, hijriAdjustment);
      } else {
        // hijri_to_others
        const validDay = Math.max(1, Math.min(hDay, 30));
        finalHijri = { hy: effectiveHYear, hm: hMonth, hd: validDay };
        finalGreg = hijriToGregorian(effectiveHYear, hMonth, validDay, hijriAdjustment);
        finalJalali = hijriToJalali(effectiveHYear, hMonth, validDay, hijriAdjustment);
      }

      const dayOfWeek = getJalaliDayOfWeek(finalJalali.jy, finalJalali.jm, finalJalali.jd);
      const dayOfWeekName = getDayOfWeekName(dayOfWeek);
      const occasions = getOccasionsForDate(finalJalali.jy, finalJalali.jm, finalJalali.jd, hijriAdjustment) || [];
      const isLeapJ = isLeapYear(finalJalali.jy);
      const daysDiff = getDaysDifference(todayJalali, finalJalali) || 0;

      return {
        jalali: finalJalali,
        gregorian: finalGreg,
        hijri: finalHijri,
        dayOfWeek,
        dayOfWeekName,
        occasions,
        isLeapJ,
        daysDiff
      };
    } catch (err) {
      return {
        jalali: todayJalali,
        gregorian: todayGreg,
        hijri: todayHijri,
        dayOfWeek: 0,
        dayOfWeekName: 'شنبه',
        occasions: [],
        isLeapJ: false,
        daysDiff: 0
      };
    }
  }, [mode, effectiveJYear, jMonth, jDay, effectiveGYear, gMonth, gDay, effectiveHYear, hMonth, hDay, hijriAdjustment, todayJalali, todayGreg, todayHijri]);

  const handleCopy = () => {
    const text = `تاریخ شمسی: ${conversionResult.dayOfWeekName} ${toPersianDigits(conversionResult.jalali.jd)} ${PERSIAN_MONTH_NAMES[conversionResult.jalali.jm - 1]} ${toPersianDigits(conversionResult.jalali.jy)}
تاریخ میلادی: ${conversionResult.gregorian.gd} ${GREGORIAN_MONTH_NAMES[conversionResult.gregorian.gm - 1]} ${conversionResult.gregorian.gy}
تاریخ قمری: ${toPersianDigits(conversionResult.hijri.hd)} ${HIJRI_MONTH_NAMES[conversionResult.hijri.hm - 1]} ${toPersianDigits(conversionResult.hijri.hy)}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToToday = () => {
    setJYearInput(todayJalali.jy.toString());
    setJMonth(todayJalali.jm);
    setJDay(todayJalali.jd);
    setGYearInput(todayGreg.gy.toString());
    setGMonth(todayGreg.gm);
    setGDay(todayGreg.gd);
    setHYearInput(todayHijri.hy.toString());
    setHMonth(todayHijri.hm);
    setHDay(todayHijri.hd);
  };

  return (
    <div id="date-converter-view" className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-white/10 text-rose-400">
                <ArrowLeftRight className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-rose-300">موتور دقیق محاسبات تقویم</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">تبدیل تاریخ هوشمند</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              تبدیل دوطرفه و دقیق بین سه گاهشماری هجری شمسی، میلادی و هجری قمری با محاسبه روز هفته، کبیسه و مناسبت‌ها
            </p>
          </div>

          <button
            id="btn-reset-converter-today"
            onClick={handleResetToToday}
            className="self-start md:self-auto px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>تنظیم روی امروز</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          id="btn-tab-jalali-to-others"
          onClick={() => setMode('jalali_to_others')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'jalali_to_others'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>شمسی → میلادی و قمری</span>
        </button>

        <button
          id="btn-tab-gregorian-to-others"
          onClick={() => setMode('gregorian_to_others')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'gregorian_to_others'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>میلادی → شمسی و قمری</span>
        </button>

        <button
          id="btn-tab-hijri-to-others"
          onClick={() => setMode('hijri_to_others')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'hijri_to_others'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Moon className="w-4 h-4" />
          <span>قمری → شمسی و میلادی</span>
        </button>
      </div>

      {/* Input Selection Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-600" />
          <span>
            {mode === 'jalali_to_others'
              ? 'تاریخ هجری شمسی را مشخص کنید:'
              : mode === 'gregorian_to_others'
              ? 'تاریخ میلادی (Gregorian) را مشخص کنید:'
              : 'تاریخ هجری قمری را مشخص کنید:'}
          </span>
        </h3>

        {/* Jalali Mode Inputs */}
        {mode === 'jalali_to_others' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">روز</label>
              <select
                value={jDay}
                onChange={(e) => setJDay(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {Array.from({ length: getJalaliMonthLength(effectiveJYear, jMonth) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {toPersianDigits(d)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">ماه</label>
              <select
                value={jMonth}
                onChange={(e) => setJMonth(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {PERSIAN_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name} ({toPersianDigits(idx + 1)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">سال شمسی</label>
              <input
                type="text"
                inputMode="numeric"
                value={jYearInput}
                onChange={(e) => handleJYearChange(e.target.value)}
                placeholder="مثال: ۱۴۰۴"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Gregorian Mode Inputs */}
        {mode === 'gregorian_to_others' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Day (روز)</label>
              <select
                value={gDay}
                onChange={(e) => setGDay(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none font-sans"
              >
                {Array.from({ length: new Date(effectiveGYear, gMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Month (ماه)</label>
              <select
                value={gMonth}
                onChange={(e) => setGMonth(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {GREGORIAN_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name} ({GREGORIAN_MONTH_NAMES_FA[idx]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Year (سال میلادی)</label>
              <input
                type="text"
                inputMode="numeric"
                value={gYearInput}
                onChange={(e) => handleGYearChange(e.target.value)}
                placeholder="Example: 2025"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none font-sans"
              />
            </div>
          </div>
        )}

        {/* Hijri Mode Inputs */}
        {mode === 'hijri_to_others' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">روز قمری</label>
              <select
                value={hDay}
                onChange={(e) => setHDay(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {toPersianDigits(d)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">ماه قمری</label>
              <select
                value={hMonth}
                onChange={(e) => setHMonth(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {HIJRI_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name} ({toPersianDigits(idx + 1)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">سال قمری</label>
              <input
                type="text"
                inputMode="numeric"
                value={hYearInput}
                onChange={(e) => handleHYearChange(e.target.value)}
                placeholder="مثال: ۱۴۴۶"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Result Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-black text-slate-900">نتیجه دقیق تبدیل تاریخ</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-converted-dates"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>کپی تاریخ‌ها</span>
                </>
              )}
            </button>

            <button
              onClick={() => onNavigateToCalendar(conversionResult.jalali.jy, conversionResult.jalali.jm, conversionResult.jalali.jd)}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <span>مشاهده در تقویم</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Result Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Jalali Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50/50 border border-rose-200 space-y-1.5 text-right relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 text-rose-600" />
                <span>هجری شمسی (جلالی)</span>
              </div>
              <span className="text-[10px] bg-rose-200/60 px-1.5 py-0.5 rounded-md text-rose-900">
                تقویم رسمی ایران
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 pt-1">
              {conversionResult.dayOfWeekName} {toPersianDigits(conversionResult.jalali.jd)} {PERSIAN_MONTH_NAMES[conversionResult.jalali.jm - 1]} {toPersianDigits(conversionResult.jalali.jy)}
            </div>
            <div className="text-xs text-slate-500">
              {conversionResult.isLeapJ ? '🌟 سال کبیسه شمسی (۳۶۶ روز)' : 'سال عادی شمسی (۳۶۵ روز)'}
            </div>
          </div>

          {/* Gregorian Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-right">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1">
                <Sun className="w-4 h-4 text-amber-600" />
                <span>میلادی (Gregorian)</span>
              </div>
              <span className="text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded-md text-slate-800">
                بین‌المللی
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-sans tracking-tight pt-1">
              {conversionResult.gregorian.gd} {GREGORIAN_MONTH_NAMES[conversionResult.gregorian.gm - 1]} {conversionResult.gregorian.gy}
            </div>
            <div className="text-xs text-slate-500">
              معادل: {toPersianDigits(conversionResult.gregorian.gd)} {GREGORIAN_MONTH_NAMES_FA[conversionResult.gregorian.gm - 1]} {toPersianDigits(conversionResult.gregorian.gy)}
            </div>
          </div>

          {/* Hijri Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 text-right">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <div className="flex items-center gap-1">
                <Moon className="w-4 h-4 text-emerald-600" />
                <span>هجری قمری (Islamic)</span>
              </div>
              <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded-md text-emerald-900">
                گاهشماری اسلامی
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 pt-1">
              {toPersianDigits(conversionResult.hijri.hd)} {HIJRI_MONTH_NAMES[conversionResult.hijri.hm - 1]} {toPersianDigits(conversionResult.hijri.hy)}
            </div>
            <div className="text-xs text-emerald-700/80">
              با احتساب تعدیل روز ({toPersianDigits(hijriAdjustment)} روز)
            </div>
          </div>
        </div>

        {/* Extra Information: Time Difference & Occasions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Time Difference */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <span className="font-semibold">فاصله زمانی با امروز:</span>
            <span className="font-bold text-slate-900">
              {conversionResult.daysDiff === 0
                ? 'امروز است'
                : conversionResult.daysDiff > 0
                ? `${toPersianDigits(conversionResult.daysDiff)} روز دیگر (${toPersianDigits((conversionResult.daysDiff / 30).toFixed(1))} ماه بعد)`
                : `${toPersianDigits(Math.abs(conversionResult.daysDiff))} روز پیش (${toPersianDigits((Math.abs(conversionResult.daysDiff) / 365).toFixed(1))} سال پیش)`}
            </span>
          </div>

          {/* Day of week */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <span className="font-semibold">روز هفته:</span>
            <span className={`font-bold ${conversionResult.dayOfWeek === 6 ? 'text-rose-600' : 'text-slate-900'}`}>
              {conversionResult.dayOfWeekName} {conversionResult.dayOfWeek === 6 ? '(تعطیل هفتگی)' : ''}
            </span>
          </div>
        </div>

        {/* Occasions in this date */}
        {conversionResult.occasions.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>مناسبت‌های ثبت‌شده برای این تاریخ:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {conversionResult.occasions.map(occ => (
                <div 
                  key={occ.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                    occ.isHoliday 
                      ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold' 
                      : 'bg-white border-amber-200 text-slate-800'
                  }`}
                >
                  <span>{occ.isHoliday ? '🔴' : '•'}</span>
                  <span>{occ.title}</span>
                  {occ.isHoliday && (
                    <span className="text-[10px] text-rose-600 font-black">تعطیل رسمی</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
