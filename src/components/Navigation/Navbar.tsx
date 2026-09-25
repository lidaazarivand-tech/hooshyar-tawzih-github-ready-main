import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Home, 
  BookOpen,
  CheckSquare, 
  CreditCard, 
  Grid, 
  Search, 
  Compass, 
  ArrowRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { AppTab, FullDateInfo } from '../../types/calendar';
import { toPersianDigits } from '../../utils/persianNumber';

interface NavbarProps {
  currentTab?: AppTab;
  activeTab?: AppTab;
  isBooksOpen?: boolean;
  onSelectTab?: (tab: AppTab) => void;
  onTabChange?: (tab: AppTab) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  todayInfo: FullDateInfo;
  onOpenSearch?: () => void;
  onOpenGoToDate?: () => void;
  onOpenQuickAdd?: () => void;
  onOpenWelcome?: () => void;
}

const PRIMARY_TABS: { tab: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tab: 'home', label: 'خانه', icon: Home },
  { tab: 'calendar', label: 'تقویم', icon: CalendarIcon },
  { tab: 'library', label: 'کتابخانه', icon: BookOpen },
  { tab: 'tasks', label: 'کارها', icon: CheckSquare },
  { tab: 'finance', label: 'مالی', icon: CreditCard },
  { tab: 'more', label: 'بیشتر', icon: Grid },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  activeTab,
  isBooksOpen = false,
  onSelectTab,
  onTabChange,
  onGoBack,
  canGoBack = false,
  todayInfo,
  onOpenSearch = () => {},
  onOpenGoToDate = () => {},
  onOpenQuickAdd = () => {},
  onOpenWelcome
}) => {
  const active = activeTab || currentTab || 'home';

  const handleTabSelect = (tab: AppTab) => {
    onSelectTab?.(tab);
    onTabChange?.(tab);
  };

  return (
    <>
      {/* Top Header */}
      <header 
        id="app-top-header" 
        className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#D9DED9] shadow-[0_2px_8px_-2px_rgba(18,60,53,0.06)]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between">
          
          {/* Brand or Mobile Back Button */}
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <button
                id="btn-mobile-header-back"
                onClick={onGoBack}
                aria-label="بازگشت به صفحه قبلی"
                className="p-2 rounded-xl bg-[#E9E5DA] hover:bg-[#D9DED9] text-[#123C35] flex items-center gap-1.5 transition-all cursor-pointer font-bold text-xs border border-[#D9DED9] shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]"
                title="بازگشت"
              >
                <ArrowRight className="w-4 h-4 text-[#123C35]" />
                <span className="text-xs">بازگشت</span>
              </button>
            ) : (
              <button 
                id="btn-brand-home"
                onClick={() => handleTabSelect('home')}
                className="flex text-right group cursor-pointer items-center gap-2.5 transition-all hover:opacity-90"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#1B5E52] to-[#123C35] flex items-center justify-center text-white shadow-[0_2px_6px_rgba(18,60,53,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#0C2E29]">
                  <Sparkles className="w-4 h-4 text-[#C49A5A]" />
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-sm sm:text-base font-black text-[#1C2523] tracking-tight leading-tight">
                    هوشیار
                  </span>
                  <span className="text-[10px] text-[#59635F] font-semibold hidden sm:inline">
                    دستیار و تقویم روزانه
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Today Date Pill in Header (Desktop / Tablet) */}
          <div className="hidden sm:flex items-center gap-2 bg-[#F7F4EC] hover:bg-[#E9E5DA] transition-colors px-3.5 py-1.5 rounded-full border border-[#D9DED9] text-xs text-[#1C2523] font-medium shadow-[inset_0_1px_2px_rgba(18,60,53,0.03)]">
            <span className="w-2 h-2 rounded-full bg-[#123C35]"></span>
            <span className="font-bold">{todayInfo.dayOfWeekName}</span>
            <span className="text-[#D9DED9]">|</span>
            <span>
              {toPersianDigits(todayInfo.jalali.jd)} {todayInfo.seasonName}
            </span>
            {todayInfo.isHoliday && (
              <span className="bg-rose-600/10 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                تعطیل
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="btn-quick-search"
              onClick={onOpenSearch}
              title="جستجوی همه‌جانبه"
              className="p-2 rounded-xl text-[#1C2523] hover:bg-[#E9E5DA] bg-[#F7F4EC] transition-all flex items-center gap-1.5 text-xs font-medium border border-[#D9DED9] cursor-pointer min-w-[36px] min-h-[36px] justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.7)]"
            >
              <Search className="w-4 h-4 text-[#123C35]" />
              <span className="hidden md:inline text-xs font-bold">جستجو</span>
            </button>

            <button
              id="btn-quick-add"
              onClick={onOpenQuickAdd}
              title="ثبت سریع"
              className="p-2 rounded-xl bg-[#123C35] text-white hover:bg-[#0C2E29] transition-all flex items-center gap-1.5 text-xs font-bold border border-[#0C2E29] shadow-[0_2px_6px_rgba(18,60,53,0.22),inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer min-w-[36px] min-h-[36px] justify-center"
            >
              <Plus className="w-4 h-4 text-[#C49A5A]" />
              <span className="hidden sm:inline text-xs">ثبت جدید</span>
            </button>

            <button
              id="btn-quick-goto"
              onClick={onOpenGoToDate}
              title="برو به تاریخ"
              className="p-2 rounded-xl text-[#1C2523] hover:bg-[#E9E5DA] bg-[#F7F4EC] transition-all text-xs font-semibold border border-[#D9DED9] cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.7)]"
            >
              <Compass className="w-4 h-4 text-[#59635F]" />
            </button>

            {onOpenWelcome && (
              <button
                id="btn-open-welcome"
                onClick={onOpenWelcome}
                title="معرفی برنامه هوشیار"
                className="p-2 rounded-xl text-[#123C35] bg-[#E9E5DA] hover:bg-[#D9DED9] transition-all border border-[#D9DED9] text-xs font-medium cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]"
              >
                <Sparkles className="w-4 h-4 text-[#C49A5A]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Navigation Bar (5 Primary Tabs) */}
      <nav id="desktop-main-navigation" className="hidden lg:block bg-[#FFFFFF] border-b border-[#D9DED9] sticky top-14 sm:top-16 z-25 shadow-[0_1px_3px_rgba(18,60,53,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-start gap-2 py-2 overflow-x-auto no-scrollbar">
            {PRIMARY_TABS.map((item) => {
              const Icon = item.icon;
              const isActive = (item.tab === 'library' && isBooksOpen) ||
                (!isBooksOpen && active === item.tab) ||
                (!isBooksOpen && item.tab === 'more' && ['converter', 'notes', 'reminders', 'settings'].includes(active));
              return (
                <button
                  id={`nav-item-${item.tab}`}
                  key={item.tab}
                  onClick={() => handleTabSelect(item.tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-b from-[#1B5E52] to-[#123C35] text-white shadow-[0_3px_8px_rgba(18,60,53,0.22),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#0C2E29]'
                      : 'text-[#59635F] hover:text-[#1C2523] hover:bg-[#F7F4EC]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C49A5A]' : 'text-[#59635F]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Fixed 6-Item Single Row Navigation Bar */}
      <nav 
        id="mobile-bottom-navigation" 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/98 backdrop-blur-xl border-t border-[#D9DED9] shadow-[0_-4px_18px_rgba(18,60,53,0.07)] px-1 sm:px-2 pt-1"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      >
        <div className="grid grid-cols-6 items-center w-full max-w-lg mx-auto">
          {PRIMARY_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = (item.tab === 'library' && isBooksOpen) ||
              (!isBooksOpen && active === item.tab) ||
              (!isBooksOpen && item.tab === 'more' && ['converter', 'notes', 'reminders', 'settings'].includes(active));
            return (
              <button
                id={`mobile-nav-${item.tab}`}
                key={item.tab}
                onClick={() => handleTabSelect(item.tab)}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer min-h-[46px] w-full ${
                  isActive ? 'text-[#123C35] font-bold' : 'text-[#59635F] hover:text-[#1C2523]'
                }`}
              >
                <div className={`p-1 sm:p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-gradient-to-b from-[#1B5E52] to-[#123C35] text-[#C49A5A] shadow-[0_2px_6px_rgba(18,60,53,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#0C2E29] scale-105' 
                    : 'bg-transparent text-[#59635F]'
                }`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-0.5 whitespace-nowrap leading-none truncate max-w-full text-center ${isActive ? 'font-bold text-[#123C35]' : 'text-[#59635F]'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
