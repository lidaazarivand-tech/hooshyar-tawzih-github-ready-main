package com.adelapp.hooshyar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BroadcastReceiver listening for device reboot or app update.
 * Restores scheduled exact Azan alarms without needing the user to open the app.
 */
public class AzanBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AzanBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.d(TAG, "onReceive boot/update action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) ||
            "android.intent.action.TIME_SET".equals(action) ||
            Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            "android.intent.action.TIMEZONE_CHANGED".equals(action) ||
            Intent.ACTION_DATE_CHANGED.equals(action) ||
            "android.intent.action.DATE_CHANGED".equals(action) ||
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action)) {

            final PendingResult pendingResult = goAsync();
            new Thread(() -> {
                try {
                    boolean canExact = AzanAlarmManager.canScheduleExactAlarms(context);
                    Log.d(TAG, "Exact alarm permission state handled, canExact=" + canExact);
                    AzanAlarmManager.restoreAlarmsAfterBoot(context);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to restore azan alarms after boot or permission change", e);
                } finally {
                    pendingResult.finish();
                }
            }, "hooshyar-boot-restore").start();
        }
    }
}
