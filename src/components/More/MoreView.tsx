import React from 'react';
import { 
  Compass, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ArrowLeftRight, 
  Cake, 
  Search, 
  Share2, 
  FileText, 
  Bell, 
  Settings as SettingsIcon, 
  Info, 
  ArrowLeft,
  Calendar as CalendarIcon,
  ShieldCheck,
  Flame,
  Scale
} from 'lucide-react';
import { AppTab, FullDateInfo } from '../../types/calendar';
import { APP_EMAIL } from '../../constants/appInfo';

interface MoreViewProps {
  onNavigateTab: (tab: AppTab) => void;
  onOpenAzanModal: () => void;
  onOpenQiblaModal: () => void;
  onOpenBooksModal: () => void;
  onOpenAgeCalcModal: () => void;
  onOpenDailyCardModal: () => void;
  onOpenSearchModal: () => void;
  onOpenWelcomeModal: () => void;
  todayInfo: FullDateInfo;
  selectedCityName: string;
}

export const MoreView: React.FC<MoreViewProps> = ({
  onNavigateTab,
  onOpenAzanModal,
  onOpenQiblaModal,
  onOpenBooksModal,
  onOpenAgeCalcModal,
  onOpenDailyCardModal,
  onOpenSearchModal,
  onOpenWelcomeModal,
  todayInfo,
  selectedCityName
}) => {
  return (
    <div id="more-view-container" className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-[#0C2E29] via-[#123C35] to-[#1B5E52] text-white rounded-3xl p-6 sm:p-7 border border-[#0C2E29] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-60 h-60 bg-[#C49A5A]/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-bold text-[#E9E5DA] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C49A5A]" />
              <span>مرکز خدمات و امکانات جامع «هوشیار»</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ابزارها و امکانات تکمیلی
            </h2>
            <p className="text-xs text-[#E9E5DA]/80 mt-1 max-w-lg leading-relaxed">
              دسترسی سریع و یکپارچه به قبله‌نما، تبدیل تاریخ، محاسبه سن، یادداشت‌ها و تنظیمات.
            </p>
          </div>

          <button
            onClick={onOpenSearchModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-inner"
          >
            <Search className="w-4 h-4 text-[#C49A5A]" />
            <span>جستجوی سراسری</span>
          </button>
        </div>
      </div>

      {/* Section 1: اذان و عبادت */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
          <Clock className="w-4 h-4 text-[#123C35]" />
          <span>اذان، اوقات شرعی و عبادت</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Azan Modal */}
          <div
            onClick={onOpenAzanModal}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#123C35] text-[#C49A5A] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>اوقات شرعی و اذان‌گو</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    افق {selectedCityName}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">پخش صوت استاد مؤذن‌زاده و صبحدل، جدول ماهانه</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </div>

          {/* Qibla Modal */}
          <div
            onClick={onOpenQiblaModal}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#123C35] text-[#C49A5A] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>قبله‌نما و قطب‌نما</span>
                  <span className="text-[10px] bg-[#E9E5DA] text-[#123C35] px-2 py-0.5 rounded-full font-bold">دقیق</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">محاسبه دقیق زاویه قبله، سنسور قطب‌نما و چرخش دستی</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Section 2: ابزارها و محاسبات کاربردی */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
          <ArrowLeftRight className="w-4 h-4 text-[#123C35]" />
          <span>ابزارهای تقویم و محاسبات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Date Converter */}
          <div
            onClick={() => onNavigateTab('converter')}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer group shadow-xs space-y-2"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#123C35] flex items-center justify-center group-hover:bg-[#123C35] group-hover:text-white transition-colors">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">تبدیل تاریخ هوشمند</h4>
              <p className="text-[11px] text-slate-500">شمسی، میلادی و قمری</p>
            </div>
          </div>

          {/* Age Calculator */}
          <div
            onClick={onOpenAgeCalcModal}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer group shadow-xs space-y-2"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#123C35] flex items-center justify-center group-hover:bg-[#123C35] group-hover:text-white transition-colors">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">محاسبه سن دقیق</h4>
              <p className="text-[11px] text-slate-500">روزهای زیسته و سال‌شمار</p>
            </div>
          </div>

          {/* Occasion Search */}
          <div
            onClick={onOpenSearchModal}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer group shadow-xs space-y-2"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#123C35] flex items-center justify-center group-hover:bg-[#123C35] group-hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">جستجوی مناسبت‌ها</h4>
              <p className="text-[11px] text-slate-500">تعطیلات و رویدادهای ملی</p>
            </div>
          </div>

          {/* Daily Card */}
          <div
            onClick={onOpenDailyCardModal}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer group shadow-xs space-y-2"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#123C35] flex items-center justify-center group-hover:bg-[#123C35] group-hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">کارت استوری روز</h4>
              <p className="text-[11px] text-slate-500">اشتراک‌گذاری گرافیکی</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: مدیریت و اطلاعات */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
          <SettingsIcon className="w-4 h-4 text-[#123C35]" />
          <span>مدیریت، یادداشت‌ها و تنظیمات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Notes */}
          <div
            onClick={() => onNavigateTab('notes')}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">یادداشت‌ها</h4>
                <p className="text-[11px] text-slate-500">ثبت خاطرات و یادداشت</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </div>

          {/* Reminders */}
          <div
            onClick={() => onNavigateTab('reminders')}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">یادآورها</h4>
                <p className="text-[11px] text-slate-500">تولد، چک و اقساط</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </div>

          {/* Settings */}
          <div
            onClick={() => onNavigateTab('settings')}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">تنظیمات</h4>
                <p className="text-[11px] text-slate-500">تم، فونت، شهر و فایل</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </div>

          {/* Welcome Info */}
          <div
            onClick={onOpenWelcomeModal}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">راهنمای برنامه</h4>
                <p className="text-[11px] text-slate-500">معرفی قابلیت‌های هوشیار</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </div>

          {/* Contact Creator */}
          <a
            href={`mailto:${APP_EMAIL}?subject=${encodeURIComponent('تماس با سازنده هوشیار')}`}
            className="p-4 rounded-2xl bg-white hover:bg-[#F7F4EC] border border-[#D9DED9] hover:border-[#123C35] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">تماس با سازنده</h4>
                <p className="text-[11px] text-slate-500">ارسال پیشنهاد، گزارش خطا یا پیام</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
};
