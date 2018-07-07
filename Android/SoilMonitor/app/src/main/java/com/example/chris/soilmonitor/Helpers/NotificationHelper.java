package com.example.chris.soilmonitor.Helpers;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.support.v4.app.NotificationCompat;

import com.example.chris.soilmonitor.Activities.PlantOverviewActivity;
import com.example.chris.soilmonitor.Activities.SettingsActivity;
import com.example.chris.soilmonitor.R;

/**
 * Created by chris on 07/07/18.
 */

public class NotificationHelper {

    public static void makeNotification(Context context, int currentValue) {
        final Intent soilAppIntent = new Intent(context, PlantOverviewActivity.class);
        soilAppIntent.putExtra("doWwaterPlants", true);

        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, soilAppIntent, PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(context)
                .setSmallIcon(R.drawable.water_drop_full)
                .setContentTitle("Soil Monitor - Low Moisture Level")
                .setContentText(String.format("Soil moisture is %d%% - Click to water them!", currentValue))
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(0, mBuilder.build());
    }

    public static void cancelAll(Context context) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancelAll();
    }
}
