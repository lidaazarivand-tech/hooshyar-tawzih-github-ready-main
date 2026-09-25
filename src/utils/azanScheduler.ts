import { CalendarSettings, FullDateInfo, GregorianDate } from '../types/calendar';
import { calculatePrayerTimes, IRANIAN_CITIES, getNextPrayerInfo } from './prayerTimes';
import { azanAudioEngine, AZAN_RECITERS } from './azanAudioEngine';
import { gregorianToJalali } from './jalali';
import { getFullDateInfo } from './dateInfo';
import { 
  showAzanAlertNotification, 
  showDailyDateNotification, 
  isCapacitorNative, 
  hasNotificationPermission,
  AZAN_ALARM_CHANNEL_ID
} from './notificationService';
import { LocalNotifications } from '@capacitor/local-notifications';
import { 
  scheduleNativeAzanAlarms, 
  cancelAllNativeAzanAlarms, 
  NativeAzanAlarmItem 
} from './nativeAzan';
import {
  getLastDailyNotificationDay,
  setLastDailyNotificationDay
} from './storage';

// Deterministic ID scheme for Azan Alarms
const BASE_NATIVE_AZAN_ALARM_ID = 40000;
const BASE_AZAN_NOTIFICATION_ID = 30000;
const MAX_DAYS_AHEAD = 10;
const ALL_AZAN_NOTIFICATION_IDS: number[] = [];
for (let d = 0; d <= 31; d++) {
  ALL_AZAN_NOTIFICATION_IDS.push(
    BASE_AZAN_NOTIFICATION_ID + (d * 10) + 1,
    BASE_AZAN_NOTIFICATION_ID + (d * 10) + 2,
    BASE_AZAN_NOTIFICATION_ID + (d * 10) + 3
  );
}

class AzanScheduler {
  private intervalId: number | null = null;
  private lastTriggeredKey: string = '';
  private lastDateNotificationDay: string = getLastDailyNotificationDay();
  private lastScheduledDay: string = '';
  private lastScheduleSignature: string = '';
  private lastScheduleTimestamp: number = 0;
  private isSchedulingInProgress: boolean = false;
  private pendingSchedulingRequest: { settings: CalendarSettings; todayInfo: FullDateInfo; force?: boolean } | null = null;

