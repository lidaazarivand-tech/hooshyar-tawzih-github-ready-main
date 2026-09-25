package com.adelapp.hooshyar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Dedicated BroadcastReceiver triggered by AlarmManager when Azan time arrives.
 * Directly launches AzanPlaybackService without depending on WebView or JavaScript.
 */
public class AzanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanAlarmReceiver";

    public static final String ACTION_AZAN_ALARM = "com.adelapp.hooshyar.ACTION_AZAN_ALARM";
    public static final String ACTION_STOP_AZAN = "com.adelapp.hooshyar.ACTION_STOP_AZAN";
    public static final String ACTION_MAINTENANCE_REFRESH = "com.adelapp.hooshyar.ACTION_MAINTENANCE_REFRESH";

    private static PowerManager.WakeLock sWakeLock;

    public static synchronized void completeWakefulIntent() {
        if (sWakeLock != null) {
            try {
                if (sWakeLock.isHeld()) {
                    sWakeLock.release();
                }
            } catch (Exception ignored) {}
            sWakeLock = null;
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.d(TAG, "onReceive triggered with action: " + action);

        if (ACTION_STOP_AZAN.equals(action)) {
            AzanPlaybackService.stopPlayback(context);
            return;
        }

        if (ACTION_MAINTENANCE_REFRESH.equals(action)) {
            final PendingResult pendingResult = goAsync();
            new Thread(() -> {
                try {
                    Log.d(TAG, "Executing scheduled maintenance alarm to refresh rolling Azan window");
                    AzanAlarmManager.refreshRollingAlarms(context);
                } catch (Exception e) {
                    Log.e(TAG, "Error refreshing rolling alarms from maintenance receiver", e);
                } finally {
                    pendingResult.finish();
                }
            }, "hooshyar-maintenance-worker").start();
            return;
        }

        if (ACTION_AZAN_ALARM.equals(action)) {
            // Keep CPU awake safely until AzanPlaybackService starts and acquires its own lock
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                synchronized (AzanAlarmReceiver.class) {
                    if (sWakeLock == null) {
                        sWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "hooshyar:receiver_wakelock");
                        sWakeLock.setReferenceCounted(false);
                    }
                    try {
                        sWakeLock.acquire(15000L); // 15 seconds auto-release safety timeout
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to acquire receiver wake lock", e);
                    }
                }
            }

            try {
                Intent serviceIntent = new Intent(context, AzanPlaybackService.class);
                serviceIntent.setAction(AzanPlaybackService.ACTION_PLAY_AZAN);
                
                if (intent.getExtras() != null) {
                    serviceIntent.putExtras(intent.getExtras());
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error starting AzanPlaybackService from receiver", e);
                completeWakefulIntent();
                postFallbackNotification(context, intent);

                final PendingResult pendingResult = goAsync();
                new Thread(() -> {
                    try {
                        AzanAlarmManager.refreshRollingAlarms(context);
                    } catch (Exception ex) {
                        Log.w(TAG, "Error refreshing rolling alarms after playback launch failure", ex);
                    } finally {
                        pendingResult.finish();
                    }
                }, "hooshyar-fallback-refresh").start();
            }
        }
    }

    private void postFallbackNotification(Context context, Intent intent) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            String prayerName = intent.getStringExtra(AzanPlaybackService.EXTRA_PRAYER_NAME);
            String cityName = intent.getStringExtra(AzanPlaybackService.EXTRA_CITY_NAME);
            if (prayerName == null || prayerName.isEmpty()) prayerName = "اذان";
            if (cityName == null || cityName.isEmpty()) cityName = "افق محلی";

            String channelId = "azan_fallback_channel";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        channelId,
                        "هشدارهای اذان (پشتیبان)",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("هشدارهای اوقات شرعی هوشیار");
                channel.enableVibration(true);
                nm.createNotificationChannel(channel);
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("from_azan_alarm", true);
            PendingIntent pi = PendingIntent.getActivity(
                    context,
                    45005,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(R.drawable.ic_stat_notification)
                    .setContentTitle("🕌 هنگام " + prayerName + " به افق " + cityName)
                    .setContentText("هنگام اذان و وقت نماز است")
                    .setSubText("اذان‌گوی هوشیار")
                    .setContentIntent(pi)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setAutoCancel(true);

            nm.notify(AzanPlaybackService.NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to post fallback notification", e);
        }
    }
}
