package com.adelapp.hooshyar;

import android.app.Activity;
import android.util.Log;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Capacitor Plugin bridging JavaScript/React Azan configuration to native Android.
 */
@CapacitorPlugin(name = "NativeAzan")
public class NativeAzanPlugin extends Plugin {
    private static final String TAG = "NativeAzanPlugin";
    private static volatile NativeAzanPlugin sInstance;
    private static volatile boolean sLaunchedFromAzan = false;
    private static volatile String sInitialPrayerName = "";
    private static final String REMINDER_SOUND_URI = "reminder_sound_uri";

    @Override
    public void load() {
        super.load();
        sInstance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (sInstance == this) {
            sInstance = null;
        }
        super.handleOnDestroy();
    }

    public static void setLaunchFromAzan(boolean val, String prayerName) {
        sLaunchedFromAzan = val;
        sInitialPrayerName = prayerName != null ? prayerName : "";
        if (val && sInstance != null) {
            notifyAzanNotificationOpened(sInitialPrayerName);
        }
    }

    public static void notifyAzanNotificationOpened(String prayerName) {
        try {
            if (sInstance != null) {
                JSObject ret = new JSObject();
                ret.put("prayerName", prayerName != null ? prayerName : "");
                sInstance.notifyListeners("azanNotificationOpened", ret);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to notify azanNotificationOpened listener", e);
        }
    }

    @PluginMethod
    public void checkLaunchNotification(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("wasLaunchedFromAzan", sLaunchedFromAzan);
        ret.put("prayerName", sInitialPrayerName);
        sLaunchedFromAzan = false;
        sInitialPrayerName = "";
        call.resolve(ret);
    }

    public static void notifyPlaybackState(boolean isPlaying, String prayerName, String reciterId) {
        try {
            if (sInstance != null) {
                JSObject ret = new JSObject();
                ret.put("isPlaying", isPlaying);
                ret.put("prayerName", prayerName != null ? prayerName : "");
                ret.put("reciterId", reciterId != null ? reciterId : "");
                sInstance.notifyListeners("playbackStateChanged", ret);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to notify playback state listener", e);
        }
    }

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        try {
            boolean autoAzanEnabled = call.getBoolean("autoAzanEnabled", true);
            if (!autoAzanEnabled) {
                AzanAlarmManager.disableAzan(getContext());
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("count", 0);
                ret.put("exact", AzanAlarmManager.canScheduleExactAlarms(getContext()));
                ret.put("scheduleMode", "DISABLED");
                call.resolve(ret);
                return;
            }

            JSArray alarmsArray = call.getArray("alarms");
            String reciterId = call.getString("reciterId", "moazenzadeh");
            String cityName = call.getString("cityName", "تهران");

            if (alarmsArray == null) {
                call.reject("Alarms array is required");
                return;
            }

            List<AzanAlarmManager.AlarmEntry> entries = new ArrayList<>();
            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject obj = alarmsArray.getJSONObject(i);
                AzanAlarmManager.AlarmEntry entry = new AzanAlarmManager.AlarmEntry();
                entry.id = obj.optInt("id", AzanAlarmManager.BASE_ALARM_ID + i + 1);
                entry.triggerAtMillis = obj.optLong("timeMillis", 0);
                entry.prayerKey = obj.optString("prayerKey", "fajr");
                entry.prayerName = obj.optString("prayerName", "اذان");
                entry.cityName = obj.optString("cityName", cityName);
                entry.reciterId = obj.optString("reciterId", reciterId);

                if (entry.triggerAtMillis > 0) {
                    entries.add(entry);
                }
            }

            Double latitude = call.getDouble("latitude", Double.NaN);
            Double longitude = call.getDouble("longitude", Double.NaN);
            Double timezone = call.getDouble("timezone", Double.NaN);
            boolean fajrEnabled = call.getBoolean("fajrEnabled", true);
            boolean dhuhrEnabled = call.getBoolean("dhuhrEnabled", true);
            boolean maghribEnabled = call.getBoolean("maghribEnabled", true);

            int count = AzanAlarmManager.scheduleAlarms(
                    getContext(),
                    entries,
                    reciterId,
                    cityName,
                    latitude != null ? latitude : Double.NaN,
                    longitude != null ? longitude : Double.NaN,
                    timezone != null ? timezone : Double.NaN,
                    fajrEnabled,
                    dhuhrEnabled,
                    maghribEnabled
            );
            boolean exactPermitted = AzanAlarmManager.canScheduleExactAlarms(getContext());

            JSObject ret = new JSObject();
            ret.put("success", count >= 0);
            ret.put("count", count < 0 ? Math.abs(count) - 1 : count);
            ret.put("exact", exactPermitted);
            ret.put("scheduleMode", count < 0 ? "FAILED" : (exactPermitted ? "EXACT" : "INEXACT_FALLBACK"));
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in scheduleAlarms", e);
            call.reject("خطا در زمان‌بندی اذان در اندروید: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        try {
            AzanAlarmManager.disableAzan(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in cancelAllAlarms", e);
            call.reject("خطا در لغو هشدارهای اذان: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        try {
            AzanPlaybackService.stopPlayback(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in stopPlayback", e);
            call.reject("خطا در توقف پخش اذان: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void pickReminderSound(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("audio/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            String savedUri = getContext().getSharedPreferences("hooshyar_native", 0)
                    .getString(REMINDER_SOUND_URI, null);
            if (savedUri != null) {
                intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(savedUri));
            }
            startActivityForResult(call, intent, "reminderSoundPickerResult");
        } catch (Exception e) {
            Log.e(TAG, "Failed to open reminder sound picker", e);
            call.reject("امکان باز کردن انتخاب‌گر صدای اعلان وجود ندارد.", e);
        }
    }

    @ActivityCallback
    private void reminderSoundPickerResult(PluginCall call, int resultCode, Intent data) {
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.resolve(new JSObject().put("success", false));
            return;
        }
        Uri uri = data.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (Exception ignored) {
            // Some file providers do not support persistable permissions.
        }
        getContext().getSharedPreferences("hooshyar_native", 0).edit()
                .putString(REMINDER_SOUND_URI, uri.toString())
                .apply();
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                call.resolve(new JSObject().put("success", true).put("uri", uri.toString()));
                return;
            }
            android.app.NotificationManager manager =
                    (android.app.NotificationManager) getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if (manager == null) {
                call.resolve(new JSObject().put("success", false).put("uri", uri.toString()));
                return;
            }
            manager.deleteNotificationChannel("reminders_channel_v2_private");
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                    "reminders_channel_v2_private",
                    "یادآوری‌ها و رویدادهای شخصی",
                    android.app.NotificationManager.IMPORTANCE_HIGH);
            channel.setSound(uri, new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        } catch (Exception e) {
            Log.w(TAG, "Failed to update reminder notification channel sound", e);
        }
        call.resolve(new JSObject().put("success", true).put("uri", uri.toString()));
    }

    @PluginMethod
    public void isPlaybackActive(PluginCall call) {
        try {
            boolean active = AzanPlaybackService.isPlaybackActive();
            String prayer = AzanPlaybackService.getCurrentPrayerName();
            String reciter = AzanPlaybackService.getCurrentReciterId();

            JSObject ret = new JSObject();
            ret.put("isPlaying", active);
            ret.put("prayerName", prayer);
            ret.put("reciterId", reciter);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in isPlaybackActive", e);
            JSObject ret = new JSObject();
            ret.put("isPlaying", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        try {
            boolean canExact = AzanAlarmManager.canScheduleExactAlarms(getContext());
            JSObject ret = new JSObject();
            ret.put("canExact", canExact);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("canExact", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open exact alarm settings", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }
}
