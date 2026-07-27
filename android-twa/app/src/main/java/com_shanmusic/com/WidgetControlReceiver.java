package com_shanmusic.com;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

public class WidgetControlReceiver extends BroadcastReceiver {
    public static final String ACTION_TOGGLE = "com_shanmusic.com.WIDGET_TOGGLE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        if (!ACTION_TOGGLE.equals(intent.getAction())) {
            return;
        }

        Intent launch = new Intent(context, LauncherActivity.class);
        launch.setData(Uri.parse("https://music.devshanidp.xyz/?player=toggle"));
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(launch);
    }
}
