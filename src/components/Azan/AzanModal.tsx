import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Square, 
  Compass, 
  Clock, 
  Sparkles, 
  Bell, 
  BellOff, 
  Check, 
  Calendar, 
  Moon, 
  Sun, 
  MapPin, 
  Info, 
  RotateCw,
  Share2,
  Sliders,
  ChevronDown,
  Globe,
  Radio,
  Search,
  CheckCircle2,
  Music2,
  Volume1,
  Download
} from 'lucide-react';
import { FullDateInfo, GregorianDate, CalendarSettings } from '../../types/calendar';
import { 
  IRANIAN_CITIES, 
  CityLocation, 
  calculatePrayerTimes, 
  getNextPrayerInfo, 
  calculateQiblaAngle, 
  calculateDistanceToMeccaKm,
  PrayerTimes,
  NextPrayerInfo
} from '../../utils/prayerTimes';
import { 
  AZAN_RECITERS, 
  AZAN_VERSES, 
  azanAudioEngine, 
  ReciterProfile,
  AzanPlayerState
} from '../../utils/azanAudioEngine';
import { cacheAzanAudio, isAzanCached, cacheAllAzans, getAzanCacheSummary } from '../../utils/azanCache';
import { useExactAlarmPermission } from '../../hooks/useExactAlarmPermission';
import { 
  toPersianDigits, 
  padZero, 
  PERSIAN_MONTH_NAMES, 
  GREGORIAN_MONTH_NAMES 
} from '../../utils/persianNumber';
import { getJalaliMonthLength, jalaliToGregorian } from '../../utils/jalali';
import {
  computeAdjustedHeading,
  smoothHeadingEMA,
  calculateRelativeQiblaAngle,
  getScreenOrientationAngle
} from '../../utils/compassHeading';

interface AzanModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayInfo: FullDateInfo;
  selectedCityId: string;
  onCityChange?: (cityId: string) => void;
  settings?: CalendarSettings;
  onUpdateSettings?: (settings: Partial<CalendarSettings>) => void;
}

