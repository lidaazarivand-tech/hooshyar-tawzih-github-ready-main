package com.adelapp.hooshyar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/**
 * Native Android AlarmManager coordinator for scheduling exact Azan alarms.
 * Supports exact alarms, Doze mode bypass via AlarmClock/setExactAndAllowWhileIdle,
 * and survives device reboots via SharedPreferences persistence.
 */
public class AzanAlarmManager {
    private static final String TAG = "AzanAlarmManager";

    public static final String PREFS_NAME = "hooshyar_native_azan_prefs";
    public static final String KEY_SAVED_ALARMS = "saved_alarms_json";
    public static final String KEY_RECITER_ID = "selected_reciter_id";
    public static final String KEY_CITY_NAME = "selected_city_name";
    public static final String KEY_CITY_LAT = "selected_city_lat";
    public static final String KEY_CITY_LNG = "selected_city_lng";
    public static final String KEY_CITY_TZ = "selected_city_tz";
    public static final String KEY_FAJR_ENABLED = "fajr_alarm_enabled";
    public static final String KEY_DHUHR_ENABLED = "dhuhr_alarm_enabled";
    public static final String KEY_MAGHRIB_ENABLED = "maghrib_alarm_enabled";
    public static final String KEY_AUTO_AZAN_ENABLED = "auto_azan_enabled";
    public static final String KEY_TIMEZONE_ID = "scheduled_timezone_id";

    public static final String ACTION_MAINTENANCE_REFRESH = "com.adelapp.hooshyar.ACTION_MAINTENANCE_REFRESH";
    public static final int MAINTENANCE_ALARM_ID = 40199;

    public static final int BASE_ALARM_ID = 40000;
    public static final int MAX_ALARM_ID_RANGE = 200;

    public static final int MIN_PRAYER_ALARM_ID = 40005;
    public static final int MAX_PRAYER_ALARM_ID = 40127;

    public static final int PRAYER_SLOT_FAJR = 1;
    public static final int PRAYER_SLOT_DHUHR = 2;
    public static final int PRAYER_SLOT_MAGHRIB = 3;

    public static int generateAlarmId(int dayOfMonth, int prayerSlot) {
        if (dayOfMonth < 1 || dayOfMonth > 31) {
            throw new IllegalArgumentException("dayOfMonth must be between 1 and 31, got: " + dayOfMonth);
        }
        if (prayerSlot < 1 || prayerSlot > 3) {
            throw new IllegalArgumentException("prayerSlot must be 1, 2, or 3, got: " + prayerSlot);
        }
        return BASE_ALARM_ID + (dayOfMonth * 4) + prayerSlot;
    }

    public static boolean isValidPrayerAlarmId(int id) {
        if (id < MIN_PRAYER_ALARM_ID || id > MAX_PRAYER_ALARM_ID) {
            return false;
        }
        int offset = id - BASE_ALARM_ID;
        int slot = offset % 4;
        return slot >= 1 && slot <= 3;
    }

    public static boolean isMaintenanceAlarmId(int id) {
        return id == MAINTENANCE_ALARM_ID;
    }

    public static boolean isValidAlarmId(int id) {
        return isValidPrayerAlarmId(id);
    }

    /**
     * Formats numeric timezone offset in hours to standard GMT custom time zone ID (e.g. 3.5 -> "GMT+03:30").
     */
    public static String formatCustomTimezoneId(double tz) {
        int tzHours = (int) tz;
        int tzMinutes = Math.abs((int) Math.round((tz - tzHours) * 60.0));
        return String.format(java.util.Locale.US, "GMT%s%02d:%02d", tz >= 0 ? "+" : "-", Math.abs(tzHours), tzMinutes);
    }

