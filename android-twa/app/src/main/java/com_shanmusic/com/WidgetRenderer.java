package com_shanmusic.com;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class WidgetRenderer {
    private static final ExecutorService IMAGE_EXECUTOR = Executors.newSingleThreadExecutor();

    private WidgetRenderer() {}

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, NowPlayingWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids == null || ids.length == 0) {
            return;
        }
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    private static PendingIntent controlIntent(Context context, String action) {
        Intent intent = new Intent(context, WidgetControlReceiver.class);
        intent.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, action.hashCode(), intent, flags);
    }

    private static PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, LauncherActivity.class);
        intent.setData(Uri.parse("https://music.devshanidp.xyz/"));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, 1, intent, flags);
    }

    private static void bindControlClicks(Context context, RemoteViews views) {
        views.setOnClickPendingIntent(
                R.id.widget_play_pause, controlIntent(context, WidgetControlReceiver.ACTION_TOGGLE));
        views.setOnClickPendingIntent(
                R.id.widget_next, controlIntent(context, WidgetControlReceiver.ACTION_NEXT));
        views.setOnClickPendingIntent(
                R.id.widget_prev, controlIntent(context, WidgetControlReceiver.ACTION_PREV));
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));
        views.setOnClickPendingIntent(R.id.widget_art, openAppIntent(context));
    }

    public static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_now_playing);

        String title = WidgetStateStore.getTitle(context);
        String artist = WidgetStateStore.getArtist(context);
        String imageUrl = WidgetStateStore.getImage(context);
        boolean playing = WidgetStateStore.isPlaying(context);
        boolean hasTrack = WidgetStateStore.hasTrack(context);

        views.setTextViewText(
                R.id.widget_title,
                hasTrack ? title : context.getString(R.string.widget_empty_title));
        views.setTextViewText(
                R.id.widget_artist,
                hasTrack ? artist : context.getString(R.string.widget_empty_artist));

        views.setImageViewResource(
                R.id.widget_play_pause,
                playing ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);
        views.setImageViewResource(R.id.widget_next, R.drawable.ic_widget_next);
        views.setImageViewResource(R.id.widget_prev, R.drawable.ic_widget_prev);

        bindControlClicks(context, views);

        if (!hasTrack || imageUrl.isEmpty()) {
            views.setImageViewResource(R.id.widget_art, R.mipmap.ic_launcher);
            manager.updateAppWidget(appWidgetId, views);
            return;
        }

        manager.updateAppWidget(appWidgetId, views);
        loadArtworkAsync(context, manager, appWidgetId, imageUrl, playing, title, artist);
    }

    private static void loadArtworkAsync(
            Context context,
            AppWidgetManager manager,
            int appWidgetId,
            String imageUrl,
            boolean playing,
            String title,
            String artist) {
        IMAGE_EXECUTOR.execute(
                () -> {
                    Bitmap bitmap = fetchBitmap(imageUrl);
                    if (bitmap == null) {
                        return;
                    }
                    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_now_playing);
                    views.setTextViewText(R.id.widget_title, title);
                    views.setTextViewText(R.id.widget_artist, artist);
                    views.setImageViewBitmap(R.id.widget_art, bitmap);
                    views.setImageViewResource(
                            R.id.widget_play_pause,
                            playing ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);
                    views.setImageViewResource(R.id.widget_next, R.drawable.ic_widget_next);
                    views.setImageViewResource(R.id.widget_prev, R.drawable.ic_widget_prev);
                    bindControlClicks(context, views);
                    manager.updateAppWidget(appWidgetId, views);
                });
    }

    private static Bitmap fetchBitmap(String imageUrl) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(imageUrl).openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setInstanceFollowRedirects(true);
            connection.connect();
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                return null;
            }
            Bitmap bitmap = BitmapFactory.decodeStream(connection.getInputStream());
            if (bitmap == null) {
                return null;
            }
            int size = 256;
            return Bitmap.createScaledBitmap(bitmap, size, size, true);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
