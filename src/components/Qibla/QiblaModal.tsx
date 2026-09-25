import React, { useState, useEffect, useRef } from 'react';
import { Compass, MapPin, Sparkles, CheckCircle2, RotateCw, Navigation, X, ShieldAlert, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { IRANIAN_CITIES, calculateQiblaAngle, calculateDistanceToMeccaKm } from '../../utils/prayerTimes';
import { toPersianDigits } from '../../utils/persianNumber';
import {
  computeAdjustedHeading,
  smoothHeadingEMA,
  calculateRelativeQiblaAngle,
  getScreenOrientationAngle
} from '../../utils/compassHeading';

interface QiblaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCityId: string;
  onCityChange?: (cityId: string) => void;
}

export const QiblaModal: React.FC<QiblaModalProps> = ({
  isOpen,
  onClose,
  selectedCityId,
  onCityChange
}) => {
  const [currentCityId, setCurrentCityId] = useState<string>(selectedCityId || 'tehran');
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [manualRotation, setManualRotation] = useState<number>(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(false);
  const [sensorMode, setSensorMode] = useState<'manual' | 'true_north' | 'magnetic'>('manual');
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);

  useEffect(() => {
    if (selectedCityId) {
      setCurrentCityId(selectedCityId);
    }
  }, [selectedCityId]);

  const lastHeadingRef = useRef<number>(0);
  const hasAbsoluteRef = useRef<boolean>(false);

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

  // Orientation Sensor Listener with EMA Smoothing and Screen Angle compensation
  useEffect(() => {
    if (!isOpen) return;

    hasAbsoluteRef.current = false;

    const processHeading = (rawHeading: number, isDirectCompassHeading: boolean) => {
      // Screen orientation compensation (0, 90, 180, 270)
      // Note: iOS webkitCompassHeading is ALREADY oriented to the screen's top.
      // Standard W3C alpha is relative to the device's portrait frame, so screenAngle is added only for alpha.
      const screenAngle = getScreenOrientationAngle();
      const adjustedHeading = computeAdjustedHeading(rawHeading, isDirectCompassHeading, screenAngle);
      if (isNaN(adjustedHeading)) return;

      // Exponential Moving Average (EMA) smoothing using shortest angular distance
      const prev = lastHeadingRef.current;
      const smoothed = smoothHeadingEMA(prev, adjustedHeading, 0.25);

      lastHeadingRef.current = smoothed;
      setSensorAvailable(true);
      setDeviceHeading(Math.round(smoothed));
    };

    const handleAbsoluteOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
        hasAbsoluteRef.current = true;
        setSensorMode('true_north');
        // alpha goes counter-clockwise 0..360, so clockwise heading is (360 - alpha) % 360
        const rawHeading = (360 - e.alpha) % 360;
        processHeading(rawHeading, false);
      }
    };

    const handleStandardOrientation = (e: DeviceOrientationEvent) => {
      // iOS WebKit compass heading (direct magnetic/true heading 0..360 relative to screen top)
      if (typeof (e as any).webkitCompassHeading === 'number' && !isNaN((e as any).webkitCompassHeading)) {
        setSensorMode('magnetic');
        processHeading((e as any).webkitCompassHeading, true);
        return;
      }

      // If absolute orientation event is active and delivering data, ignore redundant relative event to prevent jitter
      if (hasAbsoluteRef.current) {
        return;
      }

      // Android / standard W3C fallback
      if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
        setSensorMode('magnetic');
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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const city = IRANIAN_CITIES.find(c => c.id === currentCityId) || IRANIAN_CITIES[0];
  const qiblaAngle = calculateQiblaAngle(city.lat, city.lng);
  const distanceToMecca = calculateDistanceToMeccaKm(city.lat, city.lng);

  // Compass Bearing is the clockwise angle of the top of the phone from True North (0 = facing North)
  const currentHeading = sensorAvailable ? deviceHeading : manualRotation;

  // Relative angle to Qibla from the top of the device (0° = facing directly towards Qibla)
  const rawDiff = calculateRelativeQiblaAngle(qiblaAngle, currentHeading);
  const relativeDiff = rawDiff > 180 ? rawDiff - 360 : rawDiff; // -180 to +180
  const isFacingQibla = Math.abs(relativeDiff) <= 5;

  const handleSelectCity = (newCityId: string) => {
    setCurrentCityId(newCityId);
    onCityChange?.(newCityId);
  };

  return (
    <div 
      id="qibla-modal-overlay"
      className="fixed inset-0 z-[75] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="qibla-modal-content"
        className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 relative my-auto text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#123C35] text-[#C49A5A] shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>قبله‌نما و جهت‌یاب کعبه</span>
                {isFacingQibla && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>رو به قبله</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">جهت دقیق کعبه به افق {city.name} و موقعیت شمال</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* City Selector */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-[#F7F4EC] rounded-2xl border border-[#D9DED9] text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <MapPin className="w-4 h-4 text-[#123C35]" />
            <span className="font-semibold">شهر:</span>
            <span className="font-bold text-slate-900">{city.name}</span>
          </div>
          <select
            value={currentCityId}
            onChange={(e) => handleSelectCity(e.target.value)}
            className="bg-white border border-[#D9DED9] rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-[#123C35] focus:outline-none"
          >
            {IRANIAN_CITIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.province})
              </option>
            ))}
          </select>
        </div>

        {/* Info stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] text-slate-500 block">زاویه قبله از شمال</span>
            <span className="font-bold text-xs sm:text-sm text-[#123C35] block mt-0.5 font-mono">
              {toPersianDigits(qiblaAngle)}°
            </span>
            <span className="text-[9px] text-slate-400 block">جنوب‌غربی</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] text-slate-500 block">جهت روبروی گوشی</span>
            <span className="font-bold text-xs sm:text-sm text-slate-800 block mt-0.5 font-mono">
              {toPersianDigits(currentHeading)}°
            </span>
            <span className="text-[9px] text-slate-400 block">از شمال ساعت‌گرد</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] text-slate-500 block">فاصله مستقیم</span>
            <span className="font-bold text-xs sm:text-sm text-slate-800 block mt-0.5">
              {toPersianDigits(distanceToMecca.toLocaleString())}
            </span>
            <span className="text-[9px] text-slate-400 block">کیلومتر تا مکه</span>
          </div>
        </div>

        {/* Guidance Banner */}
        <div className={`p-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition-colors ${
          isFacingQibla
            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            : 'bg-amber-50 text-amber-900 border border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {isFacingQibla ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <RotateCw className="w-4 h-4 text-amber-700 shrink-0" />
            )}
            <span>
              {isFacingQibla
                ? 'آفرین! شما اکنون دقیقاً رو به قبله قرار دارید.'
                : relativeDiff > 0
                ? `برای رو به قبله شدن، ${toPersianDigits(Math.abs(Math.round(relativeDiff)))}° به راست بچرخید`
                : `برای رو به قبله شدن، ${toPersianDigits(Math.abs(Math.round(relativeDiff)))}° به چپ بچرخید`}
            </span>
          </div>
        </div>

        {/* Compass Dial Graphic */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center p-3 my-1">
          {/* Top Sight / User Aiming Marker (Fixed at 12 o'clock) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
            <div className="w-2.5 h-2.5 bg-emerald-600 rotate-45 border border-white shadow-xs"></div>
            <div className="w-0.5 h-3 bg-emerald-600"></div>
            <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1 rounded-sm mt-0.5 shadow-2xs">
              روبرو
            </span>
          </div>

          {/* Rotating Compass Rose Dial (rotates with -currentHeading so North points to True North) */}
          <div 
            className={`relative w-full h-full rounded-full border-4 transition-transform duration-200 flex items-center justify-center shadow-lg select-none ${
              isFacingQibla ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-300 bg-slate-50'
            }`}
            style={{ transform: `rotate(${-currentHeading}deg)` }}
          >
            {/* Cardinal Directions (Fixed on the Rose) */}
            <div className="absolute top-2.5 flex flex-col items-center">
              <span className="font-black text-xs text-rose-600">شمال</span>
              <span className="font-mono text-[9px] font-bold text-rose-600">N (0°)</span>
            </div>
            <div className="absolute bottom-2.5 flex flex-col items-center">
              <span className="font-mono text-[9px] font-bold text-slate-500">S (180°)</span>
              <span className="font-bold text-xs text-slate-700">جنوب</span>
            </div>
            <div className="absolute right-2.5 flex flex-col items-center">
              <span className="font-bold text-xs text-slate-700">شرق</span>
              <span className="font-mono text-[9px] font-bold text-slate-500">E (90°)</span>
            </div>
            <div className="absolute left-2.5 flex flex-col items-center">
              <span className="font-bold text-xs text-slate-700">غرب</span>
              <span className="font-mono text-[9px] font-bold text-slate-500">W (270°)</span>
            </div>

            {/* Degree Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <div 
                key={deg} 
                className="absolute w-full h-full pointer-events-none flex justify-center"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <div className={`w-0.5 ${deg % 90 === 0 ? 'h-3.5 bg-slate-700' : 'h-2 bg-slate-400'}`}></div>
              </div>
            ))}

            {/* Classic Magnetic Needle (Red for North, Slate for South) */}
            <div className="absolute w-2 h-full flex flex-col items-center justify-between py-10 pointer-events-none">
              {/* North Needle */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[40px] border-b-rose-600 shadow-sm"></div>
              {/* South Needle */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[40px] border-t-slate-700 shadow-sm"></div>
            </div>

            {/* Qibla (Kaaba) Direction Arrow (Fixed at qiblaAngle on the Rose) */}
            <div 
              className="absolute w-full h-full pointer-events-none flex items-center justify-center"
              style={{ transform: `rotate(${qiblaAngle}deg)` }}
            >
              <div className="h-full flex flex-col items-center justify-start pt-2">
                <div className={`px-2 py-1 rounded-xl shadow-md border-2 border-white flex items-center gap-1 transition-transform ${
                  isFacingQibla ? 'bg-emerald-600 text-white scale-110' : 'bg-[#123C35] text-[#C49A5A]'
                }`}>
                  <span className="text-[10px] font-black">🕋 کعبه ({toPersianDigits(Math.round(qiblaAngle))}°)</span>
                </div>
                <div className={`w-1.5 h-16 rounded-full mt-0.5 shadow-sm ${
                  isFacingQibla ? 'bg-emerald-500' : 'bg-[#123C35]'
                }`}></div>
              </div>
            </div>

            {/* Center Pivot */}
            <div className={`z-10 w-11 h-11 rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white transition-colors ${
              isFacingQibla ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
            }`}>
              <span className="text-[10px] font-bold font-mono">
                {toPersianDigits(currentHeading)}°
              </span>
            </div>
          </div>
        </div>

        {/* Manual Slider & Sensor Status */}
        {!sensorAvailable ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">تنظیم دستی جهت گوشی نسبت به شمال:</span>
              <span className="font-bold font-mono text-[#123C35]">{toPersianDigits(manualRotation)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={manualRotation}
              onChange={(e) => setManualRotation(parseInt(e.target.value))}
              className="w-full accent-[#123C35] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>شمال (۰°)</span>
              <span>شرق (۹۰°)</span>
              <span>جنوب (۱۸۰°)</span>
              <span>غرب (۲۷۰°)</span>
            </div>
            {typeof (DeviceOrientationEvent as any)?.requestPermission === 'function' && !permissionRequested && (
              <button
                onClick={requestSensorPermission}
                className="w-full mt-1 py-1.5 bg-[#123C35] hover:bg-[#0C2E29] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>فعال‌سازی سنسور قطب‌نمای گوشی</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 text-center font-medium flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {sensorMode === 'true_north' 
                  ? 'سنسور قطب‌نما (شمال واقعی) فعال است؛ گوشی را بچرخانید تا نشانگر کعبه روی نشانه «روبرو» قرار گیرد.' 
                  : 'سنسور قطب‌نما (مغناطیسی) فعال است؛ گوشی را بچرخانید تا نشانگر کعبه روی نشانه «روبرو» قرار گیرد.'}
              </span>
            </div>
            {sensorMode === 'magnetic' && (
              <span className="text-[10px] text-emerald-700/80">
                جهت کالیبراسیون دقیق‌تر، گوشی را به شکل عدد ۸ لاتین (∞) در هوا حرکت دهید.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
