package com.pokefantasy.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    private static final String PREFS = "pokefantasy_prefs";
    private static final String KEY_TOKEN_RESET = "fcm_token_reset_v1";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_TOKEN_RESET, false)) {
            // Delete cached token once so the next register() generates a fresh one
            FirebaseMessaging.getInstance().deleteToken()
                .addOnCompleteListener(task -> {
                    prefs.edit().putBoolean(KEY_TOKEN_RESET, true).apply();
                    Log.d("FCM", "Token cache cleared — fresh token will be issued on next register()");
                });
        }
    }
}
