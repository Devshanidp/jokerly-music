package com_shanmusic.com;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

public class WidgetControlReceiver extends BroadcastReceiver {
    public static final String ACTION_TOGGLE = "com_shanmusic.com.WIDGET_TOGGLE";
    public static final String ACTION_NEXT = "com_shanmusic.com.WIDGET_NEXT";
    public static final String ACTION_PREV = "com_shanmusic.com.WIDGET_PREV";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String playerAction;
        if (ACTION_TOGGLE.equals(intent.getAction())) {
            playerAction = "toggle";
        } else if (ACTION_NEXT.equals(intent.getAction())) {
            playerAction = "next";
        } else if (ACTION_PREV.equals(intent.getAction())) {
            playerAction = "prev";
        } else {
            return;
        }

        Intent launch = new Intent(context, LauncherActivity.class);
        launch.setData(Uri.parse("https://music.devshanidp.xyz/?player=" + playerAction));
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(launch);
    }
}
