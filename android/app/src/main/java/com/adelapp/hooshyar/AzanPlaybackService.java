package com.adelapp.hooshyar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Native Android Foreground Service for playing offline Azan audio.
 * Works even when screen is locked, app is closed, or device is in Doze mode.
 */
public class AzanPlaybackService extends Service {
    private static final String TAG = "AzanPlaybackService";

    public static final String ACTION_PLAY_AZAN = "com.adelapp.hooshyar.ACTION_PLAY_AZAN";
    public static final String ACTION_STOP_AZAN = "com.adelapp.hooshyar.ACTION_STOP_AZAN";

    public static final String EXTRA_PRAYER_KEY = "prayerKey";
    public static final String EXTRA_PRAYER_NAME = "prayerName";
    public static final String EXTRA_CITY_NAME = "cityName";
    public static final String EXTRA_RECITER_ID = "reciterId";

    public static final String CHANNEL_ID = "azan_playback_channel_v2_private";
    public static final int NOTIFICATION_ID = 45001;

    private static volatile boolean sIsPlaying = false;
    private static volatile String sCurrentPrayerName = "";
    private static volatile String sCurrentReciterId = "";
    private static volatile AzanPlaybackService sActiveInstance = null;
    private static volatile long sLastTriggerTimestamp = 0L;
    private static volatile int sLastTriggerAlarmId = -1;

    private final Object mLock = new Object();
    private MediaPlayer mMediaPlayer;
    private boolean mIsPrepared = false;
    private boolean mIsPlaybackRequested = false;
    private boolean mIsCleaningUp = false;
    private boolean mIsPausedForFocus = false;
    private boolean mIsDucked = false;
    private long mFocusPausedTimestamp = 0L;
    private static final long MAX_FOCUS_PAUSE_DURATION_MS = 180000L; // 3 minutes max interruption pause
    private PowerManager.WakeLock mWakeLock;
    private AudioManager mAudioManager;
    private AudioFocusRequest mAudioFocusRequest;
    private AudioManager.OnAudioFocusChangeListener mFocusListener;

    public static boolean isPlaybackActive() {
        return sIsPlaying;
    }

    public static String getCurrentPrayerName() {
        return sCurrentPrayerName;
    }

    public static String getCurrentReciterId() {
        return sCurrentReciterId;
    }

