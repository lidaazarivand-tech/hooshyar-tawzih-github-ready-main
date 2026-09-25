import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { FullDateInfo, UserReminder } from '../types/calendar';
import { NextPrayerInfo } from './prayerTimes';
import { toPersianDigits, toEnglishDigits, normalizeDateKey, PERSIAN_MONTH_NAMES, GREGORIAN_MONTH_NAMES, HIJRI_MONTH_NAMES } from './persianNumber';
import { jalaliToGregorian, isValidJalali, getJalaliMonthLength, gregorianToJalali } from './jalali';
import { isNativeAzanAvailable } from './nativeAzan';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'granted' | 'denied' | 'prompt' | 'unsupported';
}

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkNotificationSupport(): Promise<NotificationStatus> {
  if (isCapacitorNative()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      return {
        supported: true,
        permission: perm.display === 'granted' ? 'granted' : (perm.display === 'denied' ? 'denied' : 'prompt')
      };
    } catch (e) {
      console.warn('Capacitor checkPermissions error:', e);
      return { supported: false, permission: 'unsupported' };
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      return perm.display === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.warn('Capacitor requestPermissions error:', e);
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (e) {
    console.warn('Error requesting web notification permission:', e);
    return false;
  }
}

export const AZAN_ALARM_CHANNEL_ID = 'azan_alarms_channel_v4_private';
export const AZAN_ACTIVE_CHANNEL_ID = 'azan_active_channel_v2_private';
export const DAILY_CALENDAR_CHANNEL_ID = 'daily_calendar_channel_v2_private';
export const REMINDERS_CHANNEL_ID = 'reminders_channel_v2_private';

let isNotificationActionListenerAttached = false;

export async function initNotificationService() {
  if (isCapacitorNative()) {
    try {
      // 0. Remove obsolete/stale notification channels to prevent immutable sound bugs
      for (const id of [
        'azan_alarms_channel',
        'azan_alarms_channel_v2',
        'azan_alarms_channel_v3',
        'azan_active_channel',
        'daily_calendar_channel',
        'reminders_channel'
      ]) {
        try {
          await LocalNotifications.deleteChannel({ id });
        } catch {
          // Channel deletion not supported or channel did not exist.
        }
      }

      // 1. Create Azan Alarm Channel for Android 8+ (API 26+)
      try {
        await LocalNotifications.createChannel({
          id: AZAN_ALARM_CHANNEL_ID,
          name: 'هشدار و پخش اذان شرعی',
          description: 'اعلان‌ها و هشدارهای دقیق اوقات شرعی و پخش نوای اذان',
          importance: 5, // High
          visibility: 0,
          vibration: true
        });
      } catch (e) {
        console.warn('Failed to create Azan Alarm channel:', e);
      }

      // 2. Create Active Azan channel for foreground playback status (silent to not clash with playing audio)
      try {
        await LocalNotifications.createChannel({
          id: AZAN_ACTIVE_CHANNEL_ID,
          name: 'پخش اذان در برنامه',
          description: 'اعلان وضعیت پخش اذان در هنگام باز بودن برنامه',
          importance: 3, // Default
          visibility: 0,
          vibration: false
        });
      } catch (e) {
        console.warn('Failed to create Azan Active channel:', e);
      }

      // 3. Channel for Daily calendar info
      try {
        await LocalNotifications.createChannel({
          id: DAILY_CALENDAR_CHANNEL_ID,
          name: 'تقویم و تاریخ روز',
          description: 'نمایش روزانه تاریخ شمسی، قمری و میلادی در نوار اعلان',
          importance: 3, // Default
          visibility: 0,
          vibration: false
        });
      } catch (e) {
        console.warn('Failed to create Daily calendar channel:', e);
      }

      // 4. Channel for Reminders and Events
      try {
        await LocalNotifications.createChannel({
          id: REMINDERS_CHANNEL_ID,
          name: 'یادآوری‌ها و رویدادهای شخصی',
          description: 'اعلان سررسید چک، اقساط، تولد و مناسبت‌های شخصی',
          importance: 5, // High
          visibility: 0,
          vibration: true
        });
      } catch (e) {
        console.warn('Failed to create Reminders channel:', e);
      }

      if (!isNotificationActionListenerAttached) {
        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          const extra = notificationAction.notification.extra;
          if (extra && extra.prayerKey) {
            // Dispatch custom event to open the Azan modal in UI
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-azan-modal', { detail: extra }));
            }
          }
        });
        isNotificationActionListenerAttached = true;
      }
    } catch (e) {
      console.warn('Failed to init Capacitor local notification channels:', e);
    }
    return;
  }

  // Register Web Service Worker if available in browser
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'stop-azan') {
          import('./azanAudioEngine').then(({ azanAudioEngine }) => {
            azanAudioEngine.stop();
          });
        }
      });
    } catch {}
  }
}

