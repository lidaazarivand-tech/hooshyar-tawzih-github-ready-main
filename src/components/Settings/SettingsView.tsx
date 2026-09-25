import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  MapPin, 
  Moon, 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  Download, 
  Upload,
  RotateCcw, 
  Check, 
  Type, 
  Sparkles, 
  Palette, 
  Volume2, 
  Compass, 
  Play, 
  Square, 
  Bell, 
  BellRing, 
  Radio,
  BookOpen,
  FileCheck
} from 'lucide-react';
import { CalendarSettings, CalendarTheme, UserNote, UserTask, UserReminder, ExpenseItem, DebtItem } from '../../types/calendar';
import { IRANIAN_CITIES, calculateQiblaAngle, calculateDistanceToMeccaKm } from '../../utils/prayerTimes';
import { toPersianDigits, HIJRI_MONTH_NAMES } from '../../utils/persianNumber';
import { THEME_PRESETS } from '../../utils/themePresets';
import { AZAN_RECITERS, azanAudioEngine } from '../../utils/azanAudioEngine';
import { requestNotificationPermission, showDailyDateNotification, hasNotificationPermission } from '../../utils/notificationService';
import { isNativeAzanAvailable } from '../../utils/nativeAzan';
import { useExactAlarmPermission } from '../../hooks/useExactAlarmPermission';
import { cacheAllAzans } from '../../utils/azanCache';
import { getTodayJalali } from '../../utils/jalali';
import { getFullDateInfo } from '../../utils/dateInfo';
import { 
  validateAndRestoreBackup, 
  RestoreResult 
} from '../../utils/storage';
import { decryptBackupContent, exportBackupFile, NativeBackup } from '../../utils/backupService';
import { Capacitor } from '@capacitor/core';
import { APP_NAME, APP_TAGLINE, APP_AUTHOR, APP_EMAIL, APP_VERSION, APP_YEAR, APP_DESCRIPTION } from '../../constants/appInfo';

interface SettingsViewProps {
  settings: CalendarSettings;
  onUpdateSettings?: (newSettings: Partial<CalendarSettings>) => void;
  onResetAllData?: () => void;
  onRestoreData?: (restored: {
    settings?: CalendarSettings;
    notes?: UserNote[];
    tasks?: UserTask[];
    reminders?: UserReminder[];
    expenses?: ExpenseItem[];
    debts?: DebtItem[];
  }) => void;
  activeSettingsTab?: string;
  onSelectTab?: (tabId: string) => void;
  onOpenWelcome?: () => void;
}

export type SettingsSubTab = 'themes' | 'typography' | 'location' | 'azan' | 'hijri' | 'display' | 'backup';

