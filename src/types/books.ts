export type BookCategoryId = 
  | 'quran' 
  | 'nahj' 
  | 'mafatih' 
  | 'sahifah' 
  | 'tawzih'
  | 'ahkam' 
  | 'kafi' 
  | 'fatimiyyah' 
  | 'ghurar' 
  | 'uyun' 
  | 'tuhaf';

export interface Ayah {
  numberInSurah: number;
  text: string;
  translation: string;
}

export interface SurahSummary {
  number: number;
  name: string; // Arabic: الفاتحة
  englishName: string; // Al-Faatiha
  persianName: string; // فاتحه (گشاینده)
  numberOfAyahs: number;
  revelationType: 'مکی' | 'مدنی';
  juz: number;
  virtue: string;
  theme: string;
}

export interface QuranSurahDetail extends SurahSummary {
  bismillah?: boolean;
  ayahs: Ayah[];
}

export interface ShiaBookItem {
  id: string;
  title: string;
  category: string; // مثلاً مناجات، زیارت، خطبه، دعا، احکام، حکمت
  description: string;
  arabicText: string;
  persianTranslation: string;
  virtueOrOccasion?: string;
  sourceCitation?: string; // منبع و سند دقیق (مانند: کافی، دارالحدیث ج۱، ح۱)
  licenseInfo?: string; // وضعیت حقوقی و دسترسی (مانند: منبع معتبر / دسترسی آزاد)
  audioNotes?: string;
  num?: number;
  type?: 'sermon' | 'letter' | 'wisdom';
  shortTitle?: string;
  arabicFarazes?: string[];
  persianFarazes?: string[];
  sourceUrl?: string;
}

export type ContentStatusType = 'full' | 'selected' | 'catalog' | 'in_progress';

export interface ContentStatusInfo {
  type: ContentStatusType;
  label: string; // e.g., 'متن موجود', 'منتخب', 'فهرست مطالب', 'در حال تکمیل'
  badgeClass: string;
  detail: string;
}

export type LibraryCategoryGroup = 'quran' | 'duas_ziyarat' | 'shia_works' | 'hadith_sources';

export interface ShiaBookCategory {
  id: BookCategoryId;
  title: string;
  persianTitle: string;
  authorOrSource: string;
  description: string;
  badge: string;
  colorClass: string;
  accentClass: string;
  totalChaptersOrItems: number;
  categoryGroup: LibraryCategoryGroup;
  status: ContentStatusInfo;
  sourceProvenance?: string; // اصالت و تاریخچه نسخه
  licenseInfo?: string; // وضعیت حق نشر
}

export interface TawzihMasailItem {
  id: string;
  volume: number;
  volumeTitle: string;
  section: string;
  subsection?: string;
  issueNumber: number | null;
  title: string;
  text: string;
  footnote?: string;
  sourceCitation: string;
  sourceUrl?: string;
}