export async function showDailyDateNotification(todayInfo: FullDateInfo, nextPrayer?: NextPrayerInfo | null): Promise<boolean> {
  const jalaliStr = `${todayInfo.dayOfWeekName} ${toPersianDigits(todayInfo.jalali.jd)} ${PERSIAN_MONTH_NAMES[todayInfo.jalali.jm - 1]} ${toPersianDigits(todayInfo.jalali.jy)}`;
  const gregorianStr = `${todayInfo.gregorian.gd} ${GREGORIAN_MONTH_NAMES[todayInfo.gregorian.gm - 1]} ${todayInfo.gregorian.gy}`;
  const hijriStr = `${toPersianDigits(todayInfo.hijri.hd)} ${HIJRI_MONTH_NAMES[todayInfo.hijri.hm - 1]} ${toPersianDigits(todayInfo.hijri.hy)}`;
  
  let prayerStr = '';
  if (nextPrayer) {
    prayerStr = ` | وقت شرعی بعدی: ${nextPrayer.name} (${toPersianDigits(nextPrayer.timeStr)})`;
  }

  const title = `🗓️ ${jalaliStr}`;
  const body = `☀️ میلادی: ${gregorianStr} | 🌙 قمری: ${hijriStr}${prayerStr}`;

  if (isCapacitorNative()) {
    try {
      const hasPerm = await hasNotificationPermission();
      if (!hasPerm) return false;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 10001,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            channelId: DAILY_CALENDAR_CHANNEL_ID,
            smallIcon: 'ic_stat_notification'
          }
        ]
      });
      return true;
    } catch (e) {
      console.warn('Native daily notification error:', e);
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const options = {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: 'daily-calendar-date',
      renotify: false,
      silent: true
    };
    new Notification(title, options as NotificationOptions);
    return true;
  } catch (err) {
    console.warn('Could not post daily notification:', err);
    return false;
  }
}

export async function showAzanAlertNotification(prayerName: string, cityName: string, reciterName: string) {
  // If native Android Azan is enabled, AzanPlaybackService manages its own persistent foreground notification with stop button
  if (isNativeAzanAvailable()) {
    return;
  }

  const title = `🕌 هنگام ${prayerName} به افق ${cityName}`;
  const body = `نوای ملکوتی اذان با صوت ${reciterName} در حال پخش است. برای توقف یا مدیریت روی برنامه ضربه بزنید.`;

  if (isCapacitorNative()) {
    try {
      const hasPerm = await hasNotificationPermission();
      if (!hasPerm) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 20001,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            channelId: AZAN_ACTIVE_CHANNEL_ID,
            smallIcon: 'ic_stat_notification'
          }
        ]
      });
    } catch (e) {
      console.warn('Native azan alert error:', e);
    }
    return;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const options = {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: 'azan-playback-alert',
      renotify: true,
      requireInteraction: true
    };
    new Notification(title, options as NotificationOptions);
  } catch (err) {
    console.warn('Could not post azan notification:', err);
  }
}

// Convert reminder id string to deterministic integer for Capacitor notification id
// Uses dedicated range 50000-89999 to guarantee complete separation from Native Azan AlarmManager (40000-40200)
// and Web/Capacitor Azan notifications (30000-30313)
export function getDeterministicReminderNotificationId(reminderId: string, usedIds?: Set<number>): number {
  let hash = 0;
  for (let i = 0; i < reminderId.length; i++) {
    hash = (hash << 5) - hash + reminderId.charCodeAt(i);
    hash |= 0;
  }
  let candidate = Math.abs(hash % 40000) + 50000;
  if (usedIds) {
    let attempts = 0;
    while (usedIds.has(candidate) && attempts < 40000) {
      candidate = 50000 + ((candidate - 50000 + 1) % 40000);
      attempts++;
    }
    usedIds.add(candidate);
  }
  return candidate;
}

/**
 * Synchronize and schedule native alarms for all user reminders.
 */
/**
 * Validates and parses reminder time string into hour and minute.
 * If time is omitted or empty, returns default { hour: 9, minute: 0 }.
 * If time is provided but invalid (e.g. 25:90, 12:99, -1:30), returns null.
 */
