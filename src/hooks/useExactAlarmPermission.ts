import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  checkExactAlarmPermission, 
  openExactAlarmSettings, 
  isNativeAzanAvailable 
} from '../utils/nativeAzan';
import { isCapacitorNative } from '../utils/notificationService';
import { App as CapacitorApp } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';

export interface UseExactAlarmPermissionResult {
  isNativeAndroid: boolean;
  isExactAlarmGranted: boolean;
  isChecking: boolean;
  openSettings: () => Promise<boolean>;
  recheck: () => Promise<boolean>;
}

/**
 * Hook to monitor and interact with Android 12+ (API 31+) Exact Alarm permissions.
 * Re-checks automatically when user returns to the app from background or system settings.
 */
export function useExactAlarmPermission(onPermissionGranted?: () => void): UseExactAlarmPermissionResult {
  const isNative = isCapacitorNative() && isNativeAzanAvailable();
  const [isExactAlarmGranted, setIsExactAlarmGranted] = useState<boolean>(!isNative);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const previousStatusRef = useRef<boolean | null>(null);
  const onGrantedRef = useRef(onPermissionGranted);

  useEffect(() => {
    onGrantedRef.current = onPermissionGranted;
  }, [onPermissionGranted]);

  const check = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setIsExactAlarmGranted(true);
      return true;
    }

    setIsChecking(true);
    try {
      const canExact = await checkExactAlarmPermission();
      setIsExactAlarmGranted(canExact);

      // If capability transitioned from false to true, notify listeners
      if (previousStatusRef.current === false && canExact) {
        onGrantedRef.current?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('exact-alarm-permission-granted'));
        }
      }
      previousStatusRef.current = canExact;
      return canExact;
    } catch {
      setIsExactAlarmGranted(false);
      previousStatusRef.current = false;
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [isNative]);

  const openSettings = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    try {
      return await openExactAlarmSettings();
    } catch {
      return false;
    }
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    // 1. Initial check
    check();

    // 2. Recheck when window gains focus or document becomes visible (user returns from settings)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Recheck on Capacitor App resume
    let appStateHandle: PluginListenerHandle | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        check();
      }
    }).then(h => {
      appStateHandle = h;
    });

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (appStateHandle && appStateHandle.remove) {
        appStateHandle.remove();
      }
    };
  }, [isNative, check]);

  return {
    isNativeAndroid: isNative,
    isExactAlarmGranted,
    isChecking,
    openSettings,
    recheck: check
  };
}
