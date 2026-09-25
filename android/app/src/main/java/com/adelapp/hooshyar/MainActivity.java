package com.adelapp.hooshyar;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBackupPlugin.class);
        registerPlugin(NativeAzanPlugin.class);
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
        handleAzanIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAzanIntent(intent);
    }

    private void handleAzanIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra("from_azan_alarm", false)) {
            String prayerName = intent.getStringExtra(AzanPlaybackService.EXTRA_PRAYER_NAME);
            NativeAzanPlugin.setLaunchFromAzan(true, prayerName);
        }
    }
}
