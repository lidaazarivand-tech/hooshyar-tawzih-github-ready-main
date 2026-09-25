import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Compass, 
  CheckSquare, 
  Wallet, 
  Sparkles,
  ArrowLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME, APP_TAGLINE, APP_AUTHOR, APP_DESCRIPTION } from '../../constants/appInfo';
import { ThemeConfig } from '../../utils/themePresets';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeConfig?: ThemeConfig;
  isRelaunch?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ 
  isOpen, 
  onClose,
  themeConfig,
  isRelaunch = false
}) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: CalendarIcon,
      title: 'تقویم و زمان',
      desc: 'گاه‌شمار هجری شمسی، قمری و میلادی با رویدادها و تبدیل تاریخ',
      bgClass: 'bg-[#123C35]/10',
      textClass: 'text-[#123C35]'
    },
    {
      icon: Compass,
      title: 'اذان و اوقات شرعی',
      desc: 'محاسبه دقیق اوقات شرعی تمام شهرهای ایران و قبله‌نما',
      bgClass: 'bg-[#C49A5A]/15',
      textClass: 'text-[#9A7538]'
    },
    {
      icon: CheckSquare,
      title: 'برنامه‌ریزی روزانه',
      desc: 'مدیریت کارها، یادداشت‌های متصل به روز و یادآورها',
      bgClass: 'bg-[#123C35]/10',
      textClass: 'text-[#123C35]'
    },
    {
      icon: Wallet,
      title: 'مدیریت مالی',
      desc: 'ثبت دخل‌و‌خرج ماهانه و حساب و کتاب بدهی و طلب‌ها',
      bgClass: 'bg-[#C49A5A]/15',
      textClass: 'text-[#9A7538]'
    }
  ];

  return (
    <AnimatePresence>
      <div 
        id="welcome-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
        dir="rtl"
      >
        <motion.div 
          id="welcome-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-[#FFFFFF] rounded-3xl border border-[#D9DED9] shadow-2xl overflow-hidden flex flex-col my-auto relative"
          style={{
            boxShadow: '0 25px 50px -12px rgba(18, 60, 53, 0.25), 0 10px 20px -8px rgba(18, 60, 53, 0.12)'
          }}
        >
          {/* Close button if viewed from Settings */}
          {isRelaunch && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white/90 transition-colors cursor-pointer"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-[#0C2E29] via-[#123C35] to-[#1B5E52] p-7 text-white text-center select-none overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#C49A5A]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            {/* Brand Logo Emblem */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.3 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden border-2 border-[#C49A5A]/50 mb-3 shadow-xl relative bg-[#0C2E29]"
            >
              <img src="/icon.png" alt={APP_NAME} className="w-full h-full object-cover" />
            </motion.div>

            <motion.h1 
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-white"
            >
              {APP_NAME}
            </motion.h1>

            <motion.p 
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="text-sm font-semibold text-[#E9E5DA] mb-2"
            >
              {APP_TAGLINE}
            </motion.p>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.25 }}
              className="text-xs text-white/80 max-w-xs mx-auto leading-relaxed"
            >
              {APP_DESCRIPTION}
            </motion.p>
          </div>

          {/* Key Features Grid */}
          <div className="p-5 sm:p-6 space-y-2.5 bg-[#F7F4EC]/60 max-h-[42vh] overflow-y-auto">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + idx * 0.05, duration: 0.2 }}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-[#D9DED9] shadow-xs"
                >
                  <div className={`p-2.5 rounded-xl ${f.bgClass} ${f.textClass} shrink-0 mt-0.5 shadow-2xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-[#1C2523] mb-0.5">{f.title}</h3>
                    <p className="text-[11px] sm:text-xs text-[#59635F] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer & Creator Credit */}
          <div className="p-5 sm:p-6 bg-white border-t border-[#D9DED9] flex flex-col gap-3.5">
            <button
              id="welcome-start-btn"
              onClick={onClose}
              className="w-full py-3.5 px-5 bg-[#123C35] hover:bg-[#0C2E29] active:scale-[0.98] text-white font-bold rounded-2xl shadow-md border border-[#0C2E29] flex items-center justify-center gap-2 text-sm sm:text-base transition-all cursor-pointer"
            >
              <span>{isRelaunch ? 'ادامه استفاده' : 'شروع کنید'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-[#59635F] block font-normal mb-0.5">طراحی و توسعه توسط</span>
              <span className="text-xs sm:text-sm font-bold text-[#123C35] bg-[#F7F4EC] px-3.5 py-1 rounded-xl border border-[#D9DED9] inline-block">
                {APP_AUTHOR}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

