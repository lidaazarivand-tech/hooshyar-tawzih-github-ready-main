import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface NativeAzanAlarmItem {
  id: number;
  timeMillis: number;
  prayerKey: 'fajr' | 'dhuhr' | 'maghrib';
  prayerName: string;
  cityName: string;
  reciterId: string;
}

export interface NativeAzanPlaybackState {
  isPlaying: boolean;
  prayerName: string;
  reciterId: string;
}

export interface NativeAzanPluginInterface {
  scheduleAlarms(options: {
    alarms: NativeAzanAlarmItem[];
    reciterId: string;
    cityName: string;
    latitude?: number;
    longitude?: number;
    timezone?: number;
    fajrEnabled?: boolean;
    dhuhrEnabled?: boolean;
    maghribEnabled?: boolean;
    autoAzanEnabled?: boolean;
  }): Promise<{ success: boolean; count: number; exact?: boolean; scheduleMode?: 'EXACT' | 'INEXACT_FALLBACK' | 'DISABLED' | 'FAILED' }>;
  
  cancelAllAlarms(): Promise<{ success: boolean }>;
  
  stopPlayback(): Promise<{ success: boolean }>;

  pickReminderSound?(): Promise<{ success: boolean; uri?: string }>;
  
  isPlaybackActive(): Promise<{
    isPlaying: boolean;
    prayerName?: string;
    reciterId?: string;
  }>;

  canScheduleExactAlarms?(): Promise<{ canExact: boolean }>;
  openExactAlarmSettings?(): Promise<{ success: boolean }>;
  checkLaunchNotification?(): Promise<{ wasLaunchedFromAzan: boolean; prayerName?: string }>;

  addListener?(
    eventName: 'playbackStateChanged' | 'azanNotificationOpened',
    listenerFunc: (data: any) => void
  ): Promise<PluginListenerHandle>;
}

export const NativeAzan = registerPlugin<NativeAzanPluginInterface>('NativeAzan');

/**
 * Checks if running on native Android with NativeAzan plugin available.
 */
export const isNativeAzanAvailable = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
};

/**
 * Schedules alarms natively in Android AlarmManager.
 */
export const scheduleNativeAzanAlarms = async (
  alarms: NativeAzanAlarmItem[],
  reciterId: string,
  cityName: string,
  latitude?: number,
  longitude?: number,
  timezone?: number,
  fajrEnabled?: boolean,
  dhuhrEnabled?: boolean,
  maghribEnabled?: boolean,
  autoAzanEnabled?: boolean
): Promise<{ success: boolean; count: number; exact?: boolean; scheduleMode?: 'EXACT' | 'INEXACT_FALLBACK' | 'DISABLED' | 'FAILED' }> => {
  if (!isNativeAzanAvailable()) {
    return { success: false, count: 0, scheduleMode: 'FAILED' };
  }

  try {
    const res = await NativeAzan.scheduleAlarms({
      alarms,
      reciterId,
      cityName,
      latitude,
      longitude,
      timezone,
      fajrEnabled,
      dhuhrEnabled,
      maghribEnabled,
      autoAzanEnabled,
    });
    return {
      success: res.success,
      count: res.count,
      exact: res.exact,
      scheduleMode: res.scheduleMode || (res.exact ? 'EXACT' : 'INEXACT_FALLBACK')
    };
  } catch (err) {
    console.warn('NativeAzan scheduleAlarms failed:', err);
    return { success: false, count: 0, scheduleMode: 'FAILED' };
  }
};

/**
 * Cancels all scheduled Azan alarms in Android AlarmManager.
 */
export const cancelAllNativeAzanAlarms = async (): Promise<boolean> => {
  if (!isNativeAzanAvailable()) {
    return false;
  }

  try {
    const res = await NativeAzan.cancelAllAlarms();
    return res.success;
  } catch (err) {
    console.warn('NativeAzan cancelAllAlarms failed:', err);
    return false;
  }
};

/**
 * Immediately stops any playing native Azan audio service.
 */
export const stopNativeAzanPlayback = async (): Promise<boolean> => {
  if (!isNativeAzanAvailable()) {
    return false;
  }

  try {
    const res = await NativeAzan.stopPlayback();
    return res.success;
  } catch (err) {
    console.warn('NativeAzan stopPlayback failed:', err);
    return false;
  }
};

export const pickNativeReminderSound = async (): Promise<boolean> => {
  if (!isNativeAzanAvailable() || !NativeAzan.pickReminderSound) return false;
  try {
    const result = await NativeAzan.pickReminderSound();
    return result.success;
  } catch (err) {
    console.warn('NativeAzan reminder sound picker failed:', err);
    return false;
  }
};

/**
 * Checks if native Azan foreground service is actively playing.
 */
export const checkNativeAzanPlaying = async (): Promise<{
  isPlaying: boolean;
  prayerName?: string;
  reciterId?: string;
}> => {
  if (!isNativeAzanAvailable()) {
    return { isPlaying: false };
  }

  try {
    return await NativeAzan.isPlaybackActive();
  } catch (err) {
    return { isPlaying: false };
  }
};

/**
 * Listens to playback state change events emitted by native AzanPlaybackService.
 */
export const addNativeAzanPlaybackListener = async (
  listener: (state: NativeAzanPlaybackState) => void
): Promise<{ remove: () => Promise<void> }> => {
  if (!isNativeAzanAvailable() || !NativeAzan.addListener) {
    return { remove: async () => {} };
  }

  try {
    const handle = await NativeAzan.addListener('playbackStateChanged', listener);
    return handle;
  } catch (err) {
    console.warn('Failed to add NativeAzan playbackStateChanged listener:', err);
    return { remove: async () => {} };
  }
};

/**
 * Checks whether exact alarms can be scheduled on Android 12+ (API 31+).
 */
export const checkExactAlarmPermission = async (): Promise<boolean> => {
  if (!isNativeAzanAvailable()) {
    return true;
  }
  try {
    if (NativeAzan.canScheduleExactAlarms) {
      const res = await NativeAzan.canScheduleExactAlarms();
      return res?.canExact ?? true;
    }
    return true;
  } catch {
    return true;
  }
};

/**
 * Opens system settings page for exact alarms (SCHEDULE_EXACT_ALARM).
 */
export const openExactAlarmSettings = async (): Promise<boolean> => {
  if (!isNativeAzanAvailable()) {
    return false;
  }
  try {
    if (NativeAzan.openExactAlarmSettings) {
      const res = await NativeAzan.openExactAlarmSettings();
      return res?.success ?? false;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Checks if the app was launched by the user tapping a native Azan notification.
 */
export const checkAzanLaunchNotification = async (): Promise<{ wasLaunchedFromAzan: boolean; prayerName?: string }> => {
  if (!isNativeAzanAvailable() || !NativeAzan.checkLaunchNotification) {
    return { wasLaunchedFromAzan: false };
  }
  try {
    return await NativeAzan.checkLaunchNotification();
  } catch {
    return { wasLaunchedFromAzan: false };
  }
};

/**
 * Subscribes to notification opened events while the app is in the background or active.
 */
export const addAzanNotificationOpenedListener = async (
  listener: (data: { prayerName?: string }) => void
): Promise<PluginListenerHandle | null> => {
  if (!isNativeAzanAvailable() || !NativeAzan.addListener) {
    return null;
  }
  try {
    return await NativeAzan.addListener('azanNotificationOpened', listener);
  } catch {
    return null;
  }
};