    public static Map<Integer, AlarmEntry> filterAndDeduplicateAlarms(
            List<AlarmEntry> alarms,
            long now,
            long maxFuture,
            String fallbackReciterId,
            String fallbackCityName
    ) {
        Map<Integer, AlarmEntry> uniqueFutureAlarms = new LinkedHashMap<>();
        if (alarms == null) return uniqueFutureAlarms;

        for (AlarmEntry alarm : alarms) {
            if (alarm == null || !isValidPrayerAlarmId(alarm.id)) {
                continue; // Skip invalid, out-of-range, or maintenance IDs
            }
            if (alarm.triggerAtMillis <= now || alarm.triggerAtMillis > maxFuture) {
                continue; // Skip past or invalid alarms
            }

            // Fallback reciter or city if not set on item
            if (alarm.reciterId == null || alarm.reciterId.trim().isEmpty()) {
                alarm.reciterId = fallbackReciterId;
            }
            if (alarm.cityName == null || alarm.cityName.trim().isEmpty()) {
                alarm.cityName = fallbackCityName;
            }
            if (alarm.prayerName == null || alarm.prayerName.trim().isEmpty()) {
                alarm.prayerName = "اذان";
            }
            if (alarm.prayerKey == null || alarm.prayerKey.trim().isEmpty()) {
                alarm.prayerKey = "fajr";
            }

            // Guarantee deterministic uniqueness: one alarm per ID
            uniqueFutureAlarms.put(alarm.id, alarm);
        }
        return uniqueFutureAlarms;
    }

    public static class AlarmEntry {
        public int id;
        public long triggerAtMillis;
        public String prayerKey;
        public String prayerName;
        public String cityName;
        public String reciterId;

