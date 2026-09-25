export type CalendarType = 'jalali' | 'gregorian' | 'hijri';

export interface JalaliDate {
  jy: number; // Jalali year (e.g. 1404)
  jm: number; // Jalali month (1-12)
  jd: number; // Jalali day (1-31)
}

export interface GregorianDate {
  gy: number;
  gm: number; // 1-12
  gd: number; // 1-31
}

export interface HijriDate {
  hy: number;
  hm: number; // 1-12
  hd: number; // 1-30
}

export interface FullDateInfo {
  jalali: JalaliDate;
  gregorian: GregorianDate;
  hijri: HijriDate;
  dayOfWeek: number; // 0 = شنبه, 1 = یکشنبه, ..., 6 = جمعه
  dayOfWeekName: string; // شنبه, یکشنبه, ...
  isFriday: boolean;
  isHoliday: boolean;
  isCurrentDay: boolean;
  isLeapYear: boolean;
  zodiacSign: string; // برج فلکی (حمل، ثور، ...)
  seasonName: string; // بهار، تابستان، پاییز، زمستان
  occasions: Occasion[];
}

export type OccasionType = 'national' | 'religious' | 'historical' | 'cultural' | 'international' | 'custom';

export interface Occasion {
  id: string;
  title: string;
  isHoliday: boolean; // 🔴 تعطیل رسمی
  type: OccasionType;
  description?: string;
  // Source calendar
  calendarType: 'solar' | 'lunar' | 'gregorian';
  month: number;
  day: number;
  yearSpecific?: number; // if only applies to a specific Jalali year
}

export interface UserNote {
  id: string;
  dateKey: string; // YYYY-MM-DD in Jalali (e.g. "1404-01-25")
  title: string;
  content: string;
  createdAt: number;
  color?: string;
  category?: string;
  updatedAt?: number;
}

export interface UserTask {
  id: string;
  dateKey: string; // "1404-01-25"
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export type ReminderCategory = 'birthday' | 'anniversary' | 'event' | 'meeting' | 'bill' | 'custom' | 'check' | 'other';

export interface UserReminder {
  id: string;
  title: string;
  dateKey: string;
  time?: string;
  category?: ReminderCategory;
  type?: ReminderCategory;
  repeatYearly?: boolean;
  repeat?: 'yearly' | 'monthly' | 'weekly' | 'none';
  notes?: string;
  enabled?: boolean;
  isEnabled?: boolean;
  notificationId?: number;
}

export interface ExpenseItem {
  id: string;
  dateKey: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  sourceDebtId?: string;
  sourcePaymentId?: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  dateKey: string;
  note?: string;
  createdAt: number;
}

export interface DebtItem {
  id: string;
  type: 'debt' | 'credit'; // 'debt' = بدهی ما به دیگران (بستانکاران) | 'credit' = طلب ما از دیگران (بدهکاران)
  personName: string;
  phone?: string;
  amount: number; // کل مبلغ
  settledAmount: number; // مقدار پرداخت یا وصول شده
  isSettled: boolean; // وضعیت تسویه کامل
  startDate: string; // تاریخ ثبت یا دریافت/پرداخت قرض
  createdDate?: string;
  dueDate?: string; // تاریخ سررسید یا موعد تسویه
  category?: string; // قرض‌الحسنه، خرید قسطی، امانت، کاری و...
  description?: string; // توضیحات
  payments?: DebtPayment[]; // تاریخچه مبالغ جزئی
  createdAt: number;
}

export type CalendarTheme = 'persianRose' | 'turquoiseIsfahan' | 'desertNight' | 'saffronGold' | 'emeraldParadise';

export interface CalendarSettings {
  selectedCityId: string;
  hijriAdjustment: number;
  showHijriInCells: boolean;
  showGregorianInCells: boolean;
  theme: 'light' | 'dark';
  colorTheme?: CalendarTheme;
  fontFamily?: 'shabnam' | 'sahel' | 'vazir' | 'samim' | 'parastoo';
  customEvents?: Occasion[];
  autoAzanEnabled?: boolean;
  azanAlarmFajr?: boolean;
  azanAlarmDhuhr?: boolean;
  azanAlarmMaghrib?: boolean;
  azanReciter?: string;
  dailyNotificationEnabled?: boolean;
}

export type AppTab = 
  | 'home' 
  | 'calendar' 
  | 'library'
  | 'tasks' 
  | 'finance' 
  | 'more'
  | 'converter' 
  | 'notes' 
  | 'reminders' 
  | 'settings';