export function parseReminderTime(time?: string | null): { hour: number; minute: number } | null {
  if (time === undefined || time === null) {
    return { hour: 9, minute: 0 };
  }
  const trimmed = time.trim();
  if (trimmed === '') {
    return { hour: 9, minute: 0 };
  }
  const timeStr = toEnglishDigits(trimmed);
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    return null;
  }
  const [hStr, mStr] = parts.map(p => p.trim());
  if (!/^\d+$/.test(hStr) || !/^\d+$/.test(mStr)) {
    return null;
  }
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

export function isValidReminderTime(time?: string | null): boolean {
  return parseReminderTime(time) !== null;
}

export interface NextReminderSchedule {
  nextDate: Date;
}

/**
 * Accurately calculates the next occurrence Date for a reminder based on its recurrence rule:
 * - 'none' / undefined: One-time reminder. Returns original date if in future, else null.
 * - 'weekly': Recurs every 7 days from initial date. Returns closest upcoming occurrence > now.
 * - 'monthly': Recurs on the same day of each Jalali month. Handles month lengths (clamping 31 to 30/29)
 *   and advances to next Jalali month if this month's date is past.
 * - 'yearly': Recurs on the same month & day of each Jalali year. Handles leap years (Esfand 30 clamped to 29)
 *   and advances to next Jalali year if this year's date is past.
 */
export function calculateNextReminderDate(
  rem: UserReminder,
  nowDate: Date = new Date()
): NextReminderSchedule | null {
  const normKey = normalizeDateKey(rem.dateKey || '');
  const dateParts = normKey.split('-').map(Number);
  if (dateParts.length !== 3 || isNaN(dateParts[0]) || isNaN(dateParts[1]) || isNaN(dateParts[2])) {
    return null;
  }

  const jy = dateParts[0];
  const jm = dateParts[1];
  const jd = dateParts[2];
  if (!isValidJalali(jy, jm, jd)) return null;

  const parsedTime = parseReminderTime(rem.time);
  if (!parsedTime) return null;
  const { hour, minute } = parsedTime;

  const g = jalaliToGregorian(jy, jm, jd);
  const initialDate = new Date(g.gy, g.gm - 1, g.gd, hour, minute, 0, 0);
  const now = nowDate.getTime();

  const isYearly = rem.repeatYearly === true || rem.repeat === 'yearly';
  const repeatMode = isYearly ? 'yearly' : (rem.repeat || 'none');

  if (initialDate.getTime() > now) {
    return { nextDate: initialDate };
  }

  if (repeatMode === 'none') {
    return null;
  }

  if (repeatMode === 'weekly') {
    if (initialDate.getTime() > now) {
      return { nextDate: initialDate };
    }
    const diffMs = now - initialDate.getTime();
    const weeksToAdd = Math.floor(diffMs / (7 * 86400000)) + 1;
    const nextDate = new Date(initialDate.getTime() + weeksToAdd * 7 * 86400000);
    return { nextDate };
  }

  // Current Jalali date at nowDate
  const currentJalali = gregorianToJalali(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    nowDate.getDate()
  );

  if (repeatMode === 'yearly') {
    // Check occurrence in current Jalali year
    const maxDaysThisYear = getJalaliMonthLength(currentJalali.jy, jm);
    const clampedDayThisYear = Math.min(jd, maxDaysThisYear);
    const gThisYear = jalaliToGregorian(currentJalali.jy, jm, clampedDayThisYear);
    const candThisYear = new Date(gThisYear.gy, gThisYear.gm - 1, gThisYear.gd, hour, minute, 0, 0);

    if (candThisYear.getTime() > now) {
      return { nextDate: candThisYear };
    }

    // Advance to next Jalali year
    const nextJy = currentJalali.jy + 1;
    const maxDaysNextYear = getJalaliMonthLength(nextJy, jm);
    const clampedDayNextYear = Math.min(jd, maxDaysNextYear);
    const gNextYear = jalaliToGregorian(nextJy, jm, clampedDayNextYear);
    const candNextYear = new Date(gNextYear.gy, gNextYear.gm - 1, gNextYear.gd, hour, minute, 0, 0);
    return { nextDate: candNextYear };
  }

  if (repeatMode === 'monthly') {
    // Check occurrence in current Jalali month
    const maxDaysThisMonth = getJalaliMonthLength(currentJalali.jy, currentJalali.jm);
    const clampedDayThisMonth = Math.min(jd, maxDaysThisMonth);
    const gThisMonth = jalaliToGregorian(currentJalali.jy, currentJalali.jm, clampedDayThisMonth);
    const candThisMonth = new Date(gThisMonth.gy, gThisMonth.gm - 1, gThisMonth.gd, hour, minute, 0, 0);

    if (candThisMonth.getTime() > now) {
      return { nextDate: candThisMonth };
    }

    // Advance to next Jalali month
    let nextJy = currentJalali.jy;
    let nextJm = currentJalali.jm + 1;
    if (nextJm > 12) {
      nextJm = 1;
      nextJy += 1;
    }
    const maxDaysNextMonth = getJalaliMonthLength(nextJy, nextJm);
    const clampedDayNextMonth = Math.min(jd, maxDaysNextMonth);
    const gNextMonth = jalaliToGregorian(nextJy, nextJm, clampedDayNextMonth);
    const candNextMonth = new Date(gNextMonth.gy, gNextMonth.gm - 1, gNextMonth.gd, hour, minute, 0, 0);
    return { nextDate: candNextMonth };
  }

  return null;
}

