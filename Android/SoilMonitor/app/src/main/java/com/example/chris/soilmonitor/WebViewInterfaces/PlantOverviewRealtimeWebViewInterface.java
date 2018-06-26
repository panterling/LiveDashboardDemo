package com.example.chris.soilmonitor.WebViewInterfaces;

import android.app.Activity;
import android.content.Context;
import android.graphics.Point;
import android.util.Log;
import android.view.Display;
import android.webkit.JavascriptInterface;
import android.widget.TextView;

import com.example.chris.soilmonitor.Activities.PlantOverviewActivity;
import com.example.chris.soilmonitor.Helpers.MiscHelpers;
import com.example.chris.soilmonitor.Monitors.HealthMonitor;
import com.example.chris.soilmonitor.R;

import java.util.Date;

import static android.hardware.SensorManager.SENSOR_MIN;

/**
* Created by chris on 07/06/18.
*/

public class PlantOverviewRealtimeWebViewInterface {
    Context context;
    HealthMonitor healthMonitor;

    boolean requstsAreActive = true;

    public PlantOverviewRealtimeWebViewInterface(Context c, HealthMonitor healthMonitor) {
        this.context = c;
        this.healthMonitor = healthMonitor;
    }
    @JavascriptInterface
    public int getWidth() {
        Display display = getActivity().getWindowManager().getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);

        return 340;
    }

    @JavascriptInterface
    public String getAPIURL() {
        return MiscHelpers.getConfigValue(getActivity(), "serverurlbase") + "/soil";
    }

    @JavascriptInterface
    public String getSensorMinThreshold() {
        return MiscHelpers.getConfigValue(getActivity(), "sensormin");
    }

    @JavascriptInterface
    public String getSensorMaxThreshold() {
        return MiscHelpers.getConfigValue(getActivity(), "sensormax");
    }


    @JavascriptInterface
    public boolean realtimeRequestsActive() {
        return this.requstsAreActive;
    }

    public void stopRequests() {
        this.requstsAreActive = false;
        Log.i("*" + this.getClass().toString(), "stopRequests: ");
    }

    public void startRequests() {
        this.requstsAreActive = true;
        Log.i(this.getClass().toString(), "startRequests: ");
    }

    @JavascriptInterface
    public void latestValueCallback(final String current, final String temperature, final String min, final String max, final String timestamp) {

        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                TextView tvCurrentPercentage = (TextView) getActivity().findViewById(R.id.tvCurrentPercentage);
                TextView tvMaxPercentage = (TextView) getActivity().findViewById(R.id.tvMaxPercentage);
                TextView tvMinPercentage = (TextView) getActivity().findViewById(R.id.tvMinPercentage);
                TextView tvTemperature = (TextView) getActivity().findViewById(R.id.tvTemperature);

                String newVal = "--";
                String newMin = "--";
                String newMax = "--";
                String newTemperature = "--";

                try {
                    final int SENSOR_MIN = Integer.parseInt(MiscHelpers.getConfigValue(getActivity(), "sensormin"));
                    final int SENSOR_MAX = Integer.parseInt(MiscHelpers.getConfigValue(getActivity(), "sensormax"));

                    newVal = convertToPercentageString(current);
                    newMin = Integer.toString(Math.min(Integer.parseInt(convertToPercentageString(min)), 0));
                    newMax = Integer.toString(Math.min(Integer.parseInt(convertToPercentageString(max)), 100));
                    newTemperature = temperature;

                    // Notify health monitor
                    if (healthMonitor != null) {
                        healthMonitor.giveUpdate((new Date()).getTime());
                    }

                } catch (Exception ex) {
                    ex.printStackTrace();
                }

                tvCurrentPercentage.setText(newVal + "%");
                tvMaxPercentage.setText("△ " + newMax + "%");
                tvMinPercentage.setText("▽ " + newMin + "%");
                tvTemperature.setText(newTemperature + "℃");
            }
        });
    }

    public String convertToPercentageString(String val) {
        final int SENSOR_MIN = Integer.parseInt(MiscHelpers.getConfigValue(getActivity(), "sensormin"));
        final int SENSOR_MAX = Integer.parseInt(MiscHelpers.getConfigValue(getActivity(), "sensormax"));

        int intVal = Integer.parseInt(val);
        double rawPercent = ((intVal - SENSOR_MIN) / (float) (SENSOR_MAX - SENSOR_MIN));
        intVal = (int) ((1 - rawPercent) * 100);
        return Integer.toString(intVal);

    }

    public Activity getActivity() {
        return ((Activity) context);
    }
}