    public static void stopPlayback(Context context) {
        try {
            if (sActiveInstance != null) {
                sActiveInstance.cleanUpAndStop();
                return;
            }
        } catch (Exception e) {
            Log.w(TAG, "Error stopping active instance directly", e);
        }
        try {
            if (context != null) {
                Intent intent = new Intent(context, AzanPlaybackService.class);
                intent.setAction(ACTION_STOP_AZAN);
                context.startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping AzanPlaybackService via intent", e);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        sActiveInstance = this;
        mAudioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "onStartCommand action: " + action);

        if (ACTION_STOP_AZAN.equals(action)) {
            cleanUpAndStop();
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY_AZAN.equals(action)) {
            int alarmId = intent.getIntExtra("alarmId", -1);
            long now = System.currentTimeMillis();
            // Prevent duplicate broadcasts within 15 seconds for the same alarmId
            if (alarmId != -1 && alarmId == sLastTriggerAlarmId && (now - sLastTriggerTimestamp) < 15000L) {
                Log.w(TAG, "Duplicate trigger detected for alarmId " + alarmId + " within 15s; ignoring duplicate intent.");
                AzanAlarmReceiver.completeWakefulIntent();
                return START_NOT_STICKY;
            }
            sLastTriggerAlarmId = alarmId;
            sLastTriggerTimestamp = now;

            String prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
            String cityName = intent.getStringExtra(EXTRA_CITY_NAME);
            String reciterId = intent.getStringExtra(EXTRA_RECITER_ID);

            if (prayerName == null || prayerName.trim().isEmpty()) {
                prayerName = "اذان";
            }
            if (cityName == null || cityName.trim().isEmpty()) {
                cityName = "افق محلی";
            }
            if (reciterId == null || reciterId.trim().isEmpty()) {
                reciterId = "moazenzadeh";
            }

            sCurrentPrayerName = prayerName;
            sCurrentReciterId = reciterId;

            acquireWakeLock();
            Notification notification = buildNotification(prayerName, cityName, reciterId);

            boolean foregroundStarted = false;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
                foregroundStarted = true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to startForeground: " + e.getMessage(), e);
            }

            // Foreground handover attempt finished: complete the receiver wakeful handover
            AzanAlarmReceiver.completeWakefulIntent();

            if (!foregroundStarted) {
                Log.e(TAG, "Cannot safely continue playback because Foreground Service could not be started. Posting fallback notification and stopping.");
                postFallbackNotification(prayerName, cityName);
                cleanUpAndStop();
                return START_NOT_STICKY;
            }

            playAzanAudio(reciterId);
            triggerRollingRefreshAsync(getApplicationContext());
            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void triggerRollingRefreshAsync(final Context context) {
        new Thread(() -> {
            try {
                // Wait 1500ms so the current alarm trigger timestamp is strictly in the past
                Thread.sleep(1500L);
                AzanAlarmManager.refreshRollingAlarms(context);
            } catch (Exception e) {
                Log.w(TAG, "Failed to refresh rolling azan alarms in background", e);
            }
        }, "hooshyar-azan-rolling-refresh").start();
    }

    private void acquireWakeLock() {
        try {
            if (mWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    mWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "hooshyar:azan_audio_wakelock");
                    mWakeLock.setReferenceCounted(false);
                }
            }
            if (mWakeLock != null && !mWakeLock.isHeld()) {
                // Hold wake lock for maximum 10 minutes to prevent battery drain in case of unexpected errors
                mWakeLock.acquire(10 * 60 * 1000L);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to acquire wake lock", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (mWakeLock != null && mWakeLock.isHeld()) {
                mWakeLock.release();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to release wake lock", e);
        }
    }

    private void requestAudioFocus() {
        try {
            if (mAudioManager == null) return;
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();

            mFocusListener = focusChange -> {
                Log.d(TAG, "Audio focus changed: " + focusChange);
                synchronized (mLock) {
                    switch (focusChange) {
                        case AudioManager.AUDIOFOCUS_LOSS:
                            // Permanent audio focus loss (e.g. user started media in another app)
                            Log.d(TAG, "Permanent audio focus loss, stopping Azan cleanly");
                            cleanUpAndStop();
                            break;

                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                            // Transient audio focus loss (e.g. phone call ringing or active call)
                            // Safely pause audio so it does not play loudly over a call, but do not kill Azan permanently
                            Log.d(TAG, "Transient audio focus loss (e.g. phone call), pausing Azan audio");
                            if (mMediaPlayer != null && mIsPrepared) {
                                try {
                                    if (mMediaPlayer.isPlaying()) {
                                        mMediaPlayer.pause();
                                        mIsPausedForFocus = true;
                                        mFocusPausedTimestamp = System.currentTimeMillis();
                                        NativeAzanPlugin.notifyPlaybackState(false, sCurrentPrayerName, sCurrentReciterId);
                                    }
                                } catch (Exception e) {
                                    Log.w(TAG, "Error pausing MediaPlayer on transient focus loss", e);
                                }
                            }
                            break;

                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                            // Brief interruption (e.g. notification sound, turn-by-turn navigation prompt)
                            // Duck volume rather than stopping Azan recitation abruptly
                            Log.d(TAG, "Transient can-duck audio focus loss, ducking Azan volume");
                            if (mMediaPlayer != null && mIsPrepared) {
                                try {
                                    mMediaPlayer.setVolume(0.2f, 0.2f);
                                    mIsDucked = true;
                                } catch (Exception e) {
                                    Log.w(TAG, "Error ducking MediaPlayer volume", e);
                                }
                            }
                            break;

                        case AudioManager.AUDIOFOCUS_GAIN:
                            Log.d(TAG, "Audio focus regained");
                            if (mIsDucked) {
                                if (mMediaPlayer != null && mIsPrepared) {
                                    try {
                                        mMediaPlayer.setVolume(1.0f, 1.0f);
                                    } catch (Exception e) {
                                        Log.w(TAG, "Error restoring ducked volume", e);
                                    }
                                }
                                mIsDucked = false;
                            }
                            if (mIsPausedForFocus) {
                                mIsPausedForFocus = false;
                                long pausedDuration = System.currentTimeMillis() - mFocusPausedTimestamp;
                                if (pausedDuration > MAX_FOCUS_PAUSE_DURATION_MS) {
                                    // Interruption lasted longer than 3 minutes; Azan recitation has naturally expired
                                    Log.d(TAG, "Focus pause duration (" + pausedDuration + "ms) exceeded max window; finishing cleanly");
                                    cleanUpAndStop();
                                } else if (mMediaPlayer != null && mIsPrepared && !mIsCleaningUp) {
                                    try {
                                        mMediaPlayer.start();
                                        NativeAzanPlugin.notifyPlaybackState(true, sCurrentPrayerName, sCurrentReciterId);
                                        Log.d(TAG, "Resumed Azan playback after transient interruption");
                                    } catch (Exception e) {
                                        Log.e(TAG, "Failed to resume MediaPlayer after focus regain", e);
                                        cleanUpAndStop();
                                    }
                                }
                            }
                            break;

                        default:
                            break;
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mAudioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(audioAttributes)
                        .setOnAudioFocusChangeListener(mFocusListener)
                        .build();
                int res = mAudioManager.requestAudioFocus(mAudioFocusRequest);
                if (res != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                    Log.w(TAG, "Audio focus request rejected or delayed: " + res);
                }
            } else {
                int res = mAudioManager.requestAudioFocus(mFocusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
                if (res != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                    Log.w(TAG, "Audio focus request rejected: " + res);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to request audio focus", e);
        }
    }

    private void abandonAudioFocus() {
        try {
            if (mAudioManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && mAudioFocusRequest != null) {
                mAudioManager.abandonAudioFocusRequest(mAudioFocusRequest);
            } else {
                mAudioManager.abandonAudioFocus(mFocusListener);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to abandon audio focus", e);
        }
    }

    private int resolveAudioResId(String reciterId) {
        if ("moazenzadeh".equalsIgnoreCase(reciterId)) {
            return R.raw.azan_moazenzadeh;
        } else if ("sobhdel".equalsIgnoreCase(reciterId)) {
            return R.raw.azan_sobhdel;
        } else if ("gholosh".equalsIgnoreCase(reciterId)) {
            return R.raw.azan_gholosh;
        }

        // Dynamic resource identifier fallback
        if (reciterId != null && !reciterId.trim().isEmpty()) {
            try {
                int dynamicId = getResources().getIdentifier("azan_" + reciterId.toLowerCase().trim(), "raw", getPackageName());
                if (dynamicId != 0) {
                    return dynamicId;
                }
            } catch (Exception ignored) {}
        }

        // Default fallback
        return R.raw.azan_moazenzadeh;
    }

    private String getReciterDisplayName(String reciterId) {
        if ("moazenzadeh".equalsIgnoreCase(reciterId)) {
            return "مؤذن‌زاده اردبیلی";
        } else if ("sobhdel".equalsIgnoreCase(reciterId)) {
            return "حسین صبحدل";
        } else if ("gholosh".equalsIgnoreCase(reciterId)) {
            return "راغب مصطفی غلوش";
        }
        return "صوت اذان";
    }

    private void playAzanAudio(String reciterId) {
        synchronized (mLock) {
            mIsCleaningUp = false;
            mIsPausedForFocus = false;
            mIsDucked = false;
            mFocusPausedTimestamp = 0L;
            stopCurrentPlayer();
            requestAudioFocus();

            int resId = resolveAudioResId(reciterId);
            Log.d(TAG, "Playing azan for reciter " + reciterId + " with resId " + resId);

            try {
                mIsPlaybackRequested = true;
                mIsPrepared = false;
                mMediaPlayer = new MediaPlayer();
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                mMediaPlayer.setAudioAttributes(audioAttributes);

                // Open direct raw file descriptor to avoid URI resolution failures on custom ROMs
                boolean dataSourceSet = false;
                try {
                    android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(resId);
                    if (afd != null) {
                        mMediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                        afd.close();
                        dataSourceSet = true;
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to open direct raw resource FD, falling back to URI", e);
                }

                if (!dataSourceSet) {
                    Uri mediaUri = Uri.parse("android.resource://" + getPackageName() + "/" + resId);
                    mMediaPlayer.setDataSource(this, mediaUri);
                }

                mMediaPlayer.setOnPreparedListener(mp -> {
                    synchronized (mLock) {
                        Log.d(TAG, "MediaPlayer prepared, starting playback");
                        if (mIsCleaningUp || !mIsPlaybackRequested || mp != mMediaPlayer) {
                            Log.d(TAG, "Playback was cancelled before prepare finished; releasing player");
                            try {
                                mp.reset();
                                mp.release();
                            } catch (Exception ignored) {}
                            return;
                        }
                        mIsPrepared = true;
                        sIsPlaying = true;
                        NativeAzanPlugin.notifyPlaybackState(true, sCurrentPrayerName, sCurrentReciterId);
                        try {
                            mp.start();
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to start MediaPlayer", e);
                            cleanUpAndStop();
                        }
                    }
                });

                mMediaPlayer.setOnCompletionListener(mp -> {
                    synchronized (mLock) {
                        Log.d(TAG, "MediaPlayer completed playback naturally");
                        cleanUpAndStop();
                    }
                });

                mMediaPlayer.setOnErrorListener((mp, what, extra) -> {
                    synchronized (mLock) {
                        Log.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
                        cleanUpAndStop();
                        return true;
                    }
                });

                mMediaPlayer.prepareAsync();
            } catch (Exception e) {
                Log.e(TAG, "Failed to initialize MediaPlayer for azan", e);
                cleanUpAndStop();
            }
        }
    }

    private void stopCurrentPlayer() {
        synchronized (mLock) {
            mIsPlaybackRequested = false;
            mIsPausedForFocus = false;
            mIsDucked = false;
            mFocusPausedTimestamp = 0L;
            if (mMediaPlayer != null) {
                try {
                    mMediaPlayer.setOnPreparedListener(null);
                    mMediaPlayer.setOnCompletionListener(null);
                    mMediaPlayer.setOnErrorListener(null);
                    if (mIsPrepared) {
                        try {
                            if (mMediaPlayer.isPlaying()) {
                                mMediaPlayer.stop();
                            }
                        } catch (Exception ignored) {}
                    }
                    mMediaPlayer.reset();
                    mMediaPlayer.release();
                } catch (Exception e) {
                    Log.w(TAG, "Error releasing MediaPlayer", e);
                }
                mMediaPlayer = null;
            }
            mIsPrepared = false;
            sIsPlaying = false;
        }
    }

    private void cleanUpAndStop() {
        synchronized (mLock) {
            if (mIsCleaningUp) return;
            mIsCleaningUp = true;
            mIsPausedForFocus = false;
            mIsDucked = false;
            mFocusPausedTimestamp = 0L;
            sIsPlaying = false;
            sCurrentPrayerName = "";
            sCurrentReciterId = "";
            NativeAzanPlugin.notifyPlaybackState(false, "", "");

            stopCurrentPlayer();
            abandonAudioFocus();
            releaseWakeLock();
            AzanAlarmReceiver.completeWakefulIntent();

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(NOTIFICATION_ID);
                }
            } catch (Exception e) {
                Log.w(TAG, "Error stopping foreground notification", e);
            }

            if (sActiveInstance == this) {
                sActiveInstance = null;
            }
            stopSelf();
        }
    }

    private void postFallbackNotification(String prayerName, String cityName) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

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

            Intent openAppIntent = new Intent(this, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("from_azan_alarm", true);
            PendingIntent pi = PendingIntent.getActivity(
                    this,
                    45006,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(R.drawable.ic_stat_notification)
                    .setContentTitle("🕌 هنگام " + prayerName + " به افق " + cityName)
                    .setContentText("وقت " + prayerName + " فرا رسیده است.")
                    .setContentIntent(pi)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setAutoCancel(true);

            nm.notify(45010, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to post fallback notification from service", e);
        }
    }

    private Notification buildNotification(String prayerName, String cityName, String reciterId) {
        String reciterName = getReciterDisplayName(reciterId);
        String title = "🕌 هنگام " + prayerName + " به افق " + cityName;
        String content = "نوای ملکوتی اذان (" + reciterName + ")";

        // Intent to launch MainActivity when notification body is clicked
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openAppIntent.putExtra("from_azan_alarm", true);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this,
                45002,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Action button to stop Azan audio
        Intent stopIntent = new Intent(this, AzanAlarmReceiver.class);
        stopIntent.setAction(AzanAlarmReceiver.ACTION_STOP_AZAN);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
                this,
                45003,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(content)
                .setSubText("اذان‌گوی هوشیار")
                .setContentIntent(contentPendingIntent)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setOngoing(true)
                .setSilent(true)
                .setAutoCancel(false)
                .addAction(android.R.drawable.ic_media_pause, "توقف اذان", stopPendingIntent);

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "پخش اذان و اوقات شرعی",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("پخش نوای ملکوتی اذان و هشدارهای اوقات شرعی هوشیار");
                // Silent on the notification channel itself to avoid duplicate sound with MediaPlayer
                channel.setSound(null, null);
                channel.enableVibration(false);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        cleanUpAndStop();
        super.onDestroy();
    }
}