  /**
   * Schedules offline exact Azan alarms natively in Android AlarmManager.
   * Cancels any previously scheduled alarms first to avoid duplicate playback.
   */
  public async scheduleNativeAlarms(settings: CalendarSettings, _todayInfo: FullDateInfo, force: boolean = false) {
    if (!isCapacitorNative()) return;

    if (this.isSchedulingInProgress) {
      this.pendingSchedulingRequest = { settings, todayInfo: _todayInfo, force };
      return;
    }

    const city = IRANIAN_CITIES.find(c => c.id === settings.selectedCityId) || IRANIAN_CITIES[0];
    const now = new Date();
    const cityOffsetMillis = Math.round(city.timezone * 3600000);
    const cityNow = new Date(now.getTime() + cityOffsetMillis);
    const baseCityYear = cityNow.getUTCFullYear();
    const baseCityMonth = cityNow.getUTCMonth() + 1;
    const baseCityDate = cityNow.getUTCDate();
    const signature = `${settings.autoAzanEnabled}_${settings.selectedCityId}_${settings.azanReciter}_${settings.azanAlarmFajr !== false}_${settings.azanAlarmDhuhr !== false}_${settings.azanAlarmMaghrib !== false}_${baseCityYear}_${baseCityMonth}_${baseCityDate}`;

    // Skip redundant calls if settings and date are identical within last 30 seconds (unless forced)
    if (!force && this.lastScheduleSignature === signature && Date.now() - this.lastScheduleTimestamp < 30000) {
      return;
    }

    this.isSchedulingInProgress = true;
    try {
      // 1. Cancel previous pending azan notifications in LocalNotifications
      // to avoid double audio notifications with LocalNotification chimes
      try {
        await LocalNotifications.cancel({
          notifications: ALL_AZAN_NOTIFICATION_IDS.map(id => ({ id }))
        });
      } catch (e) {
        // Safe fallback
      }

      // If auto azan is disabled by user, cancel all native exact alarms
      if (settings.autoAzanEnabled === false) {
        await cancelAllNativeAzanAlarms();
        this.lastScheduleSignature = signature;
        this.lastScheduleTimestamp = Date.now();
        return;
      }

      const city = IRANIAN_CITIES.find(c => c.id === settings.selectedCityId) || IRANIAN_CITIES[0];
      const reciterId = settings.azanReciter || 'moazenzadeh';
      const reciter = AZAN_RECITERS.find(r => r.id === reciterId) || AZAN_RECITERS[0];

      const now = new Date();
      const nativeAlarmsToSchedule: NativeAzanAlarmItem[] = [];

      // Calculate city's current local date based on city timezone
      const cityOffsetMillis = Math.round(city.timezone * 3600000);
      const cityNow = new Date(now.getTime() + cityOffsetMillis);
      const baseCityYear = cityNow.getUTCFullYear();
      const baseCityMonth = cityNow.getUTCMonth();
      const baseCityDate = cityNow.getUTCDate();

      // Calculate for today and the next 10 days for full offline reliability
      for (let dayOffset = 0; dayOffset < MAX_DAYS_AHEAD; dayOffset++) {
        const targetCityUtc = new Date(Date.UTC(baseCityYear, baseCityMonth, baseCityDate + dayOffset, 0, 0, 0, 0));
        const dayOfMonth = targetCityUtc.getUTCDate(); // 1 to 31

        const gregorianTarget = {
          gy: targetCityUtc.getUTCFullYear(),
          gm: targetCityUtc.getUTCMonth() + 1,
          gd: targetCityUtc.getUTCDate()
        };

        const prayers = calculatePrayerTimes(gregorianTarget, city);

        // Deterministic ID scheme: BASE_ALARM_ID + (dayOfMonth * 4) + prayerIndex
        // Generates immutable IDs (40005 to 40127) strictly tied to calendar day, preventing shifts
        const prayerItems = [
          {
            key: 'fajr' as const,
            name: 'اذان صبح',
            rawMin: prayers.rawMinutes.fajr,
            enabled: settings.azanAlarmFajr !== false,
            id: BASE_NATIVE_AZAN_ALARM_ID + (dayOfMonth * 4) + 1
          },
          {
            key: 'dhuhr' as const,
            name: 'اذان ظهر',
            rawMin: prayers.rawMinutes.dhuhr,
            enabled: settings.azanAlarmDhuhr !== false,
            id: BASE_NATIVE_AZAN_ALARM_ID + (dayOfMonth * 4) + 2
          },
          {
            key: 'maghrib' as const,
            name: 'اذان مغرب',
            rawMin: prayers.rawMinutes.maghrib,
            enabled: settings.azanAlarmMaghrib !== false,
            id: BASE_NATIVE_AZAN_ALARM_ID + (dayOfMonth * 4) + 3
          }
        ];

        for (const item of prayerItems) {
          if (!item.enabled) continue;
          
          const hours = Math.floor(item.rawMin / 60);
          const minutes = item.rawMin % 60;
          // Calculate UTC timestamp consistently using the city's timezone offset
          const scheduleAtMillis = Date.UTC(
            gregorianTarget.gy,
            gregorianTarget.gm - 1,
            gregorianTarget.gd,
            hours,
            minutes,
            0,
            0
          ) - cityOffsetMillis;

          if (scheduleAtMillis > now.getTime()) {
            nativeAlarmsToSchedule.push({
              id: item.id,
              timeMillis: scheduleAtMillis,
              prayerKey: item.key,
              prayerName: item.name,
              cityName: city.name,
              reciterId: reciter.id
            });
          }
        }
      }

      if (nativeAlarmsToSchedule.length > 0) {
        const result = await scheduleNativeAzanAlarms(
          nativeAlarmsToSchedule,
          reciter.id,
          city.name,
          city.lat,
          city.lng,
          city.timezone,
          settings.azanAlarmFajr !== false,
          settings.azanAlarmDhuhr !== false,
          settings.azanAlarmMaghrib !== false,
          true
        );
        if (result.success && (result.scheduleMode === 'INEXACT_FALLBACK' || result.exact === false)) {
          console.warn('Native Azan scheduled with setAndAllowWhileIdle fallback (SCHEDULE_EXACT_ALARM not granted).');
        } else if (!result.success) {
          console.error('Native Azan scheduling failed.');
        }
      } else {
        // If nativeAlarmsToSchedule is empty (e.g. all 3 prayer switches disabled),
        // update preferences safely in Android without resetting autoAzanEnabled to false.
        await scheduleNativeAzanAlarms(
          [],
          reciter.id,
          city.name,
          city.lat,
          city.lng,
          city.timezone,
          settings.azanAlarmFajr !== false,
          settings.azanAlarmDhuhr !== false,
          settings.azanAlarmMaghrib !== false,
          true
        );
      }

      this.lastScheduleSignature = signature;
      this.lastScheduleTimestamp = Date.now();
    } catch (e) {
      console.warn('Error scheduling native azan alarms:', e);
    } finally {
      this.isSchedulingInProgress = false;
      if (this.pendingSchedulingRequest) {
        const next = this.pendingSchedulingRequest;
        this.pendingSchedulingRequest = null;
        setTimeout(() => {
          this.scheduleNativeAlarms(next.settings, next.todayInfo, next.force);
        }, 50);
      }
    }
  }

