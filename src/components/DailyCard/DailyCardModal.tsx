import React, { useState } from 'react';
import { Sparkles, Download, Share2, Copy, Check, Calendar, Heart, ShieldCheck, Moon, Sun } from 'lucide-react';
import { FullDateInfo } from '../../types/calendar';
import { toPersianDigits, PERSIAN_MONTH_NAMES, GREGORIAN_MONTH_NAMES, HIJRI_MONTH_NAMES } from '../../utils/persianNumber';
import { calculatePrayerTimes, IRANIAN_CITIES } from '../../utils/prayerTimes';

interface DailyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayInfo: FullDateInfo;
  selectedCityId: string;
}

export const DailyCardModal: React.FC<DailyCardModalProps> = ({
  isOpen,
  onClose,
  todayInfo,
  selectedCityId
}) => {
  const [copied, setCopied] = useState(false);
  const [cardTheme, setCardTheme] = useState<'gold' | 'rose' | 'turquoise' | 'dark'>('gold');

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

  const city = IRANIAN_CITIES.find(c => c.id === selectedCityId) || IRANIAN_CITIES[0];
  const prayers = calculatePrayerTimes(todayInfo.gregorian, city);

  const handleCopyText = () => {
    let occs = todayInfo.occasions.map(o => `${o.isHoliday ? '🔴' : '▫️'} ${o.title}`).join('\n');
    if (!occs) occs = 'امروز مناسبت خاصی ثبت نشده است.';

    const shareText = `🌟 تقویم و همراه روزانه «هوشیار» 🌟\n🗓 امروز: ${todayInfo.dayOfWeekName}، ${toPersianDigits(todayInfo.jalali.jd)} ${PERSIAN_MONTH_NAMES[todayInfo.jalali.jm - 1]} ${toPersianDigits(todayInfo.jalali.jy)}\n☀️ معادل میلادی: ${todayInfo.gregorian.gd} ${GREGORIAN_MONTH_NAMES[todayInfo.gregorian.gm - 1]} ${todayInfo.gregorian.gy}\n🌙 معادل هجری قمری: ${toPersianDigits(todayInfo.hijri.hd)} ${HIJRI_MONTH_NAMES[todayInfo.hijri.hm - 1]} ${toPersianDigits(todayInfo.hijri.hy)}\n\n📌 مناسبت‌های امروز:\n${occs}\n\n🕌 اوقات شرعی به افق ${city.name}:\n• اذان صبح: ${prayers.fajr}\n• طلوع آفتاب: ${prayers.sunrise}\n• اذان ظهر: ${prayers.dhuhr}\n• غروب آفتاب: ${prayers.sunset}\n• اذان مغرب: ${prayers.maghrib}\n\n✨ توسعه‌دهنده: عادل آذری وند | اپلیکیشن هوشیار`;

    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const themeStyles = {
    gold: 'from-amber-950 via-slate-900 to-amber-950 border-amber-500/40 text-amber-100',
    rose: 'from-rose-950 via-slate-900 to-rose-950 border-rose-500/40 text-rose-100',
    turquoise: 'from-teal-950 via-slate-900 to-cyan-950 border-teal-500/40 text-teal-100',
    dark: 'from-slate-950 via-slate-900 to-black border-slate-700 text-slate-100'
  }[cardTheme];

  const accentColor = {
    gold: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    rose: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
    turquoise: 'text-teal-400 border-teal-400/30 bg-teal-400/10',
    dark: 'text-slate-300 border-white/20 bg-white/5'
  }[cardTheme];

  return (
    <div 
      id="daily-card-modal-overlay"
      className="fixed inset-0 z-[75] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="daily-card-modal-content"
        className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-white/10 shadow-2xl space-y-4 relative my-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-black text-white">کارت گرافیکی روز و اشتراک‌گذاری</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer text-xs px-2.5 py-1 font-bold"
          >
            بستن
          </button>
        </div>

        {/* Theme Picker */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">رنگ‌بندی کارت:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCardTheme('gold')}
              className={`w-6 h-6 rounded-full bg-amber-500 cursor-pointer transition-transform ${cardTheme === 'gold' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}
              title="زرین و کهربایی"
            />
            <button
              onClick={() => setCardTheme('rose')}
              className={`w-6 h-6 rounded-full bg-rose-600 cursor-pointer transition-transform ${cardTheme === 'rose' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}
              title="گل سرخ"
            />
            <button
              onClick={() => setCardTheme('turquoise')}
              className={`w-6 h-6 rounded-full bg-teal-500 cursor-pointer transition-transform ${cardTheme === 'turquoise' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}
              title="فیروزه‌ای"
            />
            <button
              onClick={() => setCardTheme('dark')}
              className={`w-6 h-6 rounded-full bg-slate-700 cursor-pointer transition-transform ${cardTheme === 'dark' ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}
              title="شب تیره"
            />
          </div>
        </div>

        {/* The Graphic Card Container */}
        <div 
          id="shareable-daily-card"
          className={`bg-gradient-to-b ${themeStyles} rounded-3xl p-6 border shadow-2xl space-y-4 text-center relative overflow-hidden`}
        >
          {/* Subtle watermarks */}
          <div className="text-[10px] font-bold tracking-widest uppercase opacity-60">
            تقـویـم هـوشمنـد ایـرانـی
          </div>

          {/* Date Big Numbers */}
          <div className="space-y-1 py-1">
            <div className="text-xs font-bold opacity-80">
              {todayInfo.dayOfWeekName}
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
              {toPersianDigits(todayInfo.jalali.jd)} {PERSIAN_MONTH_NAMES[todayInfo.jalali.jm - 1]} {toPersianDigits(todayInfo.jalali.jy)}
            </div>
            <div className="text-xs font-medium opacity-90 flex items-center justify-center gap-2 pt-1">
              <span>{todayInfo.gregorian.gd} {GREGORIAN_MONTH_NAMES[todayInfo.gregorian.gm - 1]} {todayInfo.gregorian.gy}</span>
              <span>•</span>
              <span>{toPersianDigits(todayInfo.hijri.hd)} {HIJRI_MONTH_NAMES[todayInfo.hijri.hm - 1]} {toPersianDigits(todayInfo.hijri.hy)}</span>
            </div>
          </div>

          {/* Occasions Box */}
          {todayInfo.occasions.length > 0 && (
            <div className={`p-3 rounded-2xl border ${accentColor} text-right space-y-1`}>
              <span className="text-[10px] font-bold block opacity-75">مناسبت‌های امروز:</span>
              {todayInfo.occasions.map(o => (
                <div key={o.id} className="text-xs font-bold flex items-center gap-1.5">
                  <span>{o.isHoliday ? '🔴' : '•'}</span>
                  <span>{o.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Prayers compact bar */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="bg-white/5 p-1.5 rounded-xl">
              <span className="opacity-70 block">اذان صبح</span>
              <span className="font-bold text-white text-xs">{prayers.fajr}</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-xl">
              <span className="opacity-70 block">اذان ظهر</span>
              <span className="font-bold text-white text-xs">{prayers.dhuhr}</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-xl">
              <span className="opacity-70 block">اذان مغرب</span>
              <span className="font-bold text-white text-xs">{prayers.maghrib}</span>
            </div>
          </div>

          {/* Creator Signature */}
          <div className="pt-2 text-[10px] opacity-70 flex items-center justify-center gap-1">
            <span>طراحی و توسعه:</span>
            <strong className="text-white font-bold">عادل آذری‌وند</strong>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCopyText}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 hover:opacity-90 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>متن و کارت کپی شد!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>کپی متن روز برای ارسال در پیام‌رسان‌ها</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
