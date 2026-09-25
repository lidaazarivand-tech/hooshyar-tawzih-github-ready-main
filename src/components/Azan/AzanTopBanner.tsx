import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
   Square, 
   Play, 
   Pause, 
   Volume2, 
   VolumeX, 
   Radio, 
   X, 
   Sparkles, 
   Compass, 
   Sliders,
   AlertCircle
} from 'lucide-react';
import { 
   azanAudioEngine, 
   AZAN_RECITERS, 
   AZAN_VERSES, 
   AzanPlayerState 
} from '../../utils/azanAudioEngine';

interface AzanTopBannerProps {
  onOpenAzanModal?: () => void;
}

export const AzanTopBanner: React.FC<AzanTopBannerProps> = ({ onOpenAzanModal }) => {
  const [playerState, setPlayerState] = useState<AzanPlayerState>(azanAudioEngine.getState());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(0.85);

  useEffect(() => {
    const unsubscribe = azanAudioEngine.subscribe((state) => {
      setPlayerState(state);
    });
    return () => unsubscribe();
  }, []);

  if (!playerState.isPlaying && !playerState.isAutoplayBlocked) {
    return null;
  }

  const reciter = AZAN_RECITERS.find(r => r.id === playerState.reciterId) || AZAN_RECITERS[0];
  const currentVerse = playerState.currentVerseIndex >= 0 && playerState.currentVerseIndex < AZAN_VERSES.length
    ? AZAN_VERSES[playerState.currentVerseIndex]
    : null;

  const handleStop = () => {
    azanAudioEngine.stop();
  };

  const handleTogglePlay = () => {
    if (playerState.isAutoplayBlocked) {
      azanAudioEngine.play(playerState.reciterId, playerState.volume, playerState.prayerName, playerState.cityName);
    } else if (playerState.isPaused) {
      azanAudioEngine.resume();
    } else {
      azanAudioEngine.pause();
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      azanAudioEngine.setVolume(prevVolume || 0.85);
      setIsMuted(false);
    } else {
      setPrevVolume(playerState.volume);
      azanAudioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        id="azan-active-top-banner"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 inset-x-0 z-50 px-3 py-2.5 sm:px-6 sm:py-3 shadow-2xl bg-gradient-to-r from-emerald-900/95 via-teal-900/95 to-slate-900/95 backdrop-blur-md text-white border-b border-emerald-500/30"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Right Section: Spiritual Status & Current Verse */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Animated Beacon */}
            <div className="relative flex items-center justify-center">
              <span className="absolute w-10 h-10 rounded-full bg-emerald-400/30 animate-ping" />
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
            </div>

            {/* Title & Details */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base text-emerald-200 truncate">
                  {playerState.prayerName ? `در حال پخش ${playerState.prayerName}` : 'نوای ملکوتی اذان'}
                  {playerState.cityName ? ` به افق ${playerState.cityName}` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 hidden xs:inline-block">
                  {reciter.name}
                </span>
              </div>

              {/* Real-time Current Verse */}
              {currentVerse ? (
                <p className="text-xs text-emerald-100/90 font-medium truncate flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-amber-300 font-arabic">«{currentVerse.arabic}»</span>
                  <span className="text-emerald-300/70 hidden md:inline">— {currentVerse.persian}</span>
                </p>
              ) : (
                <p className="text-xs text-emerald-200/80 truncate mt-0.5">
                  {reciter.style}
                </p>
              )}
            </div>

            {/* Mobile close/stop quick icon */}
            <button
              onClick={handleStop}
              className="sm:hidden p-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 shadow-md shadow-rose-900/40"
              title="قطع اذان"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>قطع</span>
            </button>
          </div>

          {/* Left Section: Action Buttons & Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Autoplay Blocked Tap Hint */}
            {playerState.isAutoplayBlocked && (
              <motion.button
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                onClick={handleTogglePlay}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg"
              >
                <AlertCircle className="w-4 h-4" />
                <span>ضربه بزنید تا پخش شود</span>
              </motion.button>
            )}

            {/* Play/Pause Toggle */}
            <button
              onClick={handleTogglePlay}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center active:scale-95"
              title={playerState.isPaused ? 'ادامه پخش' : 'مکث'}
            >
              {playerState.isPaused ? (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center active:scale-95"
              title={isMuted ? 'وصل صدا' : 'بی‌صدا'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Open Azan Modal Details */}
            {onOpenAzanModal && (
              <button
                onClick={onOpenAzanModal}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>اوقات و قبله</span>
              </button>
            )}

            {/* Prominent Stop / Cut Button */}
            <button
              onClick={handleStop}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>قطع اذان</span>
            </button>

            {/* Close Button */}
            <button
              onClick={handleStop}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