export const AzanModal: React.FC<AzanModalProps> = ({
  isOpen,
  onClose,
  todayInfo,
  selectedCityId,
  onCityChange,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'azan' | 'qibla' | 'timetable'>('azan');
  const [currentCityId, setCurrentCityId] = useState<string>(selectedCityId || 'tehran');
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  // Audio state
  const [playerState, setPlayerState] = useState<AzanPlayerState>(azanAudioEngine.getState());
  const [selectedReciterId, setSelectedReciterId] = useState<string>(settings?.azanReciter || 'moazenzadeh');
  const [volume, setVolume] = useState<number>(0.85);

  // Offline Caching State
  const [cachedIds, setCachedIds] = useState<string[]>([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);

  // Per-prayer alarm toggles synced with global settings
  const [alarmFajr, setAlarmFajr] = useState<boolean>(settings?.azanAlarmFajr !== false);
  const [alarmDhuhr, setAlarmDhuhr] = useState<boolean>(settings?.azanAlarmDhuhr !== false);
  const [alarmMaghrib, setAlarmMaghrib] = useState<boolean>(settings?.azanAlarmMaghrib !== false);

  // Exact alarm capability check for Android 12+
  const { isNativeAndroid, isExactAlarmGranted, openSettings: handleOpenExactAlarmSettings } = useExactAlarmPermission();

  // Sync settings when changed from outside
  useEffect(() => {
    if (settings) {
      if (settings.azanReciter) {
        setSelectedReciterId(settings.azanReciter);
      }
      setAlarmFajr(settings.azanAlarmFajr !== false);
      setAlarmDhuhr(settings.azanAlarmDhuhr !== false);
      setAlarmMaghrib(settings.azanAlarmMaghrib !== false);
    }
  }, [settings]);

  // Live countdown state
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);

  // Compass state
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [manualRotation, setManualRotation] = useState<number>(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(false);

  // Load cache status when modal opens
  const refreshCacheStatus = async () => {
    try {
      const summary = await getAzanCacheSummary();
      setCachedIds(summary.cachedIds);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshCacheStatus();
    }
  }, [isOpen]);

  // Sync city prop when changed from outside
  useEffect(() => {
    if (selectedCityId) {
      setCurrentCityId(selectedCityId);
    }
  }, [selectedCityId]);

  // Find active city object
  const city = IRANIAN_CITIES.find(c => c.id === currentCityId) || IRANIAN_CITIES[0];
  const getCityGregorian = useCallback(() => {
    const now = new Date();
    const cityOffsetMillis = Math.round(city.timezone * 3600000);
    const cityNow = new Date(now.getTime() + cityOffsetMillis);
    return {
      gy: cityNow.getUTCFullYear(),
      gm: cityNow.getUTCMonth() + 1,
      gd: cityNow.getUTCDate()
    };
  }, [city.timezone]);
  const prayers = calculatePrayerTimes(getCityGregorian(), city);
  const qiblaAngle = calculateQiblaAngle(city.lat, city.lng);
  const distanceToMecca = calculateDistanceToMeccaKm(city.lat, city.lng);

  // Handle City Change
  const handleSelectCity = (newCityId: string) => {
    setCurrentCityId(newCityId);
    onCityChange?.(newCityId);
  };

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const p = calculatePrayerTimes(getCityGregorian(), city);
      const next = getNextPrayerInfo(p, new Date(), city.timezone);
      setNextPrayer(next);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [getCityGregorian, city]);

  // Audio Engine Subscription
  useEffect(() => {
    const unsubscribe = azanAudioEngine.subscribe((state) => {
      setPlayerState({ ...state });
      if (state.reciterId) {
        setSelectedReciterId(state.reciterId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const lastAzanHeadingRef = useRef<number>(0);
  const hasAbsoluteAzanRef = useRef<boolean>(false);
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Orientation Sensor Listener with EMA Smoothing and Screen Angle compensation matching QiblaModal
  useEffect(() => {
    if (!isOpen) return;

    hasAbsoluteAzanRef.current = false;

    const processHeading = (rawHeading: number, isDirectCompassHeading: boolean) => {
      // Screen orientation compensation (0, 90, 180, 270)
      // Note: iOS webkitCompassHeading is ALREADY oriented to the screen's top.
      // Standard W3C alpha is relative to the device's portrait frame, so screenAngle is added only for alpha.
      const screenAngle = getScreenOrientationAngle();
      const adjustedHeading = computeAdjustedHeading(rawHeading, isDirectCompassHeading, screenAngle);
      if (isNaN(adjustedHeading)) return;

      // Exponential Moving Average (EMA) smoothing using shortest angular distance
      const prev = lastAzanHeadingRef.current;
      const smoothed = smoothHeadingEMA(prev, adjustedHeading, 0.25);

      lastAzanHeadingRef.current = smoothed;
      setSensorAvailable(true);
      setDeviceHeading(Math.round(smoothed));
    };

    const handleAbsoluteOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
        hasAbsoluteAzanRef.current = true;
        // alpha goes counter-clockwise 0..360, so clockwise heading is (360 - e.alpha) % 360
        const rawHeading = (360 - e.alpha) % 360;
        processHeading(rawHeading, false);
      }
    };

    const handleStandardOrientation = (e: DeviceOrientationEvent) => {
      // iOS WebKit compass heading (direct magnetic/true heading 0..360 relative to screen top)
      if (typeof (e as any).webkitCompassHeading === 'number' && !isNaN((e as any).webkitCompassHeading)) {
        processHeading((e as any).webkitCompassHeading, true);
        return;
      }

      // If absolute orientation event is active and delivering data, ignore redundant relative event to prevent jitter
      if (hasAbsoluteAzanRef.current) {
        return;
      }

      // Android / standard W3C fallback
      if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
        const rawHeading = (360 - e.alpha) % 360;
        processHeading(rawHeading, false);
      }
    };

    // Listen for absolute orientation first (Android Chrome / devices with calibrated True North)
    if ('ondeviceorientationabsolute' in window) {
      (window as any).addEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
    }
    window.addEventListener('deviceorientation', handleStandardOrientation, true);

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        (window as any).removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
      }
      window.removeEventListener('deviceorientation', handleStandardOrientation, true);
    };
  }, [isOpen]);

  // Request Permission for iOS 13+
  const requestSensorPermission = async () => {
    try {
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionRequested(true);
        }
      }
    } catch (e) {
      console.warn('Sensor permission error:', e);
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        azanAudioEngine.stop();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTogglePlay = (reciterIdToPlay?: string) => {
    const recId = reciterIdToPlay || selectedReciterId;
    if (playerState.isPlaying && !playerState.isPaused) {
      azanAudioEngine.pause();
    } else if (playerState.isPaused) {
      azanAudioEngine.resume();
    } else {
      azanAudioEngine.play(recId, volume);
    }
  };

  const handlePlayReciter = (reciterId: string) => {
    setSelectedReciterId(reciterId);
    onUpdateSettings?.({ azanReciter: reciterId });
    azanAudioEngine.play(reciterId, volume);
  };

  const handleStop = () => {
    azanAudioEngine.stop();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    azanAudioEngine.setVolume(newVol);
  };

  const handleTestChime = () => {
    if (playerState.isPlaying) {
      azanAudioEngine.stop();
    } else {
      azanAudioEngine.play(selectedReciterId, volume);
    }
  };

  // Compass Angle relative calculation
  const compassBearing = sensorAvailable ? deviceHeading : manualRotation;
  const qiblaRelativeAngle = calculateRelativeQiblaAngle(qiblaAngle, compassBearing);

  // Monthly Timetable Generator
  const currentMonthDays = getJalaliMonthLength(todayInfo.jalali.jy, todayInfo.jalali.jm);
  const monthlyRows: Array<{ day: number; gregorian: GregorianDate; prayers: PrayerTimes }> = [];
  for (let d = 1; d <= currentMonthDays; d++) {
    const g = jalaliToGregorian(todayInfo.jalali.jy, todayInfo.jalali.jm, d);
    const p = calculatePrayerTimes(g, city);
    monthlyRows.push({ day: d, gregorian: g, prayers: p });
  }

  // Reciters list (Moazenzadeh & Sobhdel)
  const recitersList = AZAN_RECITERS;

  // Filtered cities
  const filteredCities = IRANIAN_CITIES.filter(c => 
    c.name.includes(citySearchQuery) || c.province.includes(citySearchQuery)
  );

  return (
    <div 
      id="azan-modal-overlay"
      className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="azan-modal-content"
        className="bg-white rounded-3xl p-4 sm:p-6 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-4 relative my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  اذان‌گوی هوشمند، افق شرعی و قبله‌نما
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  صوت واقعی قاریان
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                پخش اذان دلنشین استاد مؤذن‌زاده، استاد صبحدل و مؤذنان برجسته به افق {city.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors text-xs font-bold"
          >
            بستن
          </button>
        </div>

        {/* City Horizon Selector Banner - FULLY INTERACTIVE */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-3 rounded-2xl border border-emerald-200/80 shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-600 font-medium ml-1">افق شرعی فعال:</span>
                <strong className="text-slate-900 font-black text-sm">{city.name}</strong>
                <span className="text-slate-500 text-[11px] mr-1.5">({city.province})</span>
              </div>
            </div>

            {/* Quick City Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                id="azan-city-dropdown"
                value={currentCityId}
                onChange={(e) => handleSelectCity(e.target.value)}
                className="bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full sm:w-auto"
              >
                {IRANIAN_CITIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.province})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Popular Cities Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <span className="text-slate-500 text-[10px] shrink-0">شهرهای پرکاربرد:</span>
            {['tehran', 'mashhad', 'isfahan', 'shiraz', 'tabriz', 'ahvaz', 'qom', 'rasht', 'kermanshah', 'zahedan'].map(cId => {
              const cObj = IRANIAN_CITIES.find(c => c.id === cId);
              if (!cObj) return null;
              const isActive = currentCityId === cId;
              return (
                <button
                  key={cId}
                  onClick={() => handleSelectCity(cId)}
                  className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {cObj.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('azan')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'azan'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>اذان‌گو و صوت مؤذنان</span>
          </button>

          <button
            onClick={() => setActiveTab('qibla')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qibla'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>قبله‌نما و قطب‌نما</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدول ۳۰ روزه اوقات شرعی</span>
          </button>
        </div>

        {/* Modal Body Container with scrolling */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-0.5">
          {/* TAB 1: AZAN & LIVE COUNTDOWN */}
          {activeTab === 'azan' && (
            <div className="space-y-4">
              {/* Next Prayer Live Countdown Card */}
              {nextPrayer && (
                <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-4 sm:p-5 rounded-3xl border border-emerald-500/30 shadow-xl relative overflow-hidden text-center space-y-3">
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>وقت شرعی بعدی در {city.name}:</span>
                    </span>
                    <strong className="bg-white/10 px-3 py-0.5 rounded-full text-emerald-300 font-black">
                      {nextPrayer.name} ({nextPrayer.timeStr})
                    </strong>
                  </div>

                  <div className="py-1">
                    <div className="text-3xl sm:text-4xl font-black font-sans tracking-wider text-emerald-100">
                      {toPersianDigits(
                        `${padZero(Math.floor(nextPrayer.minutesRemaining / 60))}:${padZero(nextPrayer.minutesRemaining % 60)}:${padZero(nextPrayer.secondsRemaining)}`
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-300/80 font-medium mt-0.5 block">
                      زمان باقیمانده تا طنین {nextPrayer.name}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${nextPrayer.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Today Prayer Times Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">اذان صبح</span>
                  <strong className="text-slate-900 text-sm font-black block mt-0.5">{prayers.fajr}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">طلوع آفتاب</span>
                  <strong className="text-slate-900 text-sm font-black block mt-0.5">{prayers.sunrise}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">اذان ظهر</span>
                  <strong className="text-slate-900 text-sm font-black block mt-0.5">{prayers.dhuhr}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">غروب آفتاب</span>
                  <strong className="text-slate-900 text-sm font-black block mt-0.5">{prayers.sunset}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">اذان مغرب</span>
                  <strong className="text-slate-900 text-sm font-black block mt-0.5">{prayers.maghrib}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">نیمه‌شب شرعی</span>
                  <strong className="text-slate-900 text-sm font-black block mt-0.5">{prayers.midnight}</strong>
                </div>
              </div>

              {/* Master Live Audio Player Console */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Music2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-400">
                        پخش زنده صوت اذان
                      </div>
                      <div className="text-sm font-bold text-white">
                        {AZAN_RECITERS.find(r => r.id === selectedReciterId)?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 border border-emerald-500/30">
                      <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                      صوت واقعی
                    </span>
                  </div>
                </div>

                {/* Live Progress Bar & Timings */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden cursor-pointer">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-200"
                      style={{ width: `${playerState.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      {toPersianDigits(`${padZero(Math.floor(playerState.currentTime / 60))}:${padZero(Math.floor(playerState.currentTime % 60))}`)}
                    </span>
                    <span>
                      {playerState.duration > 0 
                        ? toPersianDigits(`${padZero(Math.floor(playerState.duration / 60))}:${padZero(Math.floor(playerState.duration % 60))}`)
                        : '--:--'}
                    </span>
                  </div>
                </div>

                {/* Player Controls Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleTogglePlay()}
                      className={`flex-1 sm:flex-initial px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        playerState.isPlaying && !playerState.isPaused
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                      }`}
                    >
                      {playerState.isLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>در حال بارگذاری صوت...</span>
                        </>
                      ) : playerState.isPlaying && !playerState.isPaused ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>توقف موقت (مکث)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>پخش اذان {AZAN_RECITERS.find(r => r.id === selectedReciterId)?.name.split(' ')[1] || ''}</span>
                        </>
                      )}
                    </button>

                    {(playerState.isPlaying || playerState.isPaused) && (
                      <button
                        onClick={handleStop}
                        className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors cursor-pointer"
                        title="قطع کامل"
                      >
                        <Square className="w-4 h-4 fill-current" />
                      </button>
                    )}
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 w-full sm:w-48 text-xs text-slate-400">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-300 w-7 font-mono text-left">
                      {toPersianDigits(Math.round(volume * 100))}٪
                    </span>
                  </div>
                </div>

                {/* Error Message notification if genuine audio is not found */}
                {playerState.errorMessage && (
                  <div className="p-3 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs text-center font-bold animate-fade-in">
                    {playerState.errorMessage}
                  </div>
                )}
              </div>

              {/* Reciters Selector Section */}
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                {/* Reciters Header & Offline Notice */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>انتخاب مؤذن (مؤذن‌زاده اردبیلی، صبحدل و مصطفی غلوش):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isDownloadingAll}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setIsDownloadingAll(true);
                        setDownloadProgress({ current: 1, total: AZAN_RECITERS.length, name: AZAN_RECITERS[0].name });
                        try {
                          await cacheAllAzans((cur, tot, name) => {
                            setDownloadProgress({ current: cur, total: tot, name });
                          });
                          await refreshCacheStatus();
                        } catch (err) {
                          // ignore
                        } finally {
                          setIsDownloadingAll(false);
                          setDownloadProgress(null);
                        }
                      }}
                      className="text-[10px] text-emerald-800 font-bold bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      {isDownloadingAll ? (
                        <>
                          <RotateCw className="w-3 h-3 animate-spin text-emerald-700" />
                          <span>در حال ذخیره ({toPersianDigits(downloadProgress?.current || 1)} از {toPersianDigits(AZAN_RECITERS.length)})...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 text-emerald-700" />
                          <span>ذخیره آفلاین همه صوت‌ها</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Batch Download Progress Notification */}
                {isDownloadingAll && downloadProgress && (
                  <div className="p-3 bg-emerald-950 text-emerald-100 rounded-2xl text-xs space-y-2 border border-emerald-500/40 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>در حال دانلود و ذخیره در حافظه دستگاه: <strong>{downloadProgress.name}</strong></span>
                      </span>
                      <span className="font-mono text-emerald-300 text-[11px]">
                        {toPersianDigits(Math.round((downloadProgress.current / downloadProgress.total) * 100))}٪
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Reciters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recitersList.map((r) => {
                    const isSelected = selectedReciterId === r.id;
                    const isCurrentlyPlaying = isSelected && playerState.isPlaying;
                    const isCached = cachedIds.includes(r.id);
                    const isDownloadingThis = downloadingSingleId === r.id;

                    return (
                      <div
                        key={r.id}
                        onClick={() => handlePlayReciter(r.id)}
                        className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-emerald-50/95 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                            : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900">{r.name}</span>
                              {r.famous && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold">
                                  ماندگار
                                </span>
                              )}
                              {isCached ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>آفلاین در گوشی</span>
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium">
                                  آنلاین (ذخیره با پخش)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-800 font-semibold">{r.title}</div>
                            <div className="text-[10px] text-slate-500 leading-relaxed">{r.desc}</div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {/* Single download button if not cached */}
                            {!isCached && (
                              <button
                                disabled={isDownloadingThis}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDownloadingSingleId(r.id);
                                  try {
                                    await cacheAzanAudio(r.id);
                                    await refreshCacheStatus();
                                  } catch (err) {}
                                  finally {
                                    setDownloadingSingleId(null);
                                  }
                                }}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                title="دانلود و ذخیره آفلاین در گوشی"
                              >
                                {isDownloadingThis ? (
                                  <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {isCurrentlyPlaying ? (
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                              </div>
                            ) : (
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                              }`}>
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Azan Verses Highlighted Display */}
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">فرازهای اذان و ترجمه فارسی:</span>
                  <span className="text-[10px] text-slate-500">همگام با صوت اذان هایلایت می‌شود</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {AZAN_VERSES.map((v, idx) => {
                    const isCurrentVerse = playerState.currentVerseIndex === idx;
                    return (
                      <div
                        key={v.id}
                        className={`p-2 rounded-xl text-xs transition-all ${
                          isCurrentVerse 
                            ? 'bg-emerald-600 text-white shadow-xs font-bold scale-[1.01]' 
                            : 'bg-white border border-slate-200/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs">{v.arabic}</span>
                          <span className={`text-[10px] ${isCurrentVerse ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {toPersianDigits(v.repeatCount)} مرتبه
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 line-clamp-1 ${isCurrentVerse ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {v.persian}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Prayer Alert Notification Toggles */}
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                {isNativeAndroid && !isExactAlarmGranted && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-1 flex-1">
                        <strong className="font-bold flex items-center gap-1.5 text-amber-900">
                          <span>⚠️</span>
                          <span>مجوز هشدارهای دقیق (Exact Alarm) غیرفعال است</span>
                        </strong>
                        <p className="text-[11px] leading-relaxed text-amber-900/90">
                          در اندروید ۱۲ به بالا، برای پخش دقیق و سر وقت اذان در پس‌زمینه و هنگام قفل بودن صفحه، مجوز «تنظیم هشدارها و یادآوری‌ها» در تنظیمات گوشی الزامی است.
                        </p>
                      </div>
                      <button
                        onClick={handleOpenExactAlarmSettings}
                        className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shrink-0 cursor-pointer text-xs shadow-xs transition-colors"
                      >
                        تنظیمات مجوز
                      </button>
                    </div>
                  </div>
                )}

                {/* Master Auto Azan Switch & Status */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">
                        پخش خودکار اذان
                      </span>
                      {settings?.autoAzanEnabled !== false && (
                        isNativeAndroid ? (
                          isExactAlarmGranted ? (
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                              زمان‌بندی دقیق: فعال
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-semibold">
                              هشدار غیردقیق (نیازمند مجوز)
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                            پخش در مرورگر
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      پخش صوت هنگام فرارسیدن اوقات شرعی
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const next = settings?.autoAzanEnabled === false ? true : false;
                      onUpdateSettings?.({ autoAzanEnabled: next });
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings?.autoAzanEnabled !== false ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      settings?.autoAzanEnabled !== false ? 'left-1' : 'right-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-800">
                    انتخاب نوبت‌های اذان برای پخش و هشدار:
                  </span>
                  <button
                    onClick={handleTestChime}
                    className={`text-[11px] px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      playerState.isPlaying
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {playerState.isPlaying ? (
                      <>
                        <Square className="w-3 h-3 text-rose-600 fill-current" />
                        <span>توقف صدای زنگ</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3 h-3 text-emerald-600" />
                        <span>تست صدای زنگ با اذان</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const nextVal = !alarmFajr;
                      setAlarmFajr(nextVal);
                      onUpdateSettings?.({ azanAlarmFajr: nextVal });
                    }}
                    className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      alarmFajr 
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-emerald-600" />
                    <span>اذان صبح</span>
                    <span className="text-[10px] opacity-75">{alarmFajr ? 'فعال' : 'غیرفعال'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const nextVal = !alarmDhuhr;
                      setAlarmDhuhr(nextVal);
                      onUpdateSettings?.({ azanAlarmDhuhr: nextVal });
                    }}
                    className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      alarmDhuhr 
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-emerald-600" />
                    <span>اذان ظهر</span>
                    <span className="text-[10px] opacity-75">{alarmDhuhr ? 'فعال' : 'غیرفعال'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const nextVal = !alarmMaghrib;
                      setAlarmMaghrib(nextVal);
                      onUpdateSettings?.({ azanAlarmMaghrib: nextVal });
                    }}
                    className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      alarmMaghrib 
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-emerald-600" />
                    <span>اذان مغرب</span>
                    <span className="text-[10px] opacity-75">{alarmMaghrib ? 'فعال' : 'غیرفعال'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QIBLA & COMPASS */}
          {activeTab === 'qibla' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-3xl text-xs space-y-1">
                <div className="font-bold text-emerald-950">
                  زاویه قبله نسبت به شمال مغناطیسی در شهر {city.name}: {toPersianDigits(qiblaAngle)}° درجه
                </div>
                <div className="text-slate-600 text-[11px]">
                  فاصله مستقیم تا کعبه معظمه در مکه مکرمه: {toPersianDigits(distanceToMecca.toLocaleString())} کیلومتر
                </div>
              </div>

              {/* Compass Graphic */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center p-4">
                {/* Outer Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-slate-300 shadow-inner flex items-center justify-center bg-radial from-slate-50 to-slate-200">
                  <span className="absolute top-2 font-bold text-xs text-rose-600">شمال (N)</span>
                  <span className="absolute bottom-2 font-bold text-xs text-slate-600">جنوب (S)</span>
                  <span className="absolute right-2 font-bold text-xs text-slate-600">شرق (E)</span>
                  <span className="absolute left-2 font-bold text-xs text-slate-600">غرب (W)</span>

                  {/* Degree ticks */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                    <div 
                      key={deg} 
                      className="absolute w-full h-full pointer-events-none flex justify-center"
                      style={{ transform: `rotate(${deg}deg)` }}
                    >
                      <div className={`w-0.5 ${deg % 90 === 0 ? 'h-3 bg-slate-600' : 'h-1.5 bg-slate-400'}`}></div>
                    </div>
                  ))}
                </div>

                {/* Rotating Qibla Indicator */}
                <div 
                  className="absolute w-full h-full transition-transform duration-500 pointer-events-none flex items-center justify-center"
                  style={{ transform: `rotate(${qiblaRelativeAngle}deg)` }}
                >
                  <div className="h-full flex flex-col items-center justify-start pt-6">
                    <div className="p-2 bg-emerald-600 text-white rounded-full shadow-lg border-2 border-white flex flex-col items-center">
                      <Compass className="w-5 h-5 animate-pulse" />
                      <span className="text-[9px] font-black mt-0.5">قبله</span>
                    </div>
                    <div className="w-1 bg-gradient-to-b from-emerald-500 to-transparent h-20 rounded-full"></div>
                  </div>
                </div>

                {/* Center Hub */}
                <div className="z-10 w-12 h-12 rounded-full bg-slate-900 text-white flex flex-col items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-[10px] font-black text-emerald-400 font-sans">{toPersianDigits(Math.round(qiblaRelativeAngle))}°</span>
                </div>
              </div>

              {/* Manual Rotation Slider if sensor is not available */}
              {!sensorAvailable && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>تنظیم دستی جهت گوشی (چرخش قطب‌نما):</span>
                    <span className="font-bold font-mono">{toPersianDigits(manualRotation)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={manualRotation}
                    onChange={(e) => setManualRotation(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    برای یافتن دقیق قبله، گوشی را بچرخانید تا نشانگر سبز قبله به سمت بالا قرار گیرد.
                  </p>
                  {typeof (DeviceOrientationEvent as any)?.requestPermission === 'function' && !permissionRequested && (
                    <button
                      onClick={requestSensorPermission}
                      className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>فعال‌سازی سنسور قطب‌نمای گوشی</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MONTHLY TIMETABLE */}
          {activeTab === 'timetable' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold">
                  جدول اوقات شرعی ماه {PERSIAN_MONTH_NAMES[todayInfo.jalali.jm - 1]} برای شهر {city.name}:
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {toPersianDigits(todayInfo.jalali.jy)} هجری شمسی
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2">روز</th>
                      <th className="p-2">اذان صبح</th>
                      <th className="p-2">طلوع آفتاب</th>
                      <th className="p-2">اذان ظهر</th>
                      <th className="p-2">غروب آفتاب</th>
                      <th className="p-2">اذان مغرب</th>
                      <th className="p-2">نیمه‌شب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyRows.map(row => {
                      const isTodayRow = row.day === todayInfo.jalali.jd;
                      return (
                        <tr 
                          key={row.day}
                          className={`transition-colors ${
                            isTodayRow 
                              ? 'bg-emerald-50 font-black text-emerald-950' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-lg ${isTodayRow ? 'bg-emerald-600 text-white' : ''}`}>
                              {toPersianDigits(row.day)} {isTodayRow ? '(امروز)' : ''}
                            </span>
                          </td>
                          <td className="p-2 font-mono">{row.prayers.fajr}</td>
                          <td className="p-2 font-mono text-slate-500">{row.prayers.sunrise}</td>
                          <td className="p-2 font-mono">{row.prayers.dhuhr}</td>
                          <td className="p-2 font-mono text-slate-500">{row.prayers.sunset}</td>
                          <td className="p-2 font-mono">{row.prayers.maghrib}</td>
                          <td className="p-2 font-mono text-slate-500">{row.prayers.midnight}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
