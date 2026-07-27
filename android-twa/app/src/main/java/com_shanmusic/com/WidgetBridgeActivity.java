package com_shanmusic.com;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Receives shansmusic://widget/sync from the web app and refreshes the home-screen widget.
 */
public class WidgetBridgeActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
        finish();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
        finish();
    }

    private void handleIntent(Intent intent) {
        if (intent == null) {
            return;
        }
        Uri uri = intent.getData();
        if (uri == null) {
            return;
        }

        String title = safe(uri.getQueryParameter("title"));
        String artist = safe(uri.getQueryParameter("artist"));
        String image = safe(uri.getQueryParameter("image"));
        String playingValue = safe(uri.getQueryParameter("playing"));
        boolean playing = "1".equals(playingValue) || "true".equalsIgnoreCase(playingValue);

        if (title.isEmpty() && artist.isEmpty()) {
            return;
        }

        WidgetStateStore.save(this, title, artist, image, playing);
        WidgetRenderer.updateAllWidgets(this);
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
