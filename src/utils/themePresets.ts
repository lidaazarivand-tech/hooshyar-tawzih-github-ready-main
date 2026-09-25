import { CalendarTheme } from '../types/calendar';

export interface ThemeConfig {
  id: CalendarTheme;
  name: string;
  enName: string;
  badge: string;
  description: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    secondary: string;
  };
  appBg: string;
  appText: string;
  cardBg: string;
  cardBorder: string;
  primaryBg: string;
  primaryHover: string;
  primaryText: string;
  primaryShadow: string;
  accentBadge: string;
  heroGradient: string;
  heroText: string;
  activeNavTab: string;
  headerBg: string;
}

export const THEME_PRESETS: Record<CalendarTheme, ThemeConfig> = {
  persianRose: {
    id: 'persianRose',
    name: 'یشمی و زرین هوشیار (اصلی)',
    enName: 'Hooshyar Emerald & Gold',
    badge: 'طراحی رسمی و اصیل',
    description: 'ترکیب سبز یشمی تیره (#123C35)، طلایی مات (#C49A5A) و زمینه گرم و آرام',
    previewColors: {
      bg: '#F7F4EC',
      card: '#FFFFFF',
      accent: '#C49A5A',
      secondary: '#123C35'
    },
    appBg: 'bg-[#F7F4EC]',
    appText: 'text-[#1C2523]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#D9DED9]',
    primaryBg: 'bg-[#123C35]',
    primaryHover: 'hover:bg-[#0C2E29]',
    primaryText: 'text-[#123C35]',
    primaryShadow: 'shadow-[0_4px_12px_rgba(18,60,53,0.15)]',
    accentBadge: 'bg-[#E9E5DA] text-[#123C35] border-[#D9DED9]',
    heroGradient: 'bg-gradient-to-br from-[#0C2E29] via-[#123C35] to-[#1B5E52]',
    heroText: 'text-white',
    activeNavTab: 'bg-[#123C35] text-white shadow-md',
    headerBg: 'bg-white/95'
  },
  turquoiseIsfahan: {
    id: 'turquoiseIsfahan',
    name: 'فیروزه‌ای و لاجوردی اصفهان',
    enName: 'Isfahan Turquoise',
    badge: 'کاشی‌کاری نقش جهان',
    description: 'الهام از کاشی‌کاری‌های مسجد شیخ لطف‌الله و میدان نقش‌جهان اصفهان',
    previewColors: {
      bg: '#F0F9FF',
      card: '#FFFFFF',
      accent: '#0284C7',
      secondary: '#0F766E'
    },
    appBg: 'bg-[#F0F7FA]',
    appText: 'text-[#132A38]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#CCE3ED]',
    primaryBg: 'bg-[#0E7490]',
    primaryHover: 'hover:bg-[#155E75]',
    primaryText: 'text-[#0E7490]',
    primaryShadow: 'shadow-[0_4px_12px_rgba(14,116,144,0.15)]',
    accentBadge: 'bg-[#E0F2FE] text-[#0E7490] border-[#BAE6FD]',
    heroGradient: 'bg-gradient-to-br from-[#164E63] via-[#0E7490] to-[#0891B2]',
    heroText: 'text-white',
    activeNavTab: 'bg-[#0E7490] text-white shadow-md',
    headerBg: 'bg-white/95'
  },
  desertNight: {
    id: 'desertNight',
    name: 'سرمه‌ای شب کویر یزد',
    enName: 'Yazd Desert Night',
    badge: 'آرام و کلاسیک',
    description: 'سرمه‌ای عمیق، بادگیرهای یزد و آسمان صاف کویر مرکزی ایران',
    previewColors: {
      bg: '#F4F5F9',
      card: '#FFFFFF',
      accent: '#3B82F6',
      secondary: '#1E293B'
    },
    appBg: 'bg-[#F4F5F9]',
    appText: 'text-[#0F172A]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#CBD5E1]',
    primaryBg: 'bg-[#1E293B]',
    primaryHover: 'hover:bg-[#0F172A]',
    primaryText: 'text-[#1E293B]',
    primaryShadow: 'shadow-[0_4px_12px_rgba(30,41,59,0.15)]',
    accentBadge: 'bg-[#E2E8F0] text-[#1E293B] border-[#CBD5E1]',
    heroGradient: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155]',
    heroText: 'text-white',
    activeNavTab: 'bg-[#1E293B] text-white shadow-md',
    headerBg: 'bg-white/95'
  },
  saffronGold: {
    id: 'saffronGold',
    name: 'زعفران و کهربای ایران',
    enName: 'Persian Saffron & Amber',
    badge: 'گرم و درخشان',
    description: 'رنگ‌آمیزی گرم، زعفرانی و طلایی با حس پویایی و انرژی روزانه',
    previewColors: {
      bg: '#FDFBF7',
      card: '#FFFFFF',
      accent: '#D97706',
      secondary: '#92400E'
    },
    appBg: 'bg-[#FDFBF7]',
    appText: 'text-[#292524]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#E7E5E4]',
    primaryBg: 'bg-[#B45309]',
    primaryHover: 'hover:bg-[#92400E]',
    primaryText: 'text-[#B45309]',
    primaryShadow: 'shadow-[0_4px_12px_rgba(180,83,9,0.15)]',
    accentBadge: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    heroGradient: 'bg-gradient-to-br from-[#78350F] via-[#B45309] to-[#D97706]',
    heroText: 'text-white',
    activeNavTab: 'bg-[#B45309] text-white shadow-md',
    headerBg: 'bg-white/95'
  },
  emeraldParadise: {
    id: 'emeraldParadise',
    name: 'باغ ایرانی و سرسبزی شمال',
    enName: 'Persian Garden Emerald',
    badge: 'طبیعت و شادابی',
    description: 'سرو و باغ‌های تاریخی فین و ارم با سبز شاداب و طراوت بهاری',
    previewColors: {
      bg: '#F2F9F4',
      card: '#FFFFFF',
      accent: '#16A34A',
      secondary: '#166534'
    },
    appBg: 'bg-[#F2F9F4]',
    appText: 'text-[#143322]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#CFE6D7]',
    primaryBg: 'bg-[#15803D]',
    primaryHover: 'hover:bg-[#166534]',
    primaryText: 'text-[#15803D]',
    primaryShadow: 'shadow-[0_4px_12px_rgba(21,128,61,0.15)]',
    accentBadge: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
    heroGradient: 'bg-gradient-to-br from-[#14532D] via-[#15803D] to-[#16A34A]',
    heroText: 'text-white',
    activeNavTab: 'bg-[#15803D] text-white shadow-md',
    headerBg: 'bg-white/95'
  }
};

export function getThemeConfig(themeId?: string): ThemeConfig {
  if (themeId && themeId in THEME_PRESETS) {
    return THEME_PRESETS[themeId as CalendarTheme];
  }
  return THEME_PRESETS.persianRose;
}

