package com.example.chris.soilmonitor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.TextView;

import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.jjoe64.graphview.series.DataPoint;

import java.util.Calendar;
import java.util.Random;

import static com.android.volley.Request.Method.GET;

/**
 * Created by chris on 29/05/18.
 */

public class BasicWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        final int count = appWidgetIds.length;

        for (int i = 0; i < count; i++) {
            int widgetId = appWidgetIds[i];

            RemoteViews remoteViews = new RemoteViews(context.getPackageName(), R.layout.widget_basic);

            fetchAndUpdate(context, widgetId, appWidgetManager);

            Intent intent = new Intent(context, BasicWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);

            remoteViews.setOnClickPendingIntent(R.id.actionButton, pendingIntent);

            remoteViews.setTextViewText(R.id.textView, "Loading...");
            remoteViews.setImageViewResource(R.id.status_icon, R.drawable.icon);
            appWidgetManager.updateAppWidget(widgetId, remoteViews);
        }
    }

    private void fetchAndUpdate(Context context, final int widgetId, final AppWidgetManager appWidgetManager) {
        final RequestQueue queue = Volley.newRequestQueue(context);

        final String SERVER_URL = "http://51.140.206.33:8000"; //getConfigValue(this, "serverurl");

        final RemoteViews remoteViews = new RemoteViews(context.getPackageName(), R.layout.widget_basic);

        final String url = SERVER_URL + "/soil/status";

        StringRequest stringRequest = new StringRequest(GET, url,
            new Response.Listener<String>() {
                @Override
                public void onResponse(final String response) {

                    if(response.toString().equals("0")) {
                        remoteViews.setImageViewResource(R.id.status_icon, R.drawable.droplet);
                        remoteViews.setTextViewText(R.id.textView, "Thirsty!");
                    } else {
                        remoteViews.setImageViewResource(R.id.status_icon, R.drawable.chilli);
                        remoteViews.setTextViewText(R.id.textView, "Ok!");
                    }


                    appWidgetManager.updateAppWidget(widgetId, remoteViews);
                }
            },
            new Response.ErrorListener() {
                @Override
                public void onErrorResponse(VolleyError error) {
                    remoteViews.setTextViewText(R.id.textView, "Error :'(");
                    remoteViews.setImageViewResource(R.id.status_icon, R.drawable.sadface);
                    appWidgetManager.updateAppWidget(widgetId, remoteViews);
                }
            }
        );

        queue.add(stringRequest);
    }
}