        public JSONObject toJson() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                obj.put("triggerAtMillis", triggerAtMillis);
                obj.put("prayerKey", prayerKey);
                obj.put("prayerName", prayerName);
                obj.put("cityName", cityName);
                obj.put("reciterId", reciterId);
                return obj;
            } catch (Exception e) {
                return new JSONObject();
            }
        }

        public static AlarmEntry fromJson(JSONObject obj) {
            try {
                AlarmEntry entry = new AlarmEntry();
                entry.id = obj.optInt("id", 0);
                entry.triggerAtMillis = obj.optLong("triggerAtMillis", 0);
                entry.prayerKey = obj.optString("prayerKey", "fajr");
                entry.prayerName = obj.optString("prayerName", "اذان");
                entry.cityName = obj.optString("cityName", "افق محلی");
                entry.reciterId = obj.optString("reciterId", "moazenzadeh");

                if (entry.id <= 0 || entry.triggerAtMillis <= 0) {
                    return null;
                }
                return entry;
            } catch (Exception e) {
                return null;
            }
        }
    }

    public static boolean canScheduleExactAlarms(Context context) {
        if (context == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        }
        return true;
    }

    /**
     * Schedules a list of exact Azan alarms in Android AlarmManager.
     * Cancels any previously scheduled alarms first to prevent duplicates.
     * Preserves stored individual prayer switches and coordinates.
     */
    public static synchronized int scheduleAlarms(Context context, List<AlarmEntry> alarms, String reciterId, String cityName) {
        if (context == null) return 0;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean fajr = prefs.getBoolean(KEY_FAJR_ENABLED, true);
        boolean dhuhr = prefs.getBoolean(KEY_DHUHR_ENABLED, true);
        boolean maghrib = prefs.getBoolean(KEY_MAGHRIB_ENABLED, true);
        double lat = prefs.getFloat(KEY_CITY_LAT, Float.NaN);
        double lng = prefs.getFloat(KEY_CITY_LNG, Float.NaN);
        double tz = prefs.getFloat(KEY_CITY_TZ, Float.NaN);
        return scheduleAlarms(context, alarms, reciterId, cityName, lat, lng, tz, fajr, dhuhr, maghrib);
    }

    public static synchronized int scheduleAlarms(
            Context context,
            List<AlarmEntry> alarms,
            String reciterId,
            String cityName,
            double lat,
            double lng,
            double tz,
            boolean fajrEnabled,
            boolean dhuhrEnabled,
            boolean maghribEnabled
    ) {
        if (context == null) return 0;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            Log.e(TAG, "AlarmManager system service not available");
            return 0;
        }

        long now = System.currentTimeMillis();
        long maxFuture = now + (11L * 24 * 60 * 60 * 1000L); // Max 11 days ahead to safely cover all 10 full calendar days
        Map<Integer, AlarmEntry> uniqueFutureAlarms = filterAndDeduplicateAlarms(alarms, now, maxFuture, reciterId, cityName);
        int scheduledCount = 0;

        if (uniqueFutureAlarms.isEmpty()) {
            cancelScheduledAlarms(context);
            saveAlarmsToPrefs(context, Collections.emptyList(), reciterId, cityName, lat, lng, tz, fajrEnabled, dhuhrEnabled, maghribEnabled);
            return 0;
        }

        // Cancel only obsolete alarms that were previously scheduled but are no longer active
        List<AlarmEntry> previouslySaved = loadAlarmsFromPrefs(context);
        for (AlarmEntry oldAlarm : previouslySaved) {
            if (oldAlarm != null && !uniqueFutureAlarms.containsKey(oldAlarm.id)) {
                cancelSingleAlarm(context, am, oldAlarm.id);
            }
        }

        List<AlarmEntry> scheduledAlarms = new ArrayList<>();
        boolean scheduleFailed = false;
        for (AlarmEntry alarm : uniqueFutureAlarms.values()) {
            try {
                Intent intent = new Intent(context, AzanAlarmReceiver.class);
                intent.setAction(AzanAlarmReceiver.ACTION_AZAN_ALARM);
                intent.putExtra(AzanPlaybackService.EXTRA_PRAYER_KEY, alarm.prayerKey);
                intent.putExtra(AzanPlaybackService.EXTRA_PRAYER_NAME, alarm.prayerName);
                intent.putExtra(AzanPlaybackService.EXTRA_CITY_NAME, alarm.cityName);
                intent.putExtra(AzanPlaybackService.EXTRA_RECITER_ID, alarm.reciterId);
                intent.putExtra("alarmId", alarm.id);
                intent.putExtra("triggerAtMillis", alarm.triggerAtMillis);

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        alarm.id,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                scheduleExactAlarm(context, am, alarm.triggerAtMillis, pendingIntent, alarm.id);
                scheduledAlarms.add(alarm);
                scheduledCount++;
            } catch (Exception e) {
                scheduleFailed = true;
                Log.e(TAG, "Failed to schedule alarm ID " + alarm.id, e);
            }
        }

        // 2. Persist active future alarms & city configuration to SharedPreferences for reboot recovery
        if (!scheduleFailed) {
            saveAlarmsToPrefs(context, scheduledAlarms, reciterId, cityName, lat, lng, tz, fajrEnabled, dhuhrEnabled, maghribEnabled);
        }

        // 3. Schedule maintenance heartbeat alarm 5 days ahead as a self-renewing safety net
        scheduleMaintenanceAlarm(context, am, now);

        boolean exactPermitted = canScheduleExactAlarms(context);
        Log.d(TAG, "Successfully scheduled " + scheduledCount + " native Azan alarms (" + (exactPermitted ? "EXACT" : "INEXACT_FALLBACK") + ") with maintenance heartbeat");
        return scheduleFailed ? -(scheduledCount + 1) : scheduledCount;
    }

    private static void scheduleMaintenanceAlarm(Context context, AlarmManager am, long now) {
        try {
            long maintenanceTrigger = now + (5L * 24 * 60 * 60 * 1000L); // 5 days in the future
            Intent intent = new Intent(context, AzanAlarmReceiver.class);
            intent.setAction(ACTION_MAINTENANCE_REFRESH);
            intent.putExtra("alarmId", MAINTENANCE_ALARM_ID);
            intent.putExtra("triggerAtMillis", maintenanceTrigger);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    MAINTENANCE_ALARM_ID,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, maintenanceTrigger, pendingIntent);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, maintenanceTrigger, pendingIntent);
            }
            Log.d(TAG, "Scheduled Azan maintenance heartbeat alarm at " + maintenanceTrigger);
        } catch (Exception e) {
            Log.w(TAG, "Failed to schedule maintenance alarm", e);
        }
    }

    private static void cancelMaintenanceAlarm(Context context, AlarmManager am) {
        try {
            Intent intent = new Intent(context, AzanAlarmReceiver.class);
            intent.setAction(ACTION_MAINTENANCE_REFRESH);
            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    MAINTENANCE_ALARM_ID,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error canceling maintenance alarm", e);
        }
    }

    private static void scheduleExactAlarm(Context context, AlarmManager am, long triggerAtMillis, PendingIntent pendingIntent, int alarmId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean canScheduleExact = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                canScheduleExact = am.canScheduleExactAlarms();
            }

            if (canScheduleExact) {
                // First priority: setAlarmClock (bypasses Doze, highest OS priority, exact timing)
                try {
                    Intent showIntent = new Intent(context, MainActivity.class);
                    showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    showIntent.putExtra("from_azan_alarm", true);
                    PendingIntent showPendingIntent = PendingIntent.getActivity(
                            context,
                            alarmId + 60000,
                            showIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPendingIntent);
                    am.setAlarmClock(clockInfo, pendingIntent);
                    return;
                } catch (SecurityException se) {
                    Log.w(TAG, "setAlarmClock not permitted, falling back to setExactAndAllowWhileIdle", se);
                }

                // Second priority: setExactAndAllowWhileIdle (works in idle/Doze)
                try {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                    return;
                } catch (SecurityException se) {
                    Log.w(TAG, "setExactAndAllowWhileIdle not permitted, falling back to setAndAllowWhileIdle", se);
                }
            } else {
                Log.w(TAG, "canScheduleExactAlarms() is false. Using safe setAndAllowWhileIdle fallback.");
            }

            // Safe fallback when exact alarms are NOT permitted: setAndAllowWhileIdle wakes from Doze without SCHEDULE_EXACT_ALARM!
            try {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                return;
            } catch (Exception e) {
                Log.w(TAG, "setAndAllowWhileIdle failed, falling back to standard set", e);
            }
        }

        // Third fallback
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            try {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            } catch (SecurityException se) {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }
        } else {
            am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        }
    }

    /**
     * Cancels all scheduled alarms both from persisted records and across the deterministic prayer range,
     * as well as the maintenance alarm, without altering user preferences.
     * System maintenance operations must call this instead of disableAzan.
     */
    public static synchronized void cancelScheduledAlarms(Context context) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        // Cancel maintenance alarm
        cancelMaintenanceAlarm(context, am);

        // Cancel known persisted alarms
        List<AlarmEntry> saved = loadAlarmsFromPrefs(context);
        for (AlarmEntry alarm : saved) {
            cancelSingleAlarm(context, am, alarm.id);
        }

        // Cancel across deterministic prayer range as failsafe
        for (int id = MIN_PRAYER_ALARM_ID; id <= MAX_PRAYER_ALARM_ID; id++) {
            cancelSingleAlarm(context, am, id);
        }

        clearAlarmsInPrefs(context);
        Log.d(TAG, "All scheduled native alarms canceled from AlarmManager; user preferences preserved");
    }

    /**
     * Explicitly disables Azan by user choice.
     * Records auto_azan_enabled = false in SharedPreferences and cancels all scheduled alarms.
     */
    public static synchronized void disableAzan(Context context) {
        if (context == null) return;
        cancelScheduledAlarms(context);
        setAzanDisabledInPrefs(context);
        Log.d(TAG, "Azan explicitly disabled by user: auto_azan_enabled=false");
    }

    /**
     * Backwards-compatible alias for explicit user disable.
     */
    public static synchronized void cancelAllAlarms(Context context) {
        disableAzan(context);
    }

    private static void cancelSingleAlarm(Context context, AlarmManager am, int id) {
        try {
            Intent intent = new Intent(context, AzanAlarmReceiver.class);
            intent.setAction(AzanAlarmReceiver.ACTION_AZAN_ALARM);
            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    id,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }

            // Also cancel the companion showPendingIntent used by setAlarmClock
            Intent showIntent = new Intent(context, MainActivity.class);
            PendingIntent showPi = PendingIntent.getActivity(
                    context,
                    id + 60000,
                    showIntent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (showPi != null) {
                showPi.cancel();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error canceling alarm id " + id, e);
        }
    }

    private static volatile long sLastRestoreTimestamp = 0L;

    /**
     * Automatically refreshes the rolling 10-day Azan alarm window natively without WebView.
     * Called after an Azan alarm fires or when the native maintenance alarm triggers.
     */
    public static synchronized void refreshRollingAlarms(Context context) {
        restoreAlarmsAfterBoot(context);
    }

    /**
     * Called by AzanBootReceiver after device reboot or app update, or by refreshRollingAlarms.
     * Restores/extends only valid future alarms without duplicating.
     */
    public static synchronized void restoreAlarmsAfterBoot(Context context) {
        if (context == null) return;
        long now = System.currentTimeMillis();
        long diff = now - sLastRestoreTimestamp;
        // Rate limit restore calls to prevent storm during simultaneous system broadcasts (TIME_SET, TIMEZONE_CHANGED, DATE_CHANGED)
        // If clock was rolled backward (diff < 0), do not rate limit as it is an explicit time change.
        if (diff >= 0 && diff < 2000L) {
            Log.d(TAG, "Skipping rapid duplicate restoreAlarmsAfterBoot within 2000ms");
            return;
        }
        sLastRestoreTimestamp = now;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean autoAzanEnabled = prefs.getBoolean(KEY_AUTO_AZAN_ENABLED, true);
        if (!autoAzanEnabled) {
            Log.d(TAG, "Auto Azan is disabled by user setting; skipping restoration");
            return;
        }

        boolean fajrEnabled = prefs.getBoolean(KEY_FAJR_ENABLED, true);
        boolean dhuhrEnabled = prefs.getBoolean(KEY_DHUHR_ENABLED, true);
        boolean maghribEnabled = prefs.getBoolean(KEY_MAGHRIB_ENABLED, true);

        if (!fajrEnabled && !dhuhrEnabled && !maghribEnabled) {
            Log.d(TAG, "All prayer alarms are disabled by user setting; skipping restoration");
            return;
        }

        Log.d(TAG, "Restoring/Recalculating native Azan alarms after reboot, date turnover, or rolling refresh");

        String reciterId = prefs.getString(KEY_RECITER_ID, "moazenzadeh");
        String cityName = prefs.getString(KEY_CITY_NAME, "تهران");
        float latFloat = prefs.getFloat(KEY_CITY_LAT, Float.NaN);
        float lngFloat = prefs.getFloat(KEY_CITY_LNG, Float.NaN);
        float tzFloat = prefs.getFloat(KEY_CITY_TZ, Float.NaN);

        // 1. If geographic coordinates and timezone are saved, natively recalculate prayer times
        // for today and next 10 days according to current device clock & city timezone.
        // This guarantees alarms are never scheduled with obsolete timezone timestamps!
        if (!Float.isNaN(latFloat) && !Float.isNaN(lngFloat) && !Float.isNaN(tzFloat) &&
            latFloat >= -90.0f && latFloat <= 90.0f &&
            lngFloat >= -180.0f && lngFloat <= 180.0f &&
            tzFloat >= -12.0f && tzFloat <= 14.0f) {
            double lat = latFloat;
            double lng = lngFloat;
            double tz = tzFloat;

            String customTzId = formatCustomTimezoneId(tz);
            TimeZone cityTz = TimeZone.getTimeZone(customTzId);

            Calendar cal = Calendar.getInstance(cityTz);
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);

            List<AlarmEntry> freshAlarms = new ArrayList<>();
            for (int dayOffset = 0; dayOffset < 10; dayOffset++) {
                Calendar dayCal = (Calendar) cal.clone();
                dayCal.add(Calendar.DAY_OF_YEAR, dayOffset);
                int dayOfMonth = dayCal.get(Calendar.DAY_OF_MONTH);

                PrayerTimesCalculator.DayPrayers prayers = PrayerTimesCalculator.calculate(dayCal, lat, lng, tz);

                if (fajrEnabled) {
                    Calendar fCal = (Calendar) dayCal.clone();
                    fCal.set(Calendar.HOUR_OF_DAY, prayers.fajrMinutes / 60);
                    fCal.set(Calendar.MINUTE, prayers.fajrMinutes % 60);
                    fCal.set(Calendar.SECOND, 0);
                    fCal.set(Calendar.MILLISECOND, 0);
                    long trigger = fCal.getTimeInMillis();
                    if (trigger > now) {
                        AlarmEntry e = new AlarmEntry();
                        e.id = generateAlarmId(dayOfMonth, PRAYER_SLOT_FAJR);
                        e.triggerAtMillis = trigger;
                        e.prayerKey = "fajr";
                        e.prayerName = "اذان صبح";
                        e.cityName = cityName;
                        e.reciterId = reciterId;
                        freshAlarms.add(e);
                    }
                }

                if (dhuhrEnabled) {
                    Calendar dCal = (Calendar) dayCal.clone();
                    dCal.set(Calendar.HOUR_OF_DAY, prayers.dhuhrMinutes / 60);
                    dCal.set(Calendar.MINUTE, prayers.dhuhrMinutes % 60);
                    dCal.set(Calendar.SECOND, 0);
                    dCal.set(Calendar.MILLISECOND, 0);
                    long trigger = dCal.getTimeInMillis();
                    if (trigger > now) {
                        AlarmEntry e = new AlarmEntry();
                        e.id = generateAlarmId(dayOfMonth, PRAYER_SLOT_DHUHR);
                        e.triggerAtMillis = trigger;
                        e.prayerKey = "dhuhr";
                        e.prayerName = "اذان ظهر";
                        e.cityName = cityName;
                        e.reciterId = reciterId;
                        freshAlarms.add(e);
                    }
                }

                if (maghribEnabled) {
                    Calendar mCal = (Calendar) dayCal.clone();
                    mCal.set(Calendar.HOUR_OF_DAY, prayers.maghribMinutes / 60);
                    mCal.set(Calendar.MINUTE, prayers.maghribMinutes % 60);
                    mCal.set(Calendar.SECOND, 0);
                    mCal.set(Calendar.MILLISECOND, 0);
                    long trigger = mCal.getTimeInMillis();
                    if (trigger > now) {
                        AlarmEntry e = new AlarmEntry();
                        e.id = generateAlarmId(dayOfMonth, PRAYER_SLOT_MAGHRIB);
                        e.triggerAtMillis = trigger;
                        e.prayerKey = "maghrib";
                        e.prayerName = "اذان مغرب";
                        e.cityName = cityName;
                        e.reciterId = reciterId;
                        freshAlarms.add(e);
                    }
                }
            }

            if (!freshAlarms.isEmpty()) {
                scheduleAlarms(context, freshAlarms, reciterId, cityName, lat, lng, tz, fajrEnabled, dhuhrEnabled, maghribEnabled);
                return;
            } else {
                cancelScheduledAlarms(context);
                return;
            }
        }

        // 2. Fallback: if coordinates were not stored, check if timezone changed
        String savedTz = prefs.getString(KEY_TIMEZONE_ID, null);
        String currentTz = TimeZone.getDefault().getID();
        if (savedTz != null && !savedTz.equals(currentTz)) {
            // Obsolete timezone: cancel and do not blindly restore stale timestamps
            Log.w(TAG, "Timezone changed from " + savedTz + " to " + currentTz + " without saved coordinates; canceling stale alarms");
            cancelScheduledAlarms(context);
            return;
        }

        // Otherwise restore remaining future alarms
        List<AlarmEntry> saved = loadAlarmsFromPrefs(context);
        long maxFuture = now + (11L * 24 * 60 * 60 * 1000L);
        List<AlarmEntry> validAlarms = new ArrayList<>();
        for (AlarmEntry a : saved) {
            if (a != null && isValidPrayerAlarmId(a.id) &&
                a.triggerAtMillis > now && a.triggerAtMillis <= maxFuture) {
                validAlarms.add(a);
            }
        }

        if (!validAlarms.isEmpty()) {
            scheduleAlarms(context, validAlarms, reciterId, cityName, latFloat, lngFloat, tzFloat, fajrEnabled, dhuhrEnabled, maghribEnabled);
        } else {
            cancelScheduledAlarms(context);
        }
    }

    private static void saveAlarmsToPrefs(
            Context context,
            List<AlarmEntry> alarms,
            String reciterId,
            String cityName,
            double lat,
            double lng,
            double tz,
            boolean fajrEnabled,
            boolean dhuhrEnabled,
            boolean maghribEnabled
    ) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray array = new JSONArray();
            for (AlarmEntry a : alarms) {
                array.put(a.toJson());
            }
            SharedPreferences.Editor editor = prefs.edit()
                    .putString(KEY_SAVED_ALARMS, array.toString())
                    .putString(KEY_RECITER_ID, reciterId)
                    .putString(KEY_CITY_NAME, cityName)
                    .putString(KEY_TIMEZONE_ID, TimeZone.getDefault().getID())
                    .putBoolean(KEY_AUTO_AZAN_ENABLED, true)
                    .putBoolean(KEY_FAJR_ENABLED, fajrEnabled)
                    .putBoolean(KEY_DHUHR_ENABLED, dhuhrEnabled)
                    .putBoolean(KEY_MAGHRIB_ENABLED, maghribEnabled);

            if (!Double.isNaN(lat) && !Double.isNaN(lng) && !Double.isNaN(tz)) {
                editor.putFloat(KEY_CITY_LAT, (float) lat)
                        .putFloat(KEY_CITY_LNG, (float) lng)
                        .putFloat(KEY_CITY_TZ, (float) tz);
            }
            editor.apply();
        } catch (Exception e) {
            Log.e(TAG, "Error saving alarms to SharedPreferences", e);
        }
    }

    private static void setAzanDisabledInPrefs(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean(KEY_AUTO_AZAN_ENABLED, false)
                    .remove(KEY_SAVED_ALARMS)
                    .apply();
        } catch (Exception e) {
            Log.e(TAG, "Error setting azan disabled in SharedPreferences", e);
        }
    }

    private static List<AlarmEntry> loadAlarmsFromPrefs(Context context) {
        List<AlarmEntry> result = new ArrayList<>();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(KEY_SAVED_ALARMS, null);
            if (jsonStr != null && !jsonStr.isEmpty()) {
                JSONArray array = new JSONArray(jsonStr);
                for (int i = 0; i < array.length(); i++) {
                    JSONObject obj = array.getJSONObject(i);
                    AlarmEntry entry = AlarmEntry.fromJson(obj);
                    if (entry != null) {
                        result.add(entry);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error loading alarms from SharedPreferences, clearing corrupted entry", e);
            clearAlarmsInPrefs(context);
        }
        return result;
    }

    private static void clearAlarmsInPrefs(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(KEY_SAVED_ALARMS).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error clearing alarms from SharedPreferences", e);
        }
    }
}
