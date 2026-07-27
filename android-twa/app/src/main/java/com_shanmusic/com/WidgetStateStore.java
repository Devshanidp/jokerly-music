package com_shanmusic.com;

import android.content.Context;
import android.content.SharedPreferences;

public final class WidgetStateStore {
    private static final String PREFS = "now_playing_widget";

    private WidgetStateStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void save(
            Context context,
            String title,
            String artist,
            String imageUrl,
            boolean playing) {
        prefs(context)
                .edit()
                .putString("title", title == null ? "" : title)
                .putString("artist", artist == null ? "" : artist)
                .putString("image", imageUrl == null ? "" : imageUrl)
                .putBoolean("playing", playing)
                .putLong("updated_at", System.currentTimeMillis())
                .apply();
    }

    public static String getTitle(Context context) {
        return prefs(context).getString("title", "");
    }

    public static String getArtist(Context context) {
        return prefs(context).getString("artist", "");
    }

    public static String getImage(Context context) {
        return prefs(context).getString("image", "");
    }

    public static boolean isPlaying(Context context) {
        return prefs(context).getBoolean("playing", false);
    }

    public static boolean hasTrack(Context context) {
        return !getTitle(context).isEmpty();
    }
}
