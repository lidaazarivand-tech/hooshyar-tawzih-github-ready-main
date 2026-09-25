import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Sparkles, ArrowLeft, Heart, ShieldCheck } from 'lucide-react';
import { FullDateInfo } from '../../types/calendar';
import { toPersianDigits } from '../../utils/persianNumber';

interface SplashScreenProps {
  onComplete: () => void;
  todayInfo: FullDateInfo;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, todayInfo }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress animation on mount
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 30);

    // Keyboard listener for quick enter
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  return (
    <motion.div
      id="app-splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-10 select-none overflow-hidden"
      dir="rtl"
    >
      {/* Ambient background glow circles */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar / Status */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="w-full max-w-sm flex items-center justify-between text-xs text-slate-400 font-medium z-10"
      >
        <span className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>نسخه اختصاصی موبایل و وب</span>
        </span>
        <button
          onClick={onComplete}
          className="flex items-center gap-1 text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1 rounded-full text-[11px] transition-all backdrop-blur-md cursor-pointer border border-white/10"
        >
          <span>رد کردن</span>
          <ArrowLeft className="w-3 h-3" />
        </button>
      </motion.div>

      {/* Center Hero Badge & Developer Credit */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-md w-full my-auto z-10">
        {/* Animated Emblem */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 260, 
            damping: 20, 
            delay: 0.15 
          }}
          className="relative group cursor-pointer"
          onClick={onComplete}
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900/90 border border-white/20 shadow-2xl flex flex-col items-center justify-center backdrop-blur-xl">
            <CalendarDays className="w-11 h-11 sm:w-13 sm:h-13 text-rose-400 mb-1 drop-shadow-md" />
            <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
              {toPersianDigits(todayInfo.jalali.jy)}
            </span>
          </div>
        </motion.div>

        {/* App Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
            تقویم هوشمند ایرانی
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            گاهشماری دقیق هجری شمسی، میلادی و قمری
          </p>
        </motion.div>

        {/* Highlighted Creator Badge Requested by User */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 border border-amber-400/40 backdrop-blur-md shadow-lg shadow-rose-950/50"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <div className="text-right">
            <span className="text-[11px] text-amber-200/90 font-medium block leading-tight">
              طراحی و توسعه‌دهنده
            </span>
            <span className="text-sm sm:text-base font-black text-white tracking-wide">
              عادل آذری‌وند
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-300 ml-1 shrink-0" />
        </motion.div>

        {/* Today Preview Pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-xs text-slate-400 font-medium bg-white/5 border border-white/10 px-4 py-1.5 rounded-full"
        >
          <span>امروز: {todayInfo.dayOfWeekName}، {toPersianDigits(todayInfo.jalali.jd)} {todayInfo.seasonName} {toPersianDigits(todayInfo.jalali.jy)}</span>
        </motion.div>
      </div>

      {/* Bottom Loading Progress & Fast Enter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="w-full max-w-xs flex flex-col items-center space-y-3 z-10"
      >
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-l from-rose-500 via-amber-400 to-emerald-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>

        <button
          id="splash-enter-btn"
          onClick={onComplete}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm shadow-xl shadow-rose-950/60 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-white/20 ring-4 ring-rose-500/20"
        >
          <span>ورود به برنامه</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-slate-400 font-medium">
          برای ورود روی دکمه بالا کلیک کنید
        </span>
      </motion.div>
    </motion.div>
  );
};