const REMINDER_HORIZON_DAYS = 370;
const MAX_OCCURRENCES_PER_REMINDER = 64;
const MAX_SCHEDULED_REMINDER_NOTIFICATIONS = 500;

export function calculateReminderOccurrences(
  rem: UserReminder,
  nowDate: Date = new Date()
): Date[] {
  const horizon = new Date(
    nowDate.getTime() + REMINDER_HORIZON_DAYS * 86400000
  );
  const occurrences: Date[] = [];
  let cursor = new Date(nowDate.getTime());

  for (let i = 0; i < MAX_OCCURRENCES_PER_REMINDER; i++) {
    const plan = calculateNextReminderDate(rem, cursor);
    if (!plan || plan.nextDate > horizon) break;
    occurrences.push(plan.nextDate);
    cursor = new Date(plan.nextDate.getTime() + 1000);
  }
  return occurrences;
}

async function syncAllUserRemindersInternal(reminders: UserReminder[]): Promise<void> {
  if (!isCapacitorNative()) return;

  try {
    const hasPerm = await hasNotificationPermission();
    if (!hasPerm) return;

    const pending = await LocalNotifications.getPending();
    const reminderNotifIds = pending.notifications
      .filter(n => n.id >= 50000 && n.id < 90000)
      .map(n => ({ id: n.id }));

    if (reminderNotifIds.length > 0) {
      try {
        await LocalNotifications.cancel({ notifications: reminderNotifIds });
      } catch (e) {}
    }

    const notificationsToSchedule: LocalNotificationSchema[] = [];
    const usedIds = new Set<number>();
    const nowObj = new Date();

    for (const rem of reminders) {
      const isEnabled = rem.isEnabled ?? rem.enabled ?? true;
      if (!isEnabled) continue;

      const occurrenceDates = calculateReminderOccurrences(rem, nowObj);
      if (occurrenceDates.length === 0) continue;
      const parsedTime = parseReminderTime(rem.time) || { hour: 9, minute: 0 };
      const { hour, minute } = parsedTime;

      const categoryLabel = rem.type === 'birthday' ? '🎂 تولد و سالگرد' :
                            rem.type === 'bill' ? '💳 سررسید پرداخت' :
                            rem.type === 'event' ? '🗓️ رویداد' : '🔔 یادآوری';

      for (const nextDate of occurrenceDates) {
        if (notificationsToSchedule.length >= MAX_SCHEDULED_REMINDER_NOTIFICATIONS) break;
        const notifId = getDeterministicReminderNotificationId(
          `${rem.id}:${nextDate.getTime()}`,
          usedIds
        );
        notificationsToSchedule.push({
          id: notifId,
          title: `${categoryLabel}: ${rem.title}`,
          body: `یادآوری شخصی، ساعت ${toPersianDigits(`${hour < 10 ? '0' + hour : hour}:${minute < 10 ? '0' + minute : minute}`)}`,
          schedule: {
            at: nextDate,
            allowWhileIdle: true
          },
          channelId: REMINDERS_CHANNEL_ID,
          smallIcon: 'ic_stat_notification',
          extra: {
            reminderId: rem.id,
            dateKey: rem.dateKey,
            occurrenceAt: nextDate.toISOString()
          }
        });
      }
      if (notificationsToSchedule.length >= MAX_SCHEDULED_REMINDER_NOTIFICATIONS) break;
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (e) {
    console.warn('Failed to sync user reminders notifications:', e);
  }
}

let reminderSyncQueue: Promise<void> = Promise.resolve();

export function syncAllUserReminders(reminders: UserReminder[]): Promise<void> {
  reminderSyncQueue = reminderSyncQueue
    .catch(() => undefined)
    .then(() => syncAllUserRemindersInternal(reminders));
  return reminderSyncQueue;
}

