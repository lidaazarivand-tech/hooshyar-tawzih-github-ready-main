import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { JalaliDate, GregorianDate, FullDateInfo } from '../types/calendar';
import { getTodayJalali, getTodayGregorian } from '../utils/jalali';
import { getFullDateInfo } from '../utils/dateInfo';
import { makeDateKey } from '../utils/persianNumber';

export interface UseTodayDateResult {
  todayJalali: JalaliDate;
  todayGregorian: GregorianDate;
  todayInfo: FullDateInfo;
  todayDateKey: string;
  refreshDate: () => void;
}

/**
 * Custom hook that tracks the current system date and automatically rolls over at midnight (00:00:00)
 * without requiring the user to refresh the page or restart the app.
 * Also reacts to app foreground/visibility change events.
 */
export function useTodayDate(hijriAdjustment: number = 0): UseTodayDateResult {
  const [currentJalali, setCurrentJalali] = useState<JalaliDate>(() => getTodayJalali());
  const [currentGregorian, setCurrentGregorian] = useState<GregorianDate>(() => getTodayGregorian());
  const timeoutRef = useRef<number | null>(null);

  const checkAndUpdateDate = useCallback(() => {
    const latestJalali = getTodayJalali();
    const latestGregorian = getTodayGregorian();

    setCurrentJalali(prev => {
      if (prev.jy !== latestJalali.jy || prev.jm !== latestJalali.jm || prev.jd !== latestJalali.jd) {
        return latestJalali;
      }
      return prev;
    });

    setCurrentGregorian(prev => {
      if (prev.gy !== latestGregorian.gy || prev.gm !== latestGregorian.gm || prev.gd !== latestGregorian.gd) {
        return latestGregorian;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const scheduleNextMidnight = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      const now = new Date();
      // Next midnight: tomorrow at 00:00:01
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

      timeoutRef.current = window.setTimeout(() => {
        checkAndUpdateDate();
        scheduleNextMidnight();
      }, msUntilMidnight);
    };

    scheduleNextMidnight();

    // Recheck on visibility change / window focus (e.g., when device wakes from sleep)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndUpdateDate();
        scheduleNextMidnight();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [checkAndUpdateDate]);

  const todayInfo = useMemo(() => {
    return getFullDateInfo(
      currentJalali.jy,
      currentJalali.jm,
      currentJalali.jd,
      hijriAdjustment
    );
  }, [currentJalali.jy, currentJalali.jm, currentJalali.jd, hijriAdjustment]);

  const todayDateKey = useMemo(() => {
    return makeDateKey(currentJalali.jy, currentJalali.jm, currentJalali.jd);
  }, [currentJalali.jy, currentJalali.jm, currentJalali.jd]);

  return {
    todayJalali: currentJalali,
    todayGregorian: currentGregorian,
    todayInfo,
    todayDateKey,
    refreshDate: checkAndUpdateDate
  };
}