const FONT_OPTIONS: Array<{
  id: 'vazir' | 'shabnam' | 'sahel' | 'samim' | 'parastoo';
  name: string;
  enName: string;
  tag: string;
  description: string;
  previewClass: string;
  sampleDigits: string;
  sampleQuote: string;
  sampleUi: string;
}> = [
  {
    id: 'vazir',
    name: 'وزیرمتن',
    enName: 'Vazirmatn',
    tag: 'استاندارد و خوانا (پیش‌فرض)',
    description: 'قلم رسمی و با وضوح فوق‌العاده در تمام اندازه‌ها و صفحات',
    previewClass: 'font-preview-vazir',
    sampleDigits: '۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹',
    sampleQuote: 'هوشیار؛ تقویم و دستیار هوشمند ایرانی',
    sampleUi: 'شنبه ۲۵ فروردین • اذان مغرب ۱۹:۴۵'
  },
  {
    id: 'shabnam',
    name: 'شبنم',
    enName: 'Shabnam',
    tag: 'مدرن و متوازن',
    description: 'قلمی چشم‌نواز با ساختار هندسی مدرن و طراحی یکدست',
    previewClass: 'font-preview-shabnam',
    sampleDigits: '۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹',
    sampleQuote: 'تقویم جامع رویدادها، اوقات شرعی و مناسبت‌ها',
    sampleUi: 'شنبه ۲۵ فروردین • اذان مغرب ۱۹:۴۵'
  },
  {
    id: 'sahel',
    name: 'ساحل',
    enName: 'Sahel',
    tag: 'نرم، لطیف و آرامش‌بخش',
    description: 'قلمی با لبه‌های ملایم و خوانایی عالی برای مطالعه متون',
    previewClass: 'font-preview-sahel',
    sampleDigits: '۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹',
    sampleQuote: 'زیبایی و آرامش در مدیریت کارهای روزانه',
    sampleUi: 'شنبه ۲۵ فروردین • اذان مغرب ۱۹:۴۵'
  },
  {
    id: 'samim',
    name: 'صمیم',
    enName: 'Samim',
    tag: 'گرد، صمیمی و دوستانه',
    description: 'طراحی گرم و پر انرژی برای استفاده روزمره و شخصی',
    previewClass: 'font-preview-samim',
    sampleDigits: '۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹',
    sampleQuote: 'برنامه‌ریزی دقیق، یادداشت‌ها و کارهای روزمره',
    sampleUi: 'شنبه ۲۵ فروردین • اذان مغرب ۱۹:۴۵'
  },
  {
    id: 'parastoo',
    name: 'پرستو',
    enName: 'Parastoo',
    tag: 'اصیل و دارای حس خط نسخ',
    description: 'خطی اصیل با هویت فرهنگی و تراش زیبای حروف فارسی',
    previewClass: 'font-preview-parastoo',
    sampleDigits: '۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹',
    sampleQuote: 'هر روز، آغازی نو برای پویایی و شکفتن',
    sampleUi: 'شنبه ۲۵ فروردین • اذان مغرب ۱۹:۴۵'
  }
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings = (_newSettings: Partial<CalendarSettings>) => {},
  onResetAllData = () => {},
  onRestoreData = (_restored) => {},
  activeSettingsTab = 'all',
  onSelectTab = (_tabId: string) => {},
  onOpenWelcome
}) => {
  const [internalTab, setInternalTab] = useState<string>(activeSettingsTab || 'all');
  const [isPlayingAzan, setIsPlayingAzan] = useState<boolean>(false);
  const [selectedReciter, setSelectedReciter] = useState<string>(settings.azanReciter || 'moazenzadeh');
  const [restoreFeedback, setRestoreFeedback] = useState<RestoreResult | null>(null);
  const [isNotifGranted, setIsNotifGranted] = useState<boolean>(true);
  const [downloadNotice, setDownloadNotice] = useState<boolean>(false);
  const { isNativeAndroid, isExactAlarmGranted, openSettings: handleOpenExactAlarmSettings } = useExactAlarmPermission();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hasNotificationPermission().then(granted => {
      setIsNotifGranted(granted);
    }).catch(() => {});
  }, []);

  const currentFont = settings.fontFamily || 'vazir';
  const currentColorTheme: CalendarTheme = settings.colorTheme || 'persianRose';

  useEffect(() => {
    if (settings.azanReciter) {
      setSelectedReciter(settings.azanReciter);
    }
  }, [settings.azanReciter]);

  useEffect(() => {
    if (activeSettingsTab) {
      setInternalTab(activeSettingsTab);
    }
  }, [activeSettingsTab]);

  const handleTabChange = (tabId: string) => {
    setInternalTab(tabId);
    onSelectTab?.(tabId);
  };

  const handleUpdate = (newSettings: Partial<CalendarSettings>) => {
    onUpdateSettings?.(newSettings);
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [backupPassword, setBackupPassword] = useState<string>('');

  const restoreEncryptedBackup = async (content: string) => {
    const decrypted = await decryptBackupContent(content, backupPassword);
    const result = validateAndRestoreBackup(decrypted);
    setRestoreFeedback(result);
    if (result.success && result.restoredData) onRestoreData(result.restoredData);
  };

  // 1. Export Complete Backup (Native Android Filesystem + Web Browser Fallback)
  const handleExportJson = async () => {
    if (isExporting) return;
    if (backupPassword.length < 8) {
      setRestoreFeedback({ success: false, message: 'برای رمزگذاری امن، رمزی با حداقل ۸ نویسه وارد کنید.' });
      return;
    }
    setIsExporting(true);
    try {
      const result = await exportBackupFile(backupPassword);
      setRestoreFeedback({
        success: result.success,
        message: result.message,
        itemCounts: result.itemCounts
      });
    } catch (e: any) {
      console.error('Backup export failed:', e);
      setRestoreFeedback({
        success: false,
        message: `خطا در ایجاد و ذخیره فایل پشتیبان: ${e?.message || 'خطای سیستمی'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Import Backup JSON File
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setRestoreFeedback({
        success: false,
        message: 'حجم فایل پشتیبان نباید بیشتر از ۱۰ مگابایت باشد.'
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await restoreEncryptedBackup(content);
      } catch (err: any) {
        setRestoreFeedback({
          success: false,
          message: `خطا در بازخوانی فایل: ${err?.message || 'قالب نامعتبر'}`
        });
      }
    };
    reader.readAsText(file, 'utf-8');
    // Reset file input so user can pick the same file again if desired
    e.target.value = '';
  };

  // Trigger file selection for Restore (Native Android SAF picker or Web file input)
  const handleImportButtonClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeBackup.readBackupFile();
        if (result.status === 'canceled') {
          return;
        }
        if (result.status === 'success' && result.content) {
          await restoreEncryptedBackup(result.content);
          return;
        }
      } catch (nativeErr) {
        console.warn('[SettingsView] Native file picker error, falling back to input:', nativeErr);
      }
    }
    fileInputRef.current?.click();
  };

  const currentCity = IRANIAN_CITIES.find(c => c.id === (settings.selectedCityId || 'tehran')) || IRANIAN_CITIES[0];
  const qiblaAngle = calculateQiblaAngle(currentCity.lat, currentCity.lng);
  const distanceToMecca = calculateDistanceToMeccaKm(currentCity.lat, currentCity.lng);

  const subTabs = [
    { id: 'all', label: 'همه تنظیمات', icon: SettingsIcon },
    { id: 'themes', label: 'تم و پالت رنگ', icon: Palette },
    { id: 'typography', label: 'قلم و فونت', icon: Type },
    { id: 'azan', label: 'اذان و اعلان‌ها', icon: BellRing },
    { id: 'location', label: 'شهر و قبله', icon: MapPin },
    { id: 'hijri', label: 'تعدیل قمری', icon: Moon },
    { id: 'display', label: 'نمایش تقویم', icon: CalendarIcon },
    { id: 'backup', label: 'پشتیبان‌گیری', icon: ShieldCheck }
  ];

  return (
    <div id="settings-main-container" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Settings Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = internalTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'bg-[#123C35] text-white border-[#0C2E29] shadow-sm'
                  : 'bg-white text-[#59635F] hover:text-[#1C2523] hover:bg-[#F7F4EC] border-[#D9DED9]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#C49A5A]' : 'text-[#59635F]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* App Intro / Welcome Banner */}
      <div className="bg-gradient-to-br from-[#123C35] to-[#1B5E52] text-white rounded-3xl p-5 sm:p-6 border border-[#0C2E29] shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#C49A5A] text-white flex items-center justify-center shadow-md shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>راهنمای جامع و معرفی امکانات برنامه «هوشیار»</span>
            </h3>
            <p className="text-xs text-[#E9E5DA] mt-0.5">
              مشاهده تور معرفی ویژگی‌ها، بخش‌های اصلی و قابلیت‌های آفلاین
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenWelcome?.()}
          className="px-5 py-2.5 rounded-xl bg-[#C49A5A] hover:bg-[#B08644] text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>مشاهده معرفی برنامه</span>
        </button>
      </div>

      {/* Color Themes Presets */}
      {(internalTab === 'all' || internalTab === 'themes') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
              <Palette className="w-5 h-5 text-[#123C35]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1C2523] flex items-center gap-2">
                <span>تم و پالت‌های رنگی اختصاصی</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9E5DA] text-[#123C35] font-bold">زیبا و استاندارد</span>
              </h3>
              <p className="text-xs text-[#59635F]">
                پالت رنگی برنامه را بر اساس سلیقه خود انتخاب کنید
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {Object.values(THEME_PRESETS).map((t) => {
              const isSelected = currentColorTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleUpdate({ colorTheme: t.id })}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'bg-[#F7F4EC] border-[#123C35] ring-2 ring-[#123C35]/20 shadow-sm'
                      : 'bg-white hover:bg-[#F7F4EC] border-[#D9DED9]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#123C35] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm sm:text-base font-bold text-[#1C2523]">{t.name}</span>
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-semibold mb-2 ${
                      isSelected ? 'bg-[#E9E5DA] text-[#123C35]' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.badge}
                    </span>
                    <p className="text-xs text-[#59635F] leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#D9DED9] flex items-center gap-2">
                    <div className="text-[10px] text-[#59635F]">ترکیب رنگ:</div>
                    <div className="flex items-center -space-x-1.5">
                      <span className="w-5 h-5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: t.previewColors.accent }} />
                      <span className="w-5 h-5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: t.previewColors.secondary }} />
                      <span className="w-5 h-5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: t.previewColors.card }} />
                      <span className="w-5 h-5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: t.previewColors.bg }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Font & Typography Selector */}
      {(internalTab === 'all' || internalTab === 'typography') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
              <Type className="w-5 h-5 text-[#123C35]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1C2523] flex items-center gap-2">
                <span>قلم و تایپوگرافی فارسی</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9E5DA] text-[#123C35] font-bold">آفلاین</span>
              </h3>
              <p className="text-xs text-[#59635F]">
                فونت دلخواه خود را برای نمایش کل محیط برنامه انتخاب کنید
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {FONT_OPTIONS.map((f) => {
              const isSelected = currentFont === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleUpdate({ fontFamily: f.id })}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'bg-[#F7F4EC] border-[#123C35] ring-2 ring-[#123C35]/20 shadow-sm'
                      : 'bg-white hover:bg-[#F7F4EC]/60 border-[#D9DED9]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#123C35] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-base font-bold text-[#1C2523] ${f.previewClass}`}>{f.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({f.enName})</span>
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-semibold mb-2 ${
                      isSelected ? 'bg-[#E9E5DA] text-[#123C35]' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {f.tag}
                    </span>
                    <p className="text-xs text-[#59635F] leading-relaxed">
                      {f.description}
                    </p>
                  </div>

                  {/* Real Font Preview Box */}
                  <div className={`mt-3 pt-2.5 border-t border-[#D9DED9] space-y-1.5 bg-white/90 p-2.5 rounded-xl border ${f.previewClass}`}>
                    <div className="flex items-center justify-between text-[10px] text-[#59635F]">
                      <span>پیش‌نمایش واقعی قلم:</span>
                      <span className="font-mono text-emerald-700">{f.sampleDigits}</span>
                    </div>
                    <div className="text-xs font-bold text-[#1C2523] leading-snug">
                      «{f.sampleQuote}»
                    </div>
                    <div className="text-[10.5px] text-[#123C35] bg-[#E9E5DA]/50 px-2 py-0.5 rounded-md font-semibold">
                      {f.sampleUi}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Azan & Notification Settings */}
      {(internalTab === 'all' || internalTab === 'azan') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DED9]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
                <BellRing className="w-5 h-5 text-[#123C35]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[#1C2523]">
                    اذان‌گوی خودکار و اعلان تاریخ روز
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9E5DA] text-[#123C35] font-bold">
                    صوت ماندگار
                  </span>
                </div>
                <p className="text-xs text-[#59635F]">
                  {isNativeAndroid
                    ? 'پخش اذان در وقت شرعی و اعلان روزانه تاریخ در نوار وضعیت گوشی'
                    : 'در مرورگر، اعلان و اذان پس از بسته‌شدن یا پس‌زمینه‌شدن صفحه تضمین نمی‌شود؛ برای اجرای قابل اتکا از نسخه Android استفاده کنید.'}
                </p>
              </div>
            </div>
          </div>

          {/* 1. Daily Notification in Status Bar */}
          <div className="p-4 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white text-[#123C35] border border-[#D9DED9]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-[#1C2523] block">
                    اعلان روزانه تاریخ و اوقات در گوشی
                  </strong>
                  <span className="text-[11px] text-[#59635F]">
                    {isNativeAndroid
                      ? 'نمایش تاریخ شمسی، میلادی، قمری و اوقات در نوار اعلان'
                      : 'در مرورگر فقط هنگام فعال‌بودن صفحه قابل اتکاست'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const nextState = settings.dailyNotificationEnabled === false ? true : false;
                  handleUpdate({ dailyNotificationEnabled: nextState });
                  if (nextState) {
                    requestNotificationPermission();
                  }
                }}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                  settings.dailyNotificationEnabled !== false ? 'bg-[#123C35]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.dailyNotificationEnabled !== false ? 'left-1' : 'right-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D9DED9] flex-wrap gap-2">
              <span className="text-[11px] text-[#59635F]">
                وضعیت مجوز اعلان: <strong>{isNotifGranted ? 'فعال است ✅' : 'نیاز به تأیید مجوز'}</strong>
              </span>
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setIsNotifGranted(granted);
                  const today = getTodayJalali();
                  const todayInfo = getFullDateInfo(today.jy, today.jm, today.jd, settings.hijriAdjustment);
                  showDailyDateNotification(todayInfo);
                }}
                className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-[#123C35] hover:bg-[#0C2E29] text-white transition-colors cursor-pointer shadow-xs"
              >
                ارسال تست اعلان به گوشی
              </button>
            </div>
          </div>

          {/* 2. Auto Azan on Prayer Times */}
          <div className="p-4 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] space-y-4">
            {isNativeAndroid && !isExactAlarmGranted && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <strong className="font-bold flex items-center gap-1.5 text-amber-900">
                      <span>⚠️</span>
                      <span>مجوز هشدارهای دقیق (Exact Alarm) غیرفعال است</span>
                    </strong>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">
                      در اندروید ۱۲ به بالا، برای پخش دقیق و سر وقت صوت اذان در پس‌زمینه و هنگام قفل بودن صفحه، لازم است مجوز «تنظیم هشدارها و یادآوری‌ها» (Schedule Exact Alarms) در بخش تنظیمات گوشی فعال باشد.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenExactAlarmSettings}
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shrink-0 cursor-pointer text-xs shadow-xs transition-colors"
                  >
                    تنظیمات مجوز در گوشی
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white text-[#123C35] border border-[#D9DED9]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs sm:text-sm font-bold text-[#1C2523]">
                      پخش خودکار اذان در اوقات شرعی
                    </strong>
                    {settings.autoAzanEnabled !== false && (
                      isNativeAndroid ? (
                        isExactAlarmGranted ? (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                            زمان‌بندی دقیق: فعال و مجاز
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md font-semibold">
                            زمان‌بندی غیردقیق (نیازمند مجوز)
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                          پخش تحت وب / مرورگر
                        </span>
                      )
                    )}
                  </div>
                  <span className="text-[11px] text-[#59635F] block mt-0.5">
                    پخش خودکار صوت اذان هنگام فرارسیدن وقت شرعی
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const nextState = settings.autoAzanEnabled === false ? true : false;
                  handleUpdate({ autoAzanEnabled: nextState });
                }}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoAzanEnabled !== false ? 'bg-[#123C35]' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.autoAzanEnabled !== false ? 'left-1' : 'right-1'
                }`} />
              </button>
            </div>

            {/* Per-Prayer Specific Toggles */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleUpdate({ azanAlarmFajr: settings.azanAlarmFajr === false ? true : false })}
                className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  settings.azanAlarmFajr !== false
                    ? 'bg-[#E9E5DA] border-[#123C35] text-[#123C35]'
                    : 'bg-white border-[#D9DED9] text-slate-400'
                }`}
              >
                <Bell className="w-4 h-4 text-[#123C35]" />
                <span>اذان صبح</span>
                <span className="text-[10px] opacity-75">{settings.azanAlarmFajr !== false ? 'فعال' : 'غیرفعال'}</span>
              </button>

              <button
                onClick={() => handleUpdate({ azanAlarmDhuhr: settings.azanAlarmDhuhr === false ? true : false })}
                className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  settings.azanAlarmDhuhr !== false
                    ? 'bg-[#E9E5DA] border-[#123C35] text-[#123C35]'
                    : 'bg-white border-[#D9DED9] text-slate-400'
                }`}
              >
                <Bell className="w-4 h-4 text-[#123C35]" />
                <span>اذان ظهر</span>
                <span className="text-[10px] opacity-75">{settings.azanAlarmDhuhr !== false ? 'فعال' : 'غیرفعال'}</span>
              </button>

              <button
                onClick={() => handleUpdate({ azanAlarmMaghrib: settings.azanAlarmMaghrib === false ? true : false })}
                className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  settings.azanAlarmMaghrib !== false
                    ? 'bg-[#E9E5DA] border-[#123C35] text-[#123C35]'
                    : 'bg-white border-[#D9DED9] text-slate-400'
                }`}
              >
                <Bell className="w-4 h-4 text-[#123C35]" />
                <span>اذان مغرب</span>
                <span className="text-[10px] opacity-75">{settings.azanAlarmMaghrib !== false ? 'فعال' : 'غیرفعال'}</span>
              </button>
            </div>
          </div>

          {/* 3. Offline Cache Status */}
          <div className="p-4 rounded-2xl bg-[#E9E5DA] border border-[#D9DED9] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#123C35] text-white shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-[#1C2523] block">
                    ذخیره دائمی صوت مؤذنان در حافظه (آفلاین کامل)
                  </strong>
                  <span className="text-[11px] text-[#59635F]">
                    صوت اذان در حافظه دستگاه ذخیره می‌شود تا کاملاً بدون اینترنت پخش شود
                  </span>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await cacheAllAzans();
                    setDownloadNotice(true);
                    setTimeout(() => setDownloadNotice(false), 4000);
                  } catch (e) {
                    // ignore
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#123C35] hover:bg-[#0C2E29] text-white font-bold text-xs transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#C49A5A]" />
                <span>دانلود آفلاین اذان‌ها</span>
              </button>
            </div>
            {downloadNotice && (
              <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>صوت‌های ماندگار اذان با موفقیت در حافظه آفلاین ذخیره شدند.</span>
              </div>
            )}
          </div>

          {/* 4. Reciter Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C2523] flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#123C35]" />
                <span>انتخاب مؤذن پیش‌فرض اذان‌گو:</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AZAN_RECITERS.map((r) => {
                const isSelected = (settings.azanReciter || 'moazenzadeh') === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      handleUpdate({ azanReciter: r.id });
                      setSelectedReciter(r.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#F7F4EC] border-[#123C35] ring-2 ring-[#123C35]/20 text-[#1C2523] shadow-xs'
                        : 'bg-white hover:bg-[#F7F4EC] border-[#D9DED9] text-[#59635F]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1C2523]">{r.name}</span>
                          {r.famous && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#E9E5DA] text-[#123C35] font-bold">
                              ماندگار
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#123C35] font-semibold">{r.title}</div>
                        <div className="text-[10px] text-[#59635F] line-clamp-2">{r.desc}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPlayingAzan && selectedReciter === r.id) {
                            azanAudioEngine.stop();
                            setIsPlayingAzan(false);
                          } else {
                            handleUpdate({ azanReciter: r.id });
                            setSelectedReciter(r.id);
                            azanAudioEngine.play(r.id, 0.85);
                            setIsPlayingAzan(true);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
                          isPlayingAzan && selectedReciter === r.id
                            ? 'bg-rose-600 text-white shadow-xs'
                            : isSelected
                              ? 'bg-[#123C35] text-white'
                              : 'bg-white hover:bg-[#F7F4EC] text-[#1C2523] border border-[#D9DED9]'
                        }`}
                        title={isPlayingAzan && selectedReciter === r.id ? 'توقف' : 'پخش تست'}
                      >
                        {isPlayingAzan && selectedReciter === r.id ? (
                          <Square className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* City / Prayer Times Setting */}
      {(internalTab === 'all' || internalTab === 'location') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
              <MapPin className="w-5 h-5 text-[#123C35]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1C2523]">شهر و موقعیت جغرافیایی برای اوقات شرعی</h3>
              <p className="text-xs text-[#59635F]">
                محاسبه دقیق اذان صبح، طلوع، ظهر، غروب و مغرب بر اساس مختصات شهر
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
            {IRANIAN_CITIES.map((city) => {
              const isSelected = (settings.selectedCityId || 'tehran') === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => handleUpdate({ selectedCityId: city.id })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#123C35] border-[#0C2E29] text-white font-bold shadow-sm'
                      : 'bg-white hover:bg-[#F7F4EC] border-[#D9DED9] text-[#1C2523] text-xs font-semibold'
                  }`}
                >
                  <div className="text-xs sm:text-sm">{city.name}</div>
                  <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-[#E9E5DA]' : 'text-[#59635F]'}`}>
                    {city.province}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-[#D9DED9] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#123C35]" />
                <span className="text-xs font-bold text-[#1C2523]">
                  مشخصات قبله برای {currentCity.name}:
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-[#E9E5DA] text-[#123C35] font-bold px-3 py-1 rounded-xl border border-[#D9DED9]">
                  زاویه قبله: {toPersianDigits(qiblaAngle)}°
                </span>
                <span className="bg-[#F7F4EC] text-[#59635F] font-bold px-3 py-1 rounded-xl border border-[#D9DED9]">
                  فاصله مستقیم: {toPersianDigits(distanceToMecca.toLocaleString())} کیلومتر
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hijri Adjustment */}
      {(internalTab === 'all' || internalTab === 'hijri') && (() => {
        const today = getTodayJalali();
        const currentAdj = Number(settings.hijriAdjustment) || 0;
        const adjustedInfo = getFullDateInfo(today.jy, today.jm, today.jd, currentAdj);
        const standardInfo = getFullDateInfo(today.jy, today.jm, today.jd, 0);

        return (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
                  <Moon className="w-5 h-5 text-[#123C35]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1C2523] flex items-center gap-2">
                    <span>تعدیل تاریخ هجری قمری (رویت هلال ماه)</span>
                    {currentAdj !== 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        تعدیل فعال ({currentAdj > 0 ? `+${toPersianDigits(currentAdj)}` : toPersianDigits(currentAdj)} روز)
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9E5DA] text-[#123C35] font-bold">
                        معیار رسمی
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#59635F]">
                    هماهنگ‌سازی تقویم قمری بر اساس اعلام رویت هلال ماه توسط مراجع
                  </p>
                </div>
              </div>

              {currentAdj !== 0 && (
                <button
                  onClick={() => handleUpdate({ hijriAdjustment: 0 })}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی به پیش‌فرض (۰ روز)</span>
                </button>
              )}
            </div>

            {/* Live Today Hijri Date Status Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-l from-[#123C35]/10 to-[#E9E5DA]/40 border border-[#123C35]/20 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[11px] text-[#59635F] block mb-0.5">تاریخ هجری قمری امروز با تنظیمات انتخابی:</span>
                <span className="text-base sm:text-lg font-black text-[#123C35]">
                  {toPersianDigits(adjustedInfo.hijri.hd)} {HIJRI_MONTH_NAMES[adjustedInfo.hijri.hm - 1]} {toPersianDigits(adjustedInfo.hijri.hy)} هجری قمری
                </span>
              </div>
              <div className="text-left text-xs text-[#59635F] bg-white/80 px-3 py-1.5 rounded-xl border border-[#D9DED9]">
                <span>تقویم معیار نجومی: </span>
                <strong className="text-[#1C2523]">
                  {toPersianDigits(standardInfo.hijri.hd)} {HIJRI_MONTH_NAMES[standardInfo.hijri.hm - 1]}
                </strong>
              </div>
            </div>

            {/* Preset Adjustments Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#1C2523] block">انتخاب میزان جابه‌جایی روز قمری:</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { val: -2, label: '۲ روز عقب‌تر', desc: '-۲ روز' },
                  { val: -1, label: '۱ روز عقب‌تر', desc: '-۱ روز' },
                  { val: 0, label: 'بدون تغییر', desc: 'پیش‌فرض' },
                  { val: 1, label: '۱ روز جلوتر', desc: '+۱ روز' },
                  { val: 2, label: '۲ روز جلوتر', desc: '+۲ روز' }
                ].map((item) => {
                  const isSelected = currentAdj === item.val;
                  return (
                    <button
                      key={item.val}
                      onClick={() => handleUpdate({ hijriAdjustment: item.val })}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-[#123C35] border-[#0C2E29] text-white font-bold shadow-sm ring-2 ring-[#123C35]/20'
                          : 'bg-white hover:bg-[#F7F4EC] border-[#D9DED9] text-[#1C2523]'
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{item.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-[#E9E5DA]' : 'text-[#59635F]'}`}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanatory Help Box */}
            <div className="p-3 rounded-xl bg-[#F7F4EC] border border-[#D9DED9] text-[11px] text-[#59635F] leading-relaxed flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <strong>راهنمای کاربردی:</strong> اگر اول ماه قمری (مثلاً ماه رمضان یا شوال) یک روز زودتر اعلام شد، گزینه <strong>«۱ روز جلوتر»</strong> و چنانچه اول ماه یک روز دیرتر از تقویم رسمی اعلام شد، گزینه <strong>«۱ روز عقب‌تر»</strong> را انتخاب نمایید. این تغییر بلافاصله در تمام بخش‌های تقویم، مناسبت‌های مذهبی و تبدیل تاریخ اعمال خواهد شد.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Display Options */}
      {(internalTab === 'all' || internalTab === 'display') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
              <CalendarIcon className="w-5 h-5 text-[#123C35]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1C2523]">گزینه‌های نمایش تقویم</h3>
              <p className="text-xs text-[#59635F]">شخصی‌سازی جزئیات در خانه‌های تقویم ماهانه</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {/* Gregorian Date in Cells Toggle */}
            <div 
              onClick={() => {
                const nextState = !(settings.showGregorianInCells !== false);
                handleUpdate({ showGregorianInCells: nextState });
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] cursor-pointer hover:bg-[#E9E5DA] transition-colors"
              data-testid="toggle-gregorian-calendar"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#1C2523] block">نمایش روزهای میلادی در خانه‌های تقویم</span>
                <p className="text-[11px] text-[#59635F]">شماره روز میلادی در گوشه خانه‌های تقویم درج شود</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !(settings.showGregorianInCells !== false);
                  handleUpdate({ showGregorianInCells: nextState });
                }}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.showGregorianInCells !== false ? 'bg-[#123C35]' : 'bg-slate-300'
                }`}
                aria-label="تغییر وضعیت نمایش تاریخ میلادی در تقویم"
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.showGregorianInCells !== false ? 'left-1' : 'right-1'
                }`} />
              </button>
            </div>

            {/* Hijri Date in Cells Toggle */}
            <div 
              onClick={() => {
                const nextState = !(settings.showHijriInCells !== false);
                handleUpdate({ showHijriInCells: nextState });
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] cursor-pointer hover:bg-[#E9E5DA] transition-colors"
              data-testid="toggle-hijri-calendar"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#1C2523] block">نمایش روزهای قمری در خانه‌های تقویم</span>
                <p className="text-[11px] text-[#59635F]">شماره روز قمری در گوشه خانه‌های تقویم درج شود</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !(settings.showHijriInCells !== false);
                  handleUpdate({ showHijriInCells: nextState });
                }}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.showHijriInCells !== false ? 'bg-[#123C35]' : 'bg-slate-300'
                }`}
                aria-label="تغییر وضعیت نمایش تاریخ قمری در تقویم"
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.showHijriInCells !== false ? 'left-1' : 'right-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Restore Section */}
      {(internalTab === 'all' || internalTab === 'backup') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D9DED9] shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9E5DA] text-[#123C35]">
              <ShieldCheck className="w-5 h-5 text-[#123C35]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1C2523]">تهیه و بازیابی نسخه پشتیبان (Backup & Restore)</h3>
              <p className="text-xs text-[#59635F]">
                ذخیره کامل یادداشت‌ها، کارها، هزینه‌ها، مطالبات و تنظیمات در قالب فایل JSON استاندارد
              </p>
            </div>
          </div>

          {/* Feedback message if any */}
          {restoreFeedback && (
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
              restoreFeedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <FileCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <strong className="block text-sm font-bold mb-1">{restoreFeedback.message}</strong>
                {restoreFeedback.itemCounts && (
                  <div className="text-[11px] space-y-0.5 opacity-90">
                    <div>تعداد یادداشت‌ها: {toPersianDigits(restoreFeedback.itemCounts.notes)}</div>
                    <div>تعداد کارها و وظایف: {toPersianDigits(restoreFeedback.itemCounts.tasks)}</div>
                    <div>تعداد یادآورها: {toPersianDigits(restoreFeedback.itemCounts.reminders)}</div>
                    <div>تعداد تراکنش‌های مالی: {toPersianDigits(restoreFeedback.itemCounts.expenses)}</div>
                    <div>تعداد پرونده‌های بدهی/طلب: {toPersianDigits(restoreFeedback.itemCounts.debts)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <label className="w-full space-y-1.5">
              <span className="block text-xs font-bold text-[#1C2523]">رمز فایل پشتیبان</span>
              <input
                type="password"
                value={backupPassword}
                onChange={(event) => setBackupPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="حداقل ۸ نویسه، این رمز را گم نکنید"
                className="w-full max-w-md px-4 py-3 rounded-2xl bg-[#F7F4EC] border border-[#D9DED9] text-sm outline-none focus:ring-2 focus:ring-[#123C35]"
              />
              <span className="block text-[11px] text-[#59635F]">
                فایل با AES-256-GCM رمز می‌شود. بدون این رمز، بازیابی ممکن نیست.
              </span>
            </label>
            {/* Export Button */}
            <button
              onClick={handleExportJson}
              disabled={isExporting}
              className={`px-5 py-3 rounded-2xl bg-[#123C35] hover:bg-[#0C2E29] text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-98 ${
                isExporting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Download className="w-4 h-4 text-[#C49A5A]" />
              <span>{isExporting ? 'در حال ذخیره‌سازی...' : 'دانلود فایل پشتیبان (Export)'}</span>
            </button>

            {/* Import Button & Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              accept=".json,application/json"
              className="hidden"
            />

            <button
              onClick={handleImportButtonClick}
              className="px-5 py-3 rounded-2xl bg-white hover:bg-[#F7F4EC] text-[#123C35] border-2 border-[#123C35] text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs active:scale-98"
            >
              <Upload className="w-4 h-4 text-[#123C35]" />
              <span>بازیابی از فایل (Import Backup)</span>
            </button>
          </div>
        </div>
      )}

      {/* Developer & App Info */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9DED9] text-center space-y-3 mt-4 shadow-card">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-md mb-1 border border-[#D9DED9] bg-[#0C2E29]">
          <img src="/icon.png" alt={APP_NAME} className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className="font-extrabold text-[#1C2523] text-lg sm:text-xl">{APP_NAME}</h4>
          <p className="text-xs sm:text-sm font-medium text-[#59635F] mt-0.5">{APP_TAGLINE}</p>
        </div>
        <p className="text-xs text-[#59635F] leading-relaxed max-w-md mx-auto">
          {APP_DESCRIPTION}
        </p>

        {onOpenWelcome && (
          <div className="pt-1">
            <button
              onClick={onOpenWelcome}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F7F4EC] hover:bg-[#E9E5DA] text-[#123C35] border border-[#D9DED9] text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C49A5A]" />
              <span>معرفی هوشیار (راهنمای شروع)</span>
            </button>
          </div>
        )}

        <div className="pt-3 mt-2 border-t border-[#D9DED9] flex flex-col items-center justify-center gap-1.5 text-xs text-[#1C2523]">
          <span className="text-[11px] text-[#59635F]">طراحی و توسعه توسط</span>
          <span className="font-bold text-[#123C35] bg-[#F7F4EC] px-4 py-1.5 rounded-xl border border-[#D9DED9] text-xs sm:text-sm">
            {APP_AUTHOR}
          </span>
          <a
            href={`mailto:${APP_EMAIL}`}
            className="text-xs text-[#123C35] underline underline-offset-2 hover:text-[#0C2E29]"
          >
            تماس با سازنده: {APP_EMAIL}
          </a>
          <span className="text-[11px] text-[#838E8A] mt-1">نسخه {toPersianDigits(APP_VERSION)} • © {toPersianDigits(APP_YEAR)}</span>
        </div>
      </div>
    </div>
  );
};
