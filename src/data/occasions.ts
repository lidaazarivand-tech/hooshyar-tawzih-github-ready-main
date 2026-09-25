import { Occasion } from '../types/calendar';
import { jalaliToHijri, gregorianToHijri, hijriToJalali } from '../utils/hijri';
import { jalaliToGregorian, gregorianToJalali, getJalaliMonthLength } from '../utils/jalali';

/**
 * Fixed Solar (Jalali) Occasions and Iranian National Holidays
 */
export const SOLAR_OCCASIONS: Occasion[] = [
  // فروردین
  { id: 'sol-01-01', title: 'جشن نوروز / آغاز سال نو', isHoliday: true, type: 'national', calendarType: 'solar', month: 1, day: 1 },
  { id: 'sol-01-02', title: 'عید نوروز', isHoliday: true, type: 'national', calendarType: 'solar', month: 1, day: 2 },
  { id: 'sol-01-03', title: 'عید نوروز', isHoliday: true, type: 'national', calendarType: 'solar', month: 1, day: 3 },
  { id: 'sol-01-04', title: 'عید نوروز', isHoliday: true, type: 'national', calendarType: 'solar', month: 1, day: 4 },
  { id: 'sol-01-06', title: 'روز امید / زادروز زرتشت پیامبر', isHoliday: false, type: 'historical', calendarType: 'solar', month: 1, day: 6 },
  { id: 'sol-01-12', title: 'روز جمهوری اسلامی ایران', isHoliday: true, type: 'national', calendarType: 'solar', month: 1, day: 12 },
  { id: 'sol-01-13', title: 'روز طبیعت (سیزده‌بدر)', isHoliday: true, type: 'national', calendarType: 'solar', month: 1, day: 13 },
  { id: 'sol-01-18', title: 'روز سلامتی (روز جهانی بهداشت)', isHoliday: false, type: 'international', calendarType: 'solar', month: 1, day: 18 },
  { id: 'sol-01-25', title: 'روز بزرگداشت عطار نیشابوری', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 1, day: 25 },
  { id: 'sol-01-29', title: 'روز ارتش جمهوری اسلامی ایران و نیروی زمینی', isHoliday: false, type: 'national', calendarType: 'solar', month: 1, day: 29 },

  // اردیبهشت
  { id: 'sol-02-01', title: 'روز بزرگداشت سعدی شیرازی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 2, day: 1 },
  { id: 'sol-02-02', title: 'جشن اردیبهشتگان / روز زمین پاک', isHoliday: false, type: 'historical', calendarType: 'solar', month: 2, day: 2 },
  { id: 'sol-02-03', title: 'روز بزرگداشت شیخ بهایی / روز ملی معمار', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 2, day: 3 },
  { id: 'sol-02-09', title: 'روز شوراها / روز روانشناس و مشاور', isHoliday: false, type: 'national', calendarType: 'solar', month: 2, day: 9 },
  { id: 'sol-02-10', title: 'روز ملی خلیج فارس', isHoliday: false, type: 'national', calendarType: 'solar', month: 2, day: 10 },
  { id: 'sol-02-11', title: 'روز جهانی کار و کارگر', isHoliday: false, type: 'international', calendarType: 'solar', month: 2, day: 11 },
  { id: 'sol-02-12', title: 'روز معلم (شهادت استاد مرتضی مطهری)', isHoliday: false, type: 'national', calendarType: 'solar', month: 2, day: 12 },
  { id: 'sol-02-15', title: 'جشن میانه بهار / روز شیراز', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 2, day: 15 },
  { id: 'sol-02-25', title: 'روز بزرگداشت فردوسی و پاسداشت زبان فارسی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 2, day: 25 },
  { id: 'sol-02-28', title: 'روز بزرگداشت حکیم عمر خیام / روز جهانی موزه', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 2, day: 28 },

  // خرداد
  { id: 'sol-03-01', title: 'روز بزرگداشت ملاصدرا', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 3, day: 1 },
  { id: 'sol-03-03', title: 'فتح خرمشهر (روز مقاومت، ایثار و پیروزی)', isHoliday: false, type: 'national', calendarType: 'solar', month: 3, day: 3 },
  { id: 'sol-03-14', title: 'رحلت حضرت امام خمینی (ره)', isHoliday: true, type: 'national', calendarType: 'solar', month: 3, day: 14 },
  { id: 'sol-03-15', title: 'قیام خونین ۱۵ خرداد', isHoliday: true, type: 'national', calendarType: 'solar', month: 3, day: 15 },
  { id: 'sol-03-20', title: 'روز ملی صنایع دستی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 3, day: 20 },
  { id: 'sol-03-31', title: 'شهادت دکتر مصطفی چمران / روز بسیج اساتید', isHoliday: false, type: 'national', calendarType: 'solar', month: 3, day: 31 },

  // تیر
  { id: 'sol-04-01', title: 'جشن آب‌پاشونک / جشن آغاز تابستان', isHoliday: false, type: 'historical', calendarType: 'solar', month: 4, day: 1 },
  { id: 'sol-04-07', title: 'شهادت آیت‌الله دکتر بهشتی و ۷۲ تن از یاران / روز قوه قضاییه', isHoliday: false, type: 'national', calendarType: 'solar', month: 4, day: 7 },
  { id: 'sol-04-08', title: 'روز مبارزه با سلاح‌های شیمیایی و میکروبی', isHoliday: false, type: 'national', calendarType: 'solar', month: 4, day: 8 },
  { id: 'sol-04-10', title: 'روز صنعت و معدن', isHoliday: false, type: 'national', calendarType: 'solar', month: 4, day: 10 },
  { id: 'sol-04-14', title: 'روز قلم / جشن تیرگان', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 4, day: 14 },
  { id: 'sol-04-25', title: 'روز بهزیستی و تامین اجتماعی', isHoliday: false, type: 'national', calendarType: 'solar', month: 4, day: 25 },

  // مرداد
  { id: 'sol-05-06', title: 'روز ترویج آموزش‌های فنی و حرفه‌ای', isHoliday: false, type: 'national', calendarType: 'solar', month: 5, day: 6 },
  { id: 'sol-05-08', title: 'روز بزرگداشت شیخ شهاب‌الدین سهروردی (شیخ اشراق)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 5, day: 8 },
  { id: 'sol-05-14', title: 'صدور فرمان مشروطیت / روز حقوق بشر اسلامی', isHoliday: false, type: 'historical', calendarType: 'solar', month: 5, day: 14 },
  { id: 'sol-05-17', title: 'روز خبرنگار', isHoliday: false, type: 'national', calendarType: 'solar', month: 5, day: 17 },
  { id: 'sol-05-26', title: 'آغاز بازگشت آزادگان به میهن اسلامی', isHoliday: false, type: 'national', calendarType: 'solar', month: 5, day: 26 },
  { id: 'sol-05-28', title: 'سالروز کودتای ۲۸ مرداد علیه دکتر مصدق', isHoliday: false, type: 'historical', calendarType: 'solar', month: 5, day: 28 },

  // شهریور
  { id: 'sol-06-01', title: 'روز پزشک (بزرگداشت ابوعلی سینا)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 6, day: 1 },
  { id: 'sol-06-02', title: 'آغاز هفته دولت', isHoliday: false, type: 'national', calendarType: 'solar', month: 6, day: 2 },
  { id: 'sol-06-04', title: 'جشن شهریورگان / روز کارمند', isHoliday: false, type: 'national', calendarType: 'solar', month: 6, day: 4 },
  { id: 'sol-06-05', title: 'روز داروسازی (بزرگداشت زکریای رازی)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 6, day: 5 },
  { id: 'sol-06-13', title: 'روز بزرگداشت ابوریحان بیرونی / روز علوم پایه', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 6, day: 13 },
  { id: 'sol-06-21', title: 'روز ملی سینما', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 6, day: 21 },
  { id: 'sol-06-27', title: 'روز شعر و ادب فارسی (بزرگداشت استاد شهریار)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 6, day: 27 },
  { id: 'sol-06-31', title: 'آغاز هفته دفاع مقدس', isHoliday: false, type: 'national', calendarType: 'solar', month: 6, day: 31 },

  // مهر
  { id: 'sol-07-01', title: 'آغاز سال تحصیلی / جشن مهرگان', isHoliday: false, type: 'national', calendarType: 'solar', month: 7, day: 1 },
  { id: 'sol-07-07', title: 'روز آتش‌نشانی و ایمنی / بزرگداشت شمس تبریزی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 7, day: 7 },
  { id: 'sol-07-08', title: 'روز بزرگداشت مولوی (جلال‌الدین محمد بلخی)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 7, day: 8 },
  { id: 'sol-07-09', title: 'روز جهانی ناشنوایان و همبستگی با کودکان فلسطینی', isHoliday: false, type: 'international', calendarType: 'solar', month: 7, day: 9 },
  { id: 'sol-07-14', title: 'روز دامپزشکی', isHoliday: false, type: 'national', calendarType: 'solar', month: 7, day: 14 },
  { id: 'sol-07-15', title: 'روز روستا و عشایر', isHoliday: false, type: 'national', calendarType: 'solar', month: 7, day: 15 },
  { id: 'sol-07-20', title: 'روز بزرگداشت حافظ شیرازی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 7, day: 20 },
  { id: 'sol-07-26', title: 'روز تربیت بدنی و ورزش', isHoliday: false, type: 'national', calendarType: 'solar', month: 7, day: 26 },

  // آبان
  { id: 'sol-08-01', title: 'روز آمار و برنامه‌ریزی', isHoliday: false, type: 'national', calendarType: 'solar', month: 8, day: 1 },
  { id: 'sol-08-07', title: 'روز بزرگداشت کوروش بزرگ', isHoliday: false, type: 'historical', calendarType: 'solar', month: 8, day: 7 },
  { id: 'sol-08-08', title: 'شهادت محمدحسین فهمیده / روز نوجوان و بسیج دانش‌آموزی', isHoliday: false, type: 'national', calendarType: 'solar', month: 8, day: 8 },
  { id: 'sol-08-10', title: 'جشن آبانگان', isHoliday: false, type: 'historical', calendarType: 'solar', month: 8, day: 10 },
  { id: 'sol-08-13', title: 'روز دانش‌آموز / تسخیر لانه جاسوسی / روز ملی مبارزه با استکبار', isHoliday: false, type: 'national', calendarType: 'solar', month: 8, day: 13 },
  { id: 'sol-08-24', title: 'روز کتاب و کتابخوانی / بزرگداشت علامه طباطبایی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 8, day: 24 },

  // آذر
  { id: 'sol-09-05', title: 'روز بسیج مستضعفان', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 5 },
  { id: 'sol-09-07', title: 'روز نیروی دریایی', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 7 },
  { id: 'sol-09-10', title: 'روز مجلس (شهادت آیت‌الله سید حسن مدرس)', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 10 },
  { id: 'sol-09-12', title: 'روز قانون اساسی جمهوری اسلامی ایران', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 12 },
  { id: 'sol-09-16', title: 'روز دانشجو', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 16 },
  { id: 'sol-09-25', title: 'روز پژوهش', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 25 },
  { id: 'sol-09-26', title: 'روز حمل و نقل و رانندگان', isHoliday: false, type: 'national', calendarType: 'solar', month: 9, day: 26 },
  { id: 'sol-09-30', title: 'شب یلدا (جشن چله)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 9, day: 30 },

  // دی
  { id: 'sol-10-01', title: 'جشن خرم‌روز / آغاز زمستان', isHoliday: false, type: 'historical', calendarType: 'solar', month: 10, day: 1 },
  { id: 'sol-10-05', title: 'روز ملی ایمنی در برابر زلزله و بلایای طبیعی (سالروز زلزله بم)', isHoliday: false, type: 'national', calendarType: 'solar', month: 10, day: 5 },
  { id: 'sol-10-13', title: 'روز جهانی مقاومت (شهادت سردار سپهبد قاسم سلیمانی)', isHoliday: false, type: 'national', calendarType: 'solar', month: 10, day: 13 },
  { id: 'sol-10-19', title: 'قیام خونین مردم قم (۱۳۵۶)', isHoliday: false, type: 'historical', calendarType: 'solar', month: 10, day: 19 },
  { id: 'sol-10-27', title: 'شهادت نواب صفوی و یارانش', isHoliday: false, type: 'national', calendarType: 'solar', month: 10, day: 27 },

  // بهمن
  { id: 'sol-11-01', title: 'زادروز فردوسی / روز بزرگداشت حکیم ابوالقاسم فردوسی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 11, day: 1 },
  { id: 'sol-11-12', title: 'بازگشت امام خمینی به ایران / آغاز دهه فجر', isHoliday: false, type: 'national', calendarType: 'solar', month: 11, day: 12 },
  { id: 'sol-11-19', title: 'روز نیروی هوایی', isHoliday: false, type: 'national', calendarType: 'solar', month: 11, day: 19 },
  { id: 'sol-11-22', title: 'سالروز پیروزی انقلاب اسلامی ایران', isHoliday: true, type: 'national', calendarType: 'solar', month: 11, day: 22 },
  { id: 'sol-11-29', title: 'جشن سپندارمذگان (روز عشق و مهر ایرانی)', isHoliday: false, type: 'historical', calendarType: 'solar', month: 11, day: 29 },

  // اسفند
  { id: 'sol-12-05', title: 'روز مهندس (بزرگداشت خواجه نصیرالدین طوسی)', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 12, day: 5 },
  { id: 'sol-12-14', title: 'روز احسان و نیکوکاری', isHoliday: false, type: 'national', calendarType: 'solar', month: 12, day: 14 },
  { id: 'sol-12-15', title: 'روز درختکاری و آغاز هفته منابع طبیعی', isHoliday: false, type: 'national', calendarType: 'solar', month: 12, day: 15 },
  { id: 'sol-12-25', title: 'روز بزرگداشت پروین اعتصامی', isHoliday: false, type: 'cultural', calendarType: 'solar', month: 12, day: 25 },
  { id: 'sol-12-29', title: 'روز ملی شدن صنعت نفت ایران', isHoliday: true, type: 'national', calendarType: 'solar', month: 12, day: 29 },
  { id: 'sol-12-30', title: 'آخرین روز سال (در سال‌های کبیسه)', isHoliday: true, type: 'national', calendarType: 'solar', month: 12, day: 30 }
];

/**
 * Fixed Islamic / Hijri Lunar Occasions and Official Religious Holidays
 */
export const LUNAR_OCCASIONS: Occasion[] = [
  // محرم
  { id: 'lun-01-01', title: 'آغاز سال نو هجری قمری', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 1, day: 1 },
  { id: 'lun-01-09', title: 'تاسوعای حسینی', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 1, day: 9 },
  { id: 'lun-01-10', title: 'عاشورای حسینی', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 1, day: 10 },
  { id: 'lun-01-12', title: 'شهادت حضرت امام سجاد (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 1, day: 12 },
  { id: 'lun-01-25', title: 'شهادت حضرت امام سجاد (ع) به روایتی', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 1, day: 25 },

  // صفر
  { id: 'lun-02-07', title: 'ولادت حضرت امام موسی کاظم (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 2, day: 7 },
  { id: 'lun-02-20', title: 'اربعین حسینی', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 2, day: 20 },
  { id: 'lun-02-28', title: 'رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 2, day: 28 },
  { id: 'lun-02-29', title: 'شهادت حضرت امام رضا (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 2, day: 29 },
  { id: 'lun-02-30', title: 'شهادت حضرت امام رضا (ع)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 2, day: 30 },

  // ربیع‌الاول
  { id: 'lun-03-01', title: 'هجرت پیامبر اکرم (ص) از مکه به مدینه', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 3, day: 1 },
  { id: 'lun-03-08', title: 'شهادت حضرت امام حسن عسکری (ع)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 3, day: 8 },
  { id: 'lun-03-09', title: 'آغاز امامت حضرت ولی‌عصر (عج)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 3, day: 9 },
  { id: 'lun-03-12', title: 'میلاد حضرت رسول اکرم (ص) به روایت اهل سنت / آغاز هفته وحدت', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 3, day: 12 },
  { id: 'lun-03-17', title: 'میلاد حضرت رسول اکرم (ص) و امام جعفر صادق (ع)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 3, day: 17 },

  // ربیع‌الثانی
  { id: 'lun-04-08', title: 'ولادت حضرت امام حسن عسکری (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 4, day: 8 },
  { id: 'lun-04-10', title: 'وفات حضرت معصومه (س)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 4, day: 10 },

  // جمادی‌الاول
  { id: 'lun-05-05', title: 'ولادت حضرت زینب کبری (س) و روز پرستار', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 5, day: 5 },
  { id: 'lun-05-13', title: 'شهادت حضرت فاطمه زهرا (س) به روایتی', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 5, day: 13 },

  // جمادی‌الثانی
  { id: 'lun-06-03', title: 'شهادت حضرت فاطمه زهرا (س)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 6, day: 3 },
  { id: 'lun-06-20', title: 'ولادت حضرت فاطمه زهرا (س) و روز زن و مادر', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 6, day: 20 },

  // رجب
  { id: 'lun-07-01', title: 'ولادت حضرت امام محمد باقر (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 7, day: 1 },
  { id: 'lun-07-03', title: 'شهادت حضرت امام علی‌نقی الهادی (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 7, day: 3 },
  { id: 'lun-07-10', title: 'ولادت حضرت امام محمدتقی الجواد (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 7, day: 10 },
  { id: 'lun-07-13', title: 'ولادت حضرت علی (ع) و روز پدر و مرد', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 7, day: 13 },
  { id: 'lun-07-15', title: 'وفات حضرت زینب کبری (س)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 7, day: 15 },
  { id: 'lun-07-25', title: 'شهادت حضرت امام موسی کاظم (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 7, day: 25 },
  { id: 'lun-07-27', title: 'مبعث حضرت رسول اکرم (ص)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 7, day: 27 },

  // شعبان
  { id: 'lun-08-03', title: 'ولادت حضرت امام حسین (ع) و روز پاسدار', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 8, day: 3 },
  { id: 'lun-08-04', title: 'ولادت حضرت ابوالفضل العباس (ع) و روز جانباز', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 8, day: 4 },
  { id: 'lun-08-05', title: 'ولادت حضرت امام سجاد (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 8, day: 5 },
  { id: 'lun-08-11', title: 'ولادت حضرت علی‌اکبر (ع) و روز جوان', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 8, day: 11 },
  { id: 'lun-08-15', title: 'ولادت حضرت قائم عجل‌الله تعالی فرجه (نیمه شعبان)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 8, day: 15 },

  // رمضان
  { id: 'lun-09-01', title: 'آغاز ماه مبارک رمضان', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 1 },
  { id: 'lun-09-10', title: 'وفات حضرت خدیجه کبری (س)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 10 },
  { id: 'lun-09-15', title: 'ولادت حضرت امام حسن مجتبی (ع) و روز اکرام', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 15 },
  { id: 'lun-09-18', title: 'شب قدر (نخست)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 18 },
  { id: 'lun-09-19', title: 'ضربت خوردن حضرت علی (ع) / شب قدر', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 19 },
  { id: 'lun-09-20', title: 'شب قدر (دوم)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 20 },
  { id: 'lun-09-21', title: 'شهادت حضرت علی (ع)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 9, day: 21 },
  { id: 'lun-09-22', title: 'شب قدر (سوم)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 9, day: 22 },

  // شوال
  { id: 'lun-10-01', title: 'عید سعید فطر', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 10, day: 1 },
  { id: 'lun-10-02', title: 'تعطیل به مناسبت عید سعید فطر', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 10, day: 2 },
  { id: 'lun-10-25', title: 'شهادت حضرت امام جعفر صادق (ع)', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 10, day: 25 },

  // ذیقعده
  { id: 'lun-11-01', title: 'ولادت حضرت معصومه (س) و روز دختران', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 11, day: 1 },
  { id: 'lun-11-11', title: 'ولادت حضرت امام رضا (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 11, day: 11 },
  { id: 'lun-11-29', title: 'شهادت حضرت امام محمد تقی الجواد (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 11, day: 29 },
  { id: 'lun-11-30', title: 'شهادت حضرت امام محمد تقی الجواد (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 11, day: 30 },

  // ذیحجه
  { id: 'lun-12-01', title: 'سالروز ازدواج حضرت علی (ع) و حضرت فاطمه (س) / روز ازدواج', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 12, day: 1 },
  { id: 'lun-12-07', title: 'شهادت حضرت امام محمد باقر (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 12, day: 7 },
  { id: 'lun-12-09', title: 'روز عرفه / روز نیایش', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 12, day: 9 },
  { id: 'lun-12-10', title: 'عید سعید قربان', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 12, day: 10 },
  { id: 'lun-12-15', title: 'ولادت حضرت امام علی‌نقی الهادی (ع)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 12, day: 15 },
  { id: 'lun-12-18', title: 'عید سعید غدیر خم', isHoliday: true, type: 'religious', calendarType: 'lunar', month: 12, day: 18 },
  { id: 'lun-12-24', title: 'روز مباهله پیامبر اسلام (ص)', isHoliday: false, type: 'religious', calendarType: 'lunar', month: 12, day: 24 }
];

/**
 * Gregorian / International Occasions
 */
export const GREGORIAN_OCCASIONS: Occasion[] = [
  { id: 'greg-01-01', title: 'آغاز سال نو میلادی (Happy New Year)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 1, day: 1 },
  { id: 'greg-02-14', title: 'روز جهانی ولنتاین (روز مهرورزی)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 2, day: 14 },
  { id: 'greg-03-08', title: 'روز جهانی زن (International Women\'s Day)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 3, day: 8 },
  { id: 'greg-03-20', title: 'روز جهانی شادی (International Day of Happiness)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 3, day: 20 },
  { id: 'greg-04-22', title: 'روز جهانی زمین پاک (Earth Day)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 4, day: 22 },
  { id: 'greg-05-01', title: 'روز جهانی کارگر (May Day)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 5, day: 1 },
  { id: 'greg-06-05', title: 'روز جهانی محیط زیست (World Environment Day)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 6, day: 5 },
  { id: 'greg-09-21', title: 'روز جهانی صلح (International Peace Day)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 9, day: 21 },
  { id: 'greg-10-05', title: 'روز جهانی معلم (World Teachers\' Day)', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 10, day: 5 },
  { id: 'greg-12-25', title: 'میلاد حضرت عیسی مسیح (ع) / جشن کریسمس', isHoliday: false, type: 'international', calendarType: 'gregorian', month: 12, day: 25 }
];

const dateOccasionsCache = new Map<string, Occasion[]>();

/**
 * Get all occasions for a specific Jalali date
 */
export function getOccasionsForDate(
  jy: number, 
  jm: number, 
  jd: number, 
  hijriAdjustment: number = 0
): Occasion[] {
  const cacheKey = `${jy}-${jm}-${jd}-${hijriAdjustment}`;
  const cached = dateOccasionsCache.get(cacheKey);
  if (cached) return cached;

  const occasions: Occasion[] = [];

  // 1. Check Solar Occasions
  for (const occ of SOLAR_OCCASIONS) {
    if (occ.month === jm && occ.day === jd) {
      if (!occ.yearSpecific || occ.yearSpecific === jy) {
        occasions.push(occ);
      }
    }
  }

  // 2. Check Hijri Lunar Occasions
  const hijri = jalaliToHijri(jy, jm, jd, hijriAdjustment);
  for (const occ of LUNAR_OCCASIONS) {
    if (occ.month === hijri.hm && occ.day === hijri.hd) {
      occasions.push(occ);
    }
  }

  // 3. Check Gregorian Occasions
  const greg = jalaliToGregorian(jy, jm, jd);
  for (const occ of GREGORIAN_OCCASIONS) {
    if (occ.month === greg.gm && occ.day === greg.gd) {
      occasions.push(occ);
    }
  }

  // Deduplicate if identical title exists
  const uniqueTitles = new Set<string>();
  const results = occasions.filter(o => {
    if (uniqueTitles.has(o.title)) return false;
    uniqueTitles.add(o.title);
    return true;
  });

  dateOccasionsCache.set(cacheKey, results);
  return results;
}

/**
 * Persian text normalization for accurate multi-dialect and spelling search
 */
export function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|آ/g, 'ا')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove arabic diacritics
    .replace(/[\u200C\u200B\u200E\u200F\-\_\/\(\)«»\[\]،,.:;!؟?]/g, ' ') // normalize half-space, punctuation to spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a Jalali date is an official holiday (تعطیل رسمی)
 * Note: Fridays are also holidays by default in Iran!
 */
export function isDateOfficialHoliday(
  jy: number, 
  jm: number, 
  jd: number, 
  hijriAdjustment: number = 0
): boolean {
  const occasions = getOccasionsForDate(jy, jm, jd, hijriAdjustment);
  return occasions.some(o => o.isHoliday);
}

export interface SearchOccasionResult {
  occasion: Occasion;
  jy: number;
  jm: number;
  jd: number;
  dateKey: string;
}

// In-memory cache of pre-calculated occasions by year and adjustment
const yearOccasionsCache = new Map<string, SearchOccasionResult[]>();

/**
 * Get all occasions occurring within a specific Jalali year (Fast, 100% Accurate & Cached)
 */
export function getYearOccasions(year: number, hijriAdjustment: number = 0): SearchOccasionResult[] {
  const cacheKey = `${year}-${hijriAdjustment}`;
  const cached = yearOccasionsCache.get(cacheKey);
  if (cached) return cached;

  const results: SearchOccasionResult[] = [];
  const seenMap = new Set<string>();

  // Iterate all 12 months in the Jalali year
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = getJalaliMonthLength(year, m);
    for (let d = 1; d <= daysInMonth; d++) {
      const occs = getOccasionsForDate(year, m, d, hijriAdjustment);
      const dateKey = `${year}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
      for (const occ of occs) {
        const dedupeKey = `${dateKey}-${occ.id}-${occ.title}`;
        if (!seenMap.has(dedupeKey)) {
          seenMap.add(dedupeKey);
          results.push({
            occasion: occ,
            jy: year,
            jm: m,
            jd: d,
            dateKey
          });
        }
      }
    }
  }

  // Sort chronologically by month and day
  results.sort((a, b) => {
    if (a.jm !== b.jm) return a.jm - b.jm;
    return a.jd - b.jd;
  });

  yearOccasionsCache.set(cacheKey, results);
  return results;
}

/**
 * Search occasions by query string across years (e.g. 1404 to 1410) — Blazing fast & Instant
 */
export function searchOccasions(
  query: string, 
  startYear: number = 1404, 
  endYear: number = 1410,
  hijriAdjustment: number = 0
): SearchOccasionResult[] {
  const normalizedQuery = normalizePersianText(query);
  const queryWords = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean) : [];

  const results: SearchOccasionResult[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearList = getYearOccasions(year, hijriAdjustment);

    for (const item of yearList) {
      if (queryWords.length === 0) {
        // If empty query, include all major holidays
        if (item.occasion.isHoliday) {
          results.push(item);
        }
      } else {
        const occ = item.occasion;
        const normalizedTitle = normalizePersianText(occ.title);
        const normalizedDesc = normalizePersianText(occ.description || '');
        const fullContent = `${normalizedTitle} ${normalizedDesc}`;

        // Check if all search words are found in the occasion title, description, or type aliases
        const match = queryWords.every(w => {
          if (fullContent.includes(w)) return true;
          if (w === 'تعطیل' || w === 'تعطیلی' || w === 'تعطیلات') return occ.isHoliday;
          if (w === 'مذهبی' || w === 'اسلامی' || w === 'قمری') return occ.type === 'religious' || occ.calendarType === 'lunar';
          if (w === 'ملی' || w === 'شمسی' || w === 'خورشیدی' || w === 'باستانی') return occ.type === 'national' || occ.type === 'cultural' || occ.type === 'historical' || occ.calendarType === 'solar';
          if (w === 'بین‌المللی' || w === 'میلادی' || w === 'جهانی') return occ.type === 'international' || occ.calendarType === 'gregorian';
          return false;
        });

        if (match) {
          results.push(item);
        }
      }
    }
  }

  return results;
}