  /**
   * Starts in-app foreground timer to play audio when app is open and handle daily notification updates.
   */
  public start(
    getSettings: () => CalendarSettings,
    getTodayInfo: () => FullDateInfo
  ) {
    if (typeof window === 'undefined') return;
    this.lastDateNotificationDay = getLastDailyNotificationDay();
    this.stop();

    // Initial schedule
    const initialSettings = getSettings();
    const initialTodayInfo = getTodayInfo();
    this.scheduleNativeAlarms(initialSettings, initialTodayInfo);

    const check = async () => {
      try {
        const settings = getSettings();
        const todayInfo = getTodayInfo();
        const city = IRANIAN_CITIES.find(c => c.id === settings.selectedCityId) || IRANIAN_CITIES[0];
        
        const now = new Date();
        const cityOffsetMillis = Math.round(city.timezone * 3600000);
        const cityNow = new Date(now.getTime() + cityOffsetMillis);
        const currentTotalSeconds = (
          cityNow.getUTCHours() * 60 + cityNow.getUTCMinutes()
        ) * 60 + cityNow.getUTCSeconds();
        const cityGregorian: GregorianDate = {
          gy: cityNow.getUTCFullYear(),
          gm: cityNow.getUTCMonth() + 1,
          gd: cityNow.getUTCDate()
        };
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const currentDateKey = `${cityGregorian.gy}-${pad(cityGregorian.gm)}-${pad(cityGregorian.gd)}`;
        const dateKey = `${cityGregorian.gy}-${cityGregorian.gm}-${cityGregorian.gd}`;

        // 1. Check Date Turnover for automatic Azan rescheduling (Independent of dailyNotificationEnabled!)
        if (this.lastScheduledDay !== currentDateKey) {
          this.lastScheduledDay = currentDateKey;
          this.scheduleNativeAlarms(settings, todayInfo, false);
        }

        const prayers = calculatePrayerTimes(cityGregorian, city);

        // 2. Check Daily Notification once a day
        if (settings.dailyNotificationEnabled !== false && this.lastDateNotificationDay !== currentDateKey) {
          const cityJalali = gregorianToJalali(cityGregorian.gy, cityGregorian.gm, cityGregorian.gd);
          const cityTodayInfo = getFullDateInfo(cityJalali.jy, cityJalali.jm, cityJalali.jd, settings.hijriAdjustment || 0);
          const next = getNextPrayerInfo(prayers, now, city.timezone);
          const scheduled = await showDailyDateNotification(cityTodayInfo, next);
          if (scheduled) {
            this.lastDateNotificationDay = currentDateKey;
            setLastDailyNotificationDay(currentDateKey);
          }
        }

        // 3. Check Prayer Times for Foreground Playback
        if (settings.autoAzanEnabled === false) {
          return;
        }
        
        const prayerChecks = [
          {
            key: 'fajr',
            name: 'اذان صبح',
            rawMin: prayers.rawMinutes.fajr,
            enabled: settings.azanAlarmFajr !== false
          },
          {
            key: 'dhuhr',
            name: 'اذان ظهر',
            rawMin: prayers.rawMinutes.dhuhr,
            enabled: settings.azanAlarmDhuhr !== false
          },
          {
            key: 'maghrib',
            name: 'اذان مغرب',
            rawMin: prayers.rawMinutes.maghrib,
            enabled: settings.azanAlarmMaghrib !== false
          }
        ];

        for (const p of prayerChecks) {
          if (!p.enabled) continue;
          const prayerSecond = p.rawMin * 60;
          const isWithinTriggerWindow =
            currentTotalSeconds >= prayerSecond &&
            currentTotalSeconds < prayerSecond + 20;
          if (isWithinTriggerWindow) {
            const triggerKey = `${dateKey}_${p.key}_${p.rawMin}`;
            if (this.lastTriggeredKey !== triggerKey) {
              this.lastTriggeredKey = triggerKey;
              
              const reciterId = settings.azanReciter || 'moazenzadeh';
              const reciter = AZAN_RECITERS.find(r => r.id === reciterId) || AZAN_RECITERS[0];
              
              // On Native Android, Native AlarmManager and AzanPlaybackService handle playback.
              // We only trigger HTML5 Web Audio and browser notifications when running on Web / PWA.
              if (!isCapacitorNative()) {
                azanAudioEngine.play(reciterId, 0.9, p.name, city.name);
                showAzanAlertNotification(p.name, city.name, reciter.name);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Azan scheduler foreground check error:', e);
      }
    };

    // Run immediate check and then every 10 seconds
    check();
    this.intervalId = window.setInterval(check, 10000);
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const azanScheduler = new AzanScheduler();
