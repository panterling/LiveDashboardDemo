package com.example.chris.soilmonitor.Activities;

import android.app.ActionBar;
import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.chris.soilmonitor.Adapters.DayOfWeekAdapter;
import com.example.chris.soilmonitor.Helpers.MiscHelpers;
import com.example.chris.soilmonitor.Misc.EmbeddedWebViewClient;
import com.example.chris.soilmonitor.Models.DayOfWeekListItemModel;
import com.example.chris.soilmonitor.Monitors.HealthMonitor;
import com.example.chris.soilmonitor.R;
import com.example.chris.soilmonitor.WebViewInterfaces.PlantOverviewRealtimeWebViewInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Timer;
import java.util.TimerTask;

public class PlantOverviewActivity extends AppCompatActivity {

    RequestQueue httpRequestQueue;
    HealthMonitor healthMonitor;
    PlantOverviewRealtimeWebViewInterface realtimeWebViewInterface;

    String SERVER_URL = "";
    int SENSOR_MIN = -1;
    int SENSOR_MAX = -1;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_plant_overview);

        // Custom Action Bar
        getSupportActionBar().setDisplayOptions(ActionBar.DISPLAY_SHOW_CUSTOM);
        getSupportActionBar().setCustomView(R.layout.actionbar);


        httpRequestQueue = Volley.newRequestQueue(this);
        SERVER_URL = MiscHelpers.getConfigValue(this, "serverurlbase");
        SENSOR_MIN = Integer.parseInt(MiscHelpers.getConfigValue(this, "sensormin"));
        SENSOR_MAX = Integer.parseInt(MiscHelpers.getConfigValue(this, "sensormax"));


        // Initialise
        healthMonitor = initConnectionMonitoring();

        initRealtimeGraphWebView();


        // Settings Menu
        Button btnLoadSettings = (Button) findViewById(R.id.btnLoadSettings);
        btnLoadSettings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getApplicationContext(), SettingsActivity.class);
                startActivity(intent);

            }
        });


        // Request data for hourly and daily views
        updateHourly();
        updateDaily();


    }

    @Override
    protected void onStop() {
        super.onStop();

        stopRealtimeRequests();
    }

    @Override
    protected void onStart() {
        super.onStart();

        startRealtimeRequests();
    }

    private void startRealtimeRequests() {
        if(realtimeWebViewInterface != null) {
            realtimeWebViewInterface.startRequests();
        }
    }
    private void stopRealtimeRequests() {
        if(realtimeWebViewInterface != null) {
            realtimeWebViewInterface.stopRequests();
        }
    }

    // Send request to API + update View on response
    private void updateDaily(){

        if(httpRequestQueue == null) {
            // TODO: Fail case
        }

        StringRequest dailyRequest = new StringRequest(SERVER_URL + "/soil/daily",


                new Response.Listener<String>() {
                    @Override
                    public void onResponse(final String jsonData) {

                        runOnUiThread(new Runnable() {

                            @Override
                            public void run() {

                                try {

                                    JSONArray jsonArray = new JSONArray(jsonData);

                                    final ArrayList<DayOfWeekListItemModel> dayModels = new ArrayList<DayOfWeekListItemModel>();

                                    for (int i = 0; i < jsonArray.length(); i++) {
                                        JSONObject jo = jsonArray.getJSONObject(i);

                                        String label = jo.getString("label");
                                        Double rawvalue = jo.getDouble("value");


                                        // UPPER CASE FIRST LETTER
                                        label = label.substring(0, 1).toUpperCase() + label.substring(1);

                                        int value = -1;
                                        try {
                                            int intVal = rawvalue.intValue();
                                            double rawPercent = ((intVal - SENSOR_MIN) / (float) (SENSOR_MAX - SENSOR_MIN));
                                            value = (int) ((1 - rawPercent) * 100);
                                        } catch (Exception ex){
                                            ex.printStackTrace();
                                        }

                                        dayModels.add(new DayOfWeekListItemModel(label, value));

                                    }

                                    ///////////////////
                                    //Day of Week - List View
                                    final ListView lv = (ListView) findViewById(R.id.lvDow);
                                    DayOfWeekAdapter arrayAdapter = new DayOfWeekAdapter(getApplicationContext(), android.R.layout.simple_list_item_1, dayModels);
                                    lv.setAdapter(arrayAdapter);
                                    lv.requestLayout();



                                } catch (JSONException e) {
                                    e.printStackTrace();
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    Log.e("", "Error occured when updating the daily listview", e);
                                }

                            }
                        });

                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // TODO
                    }
                });
            }
        });

        dailyRequest.setRetryPolicy(new DefaultRetryPolicy(
                10000,
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        httpRequestQueue.add(dailyRequest);
    }

    private void updateHourly(){

        if(httpRequestQueue == null) {
            // TODO: Fail case
        }

        StringRequest hourlyRequest = new StringRequest(SERVER_URL + "/soil/hourly",


                new Response.Listener<String>() {
                    @Override
                    public void onResponse(final String jsonData) {

                        runOnUiThread(new Runnable() {

                            @Override
                            public void run() {

                                try {

                                    LayoutInflater inflater = LayoutInflater.from(getApplicationContext());
                                    LinearLayout llHourOfDay = (LinearLayout)findViewById(R.id.llHourOFDay);
                                    llHourOfDay.removeAllViews();

                                    JSONArray jsonArray = new JSONArray(jsonData);


                                    for (int i = 0; i < jsonArray.length(); i++) {
                                        JSONObject jo = jsonArray.getJSONObject(i);

                                        String label = jo.getString("label");
                                        Double rawvalue = jo.getDouble("moisture");

                                        String value = "--";
                                        try {
                                            int intVal = rawvalue.intValue();
                                            double rawPercent = ((intVal - SENSOR_MIN) / (float) (SENSOR_MAX - SENSOR_MIN));
                                            intVal = (int) ((1 - rawPercent) * 100);
                                            value = Integer.toString(intVal);
                                        } catch (Exception ex){
                                            ex.printStackTrace();
                                        }

                                        View nextCell = inflater.inflate(R.layout.plant_overview_hour_of_day_cell, null, false);
                                        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(MiscHelpers.toDP(75, getApplicationContext()), LinearLayout.LayoutParams.FILL_PARENT);
                                        params.setMargins(MiscHelpers.toDP(5, getApplicationContext()), 0, MiscHelpers.toDP(5, getApplicationContext()), 0);
                                        nextCell.setLayoutParams(params);



                                        TextView tvLabel = (TextView) nextCell.findViewById(R.id.tvHourofday);
                                        TextView tvPerc = (TextView) nextCell.findViewById(R.id.tvPercentage);

                                        tvLabel.setText(label);
                                        tvPerc.setText(value + "%");

                                        llHourOfDay.addView(nextCell);
                                        nextCell.requestLayout();
                                    }

                                    llHourOfDay.requestLayout();

                                } catch (JSONException e) {
                                    e.printStackTrace();
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    Log.e("", "Error occured when updating the 'graphHourly' GraphView", e);
                                }

                            }
                        });

                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                runOnUiThread(new Runnable() {

                    @Override
                    public void run() {
                    }
                });
            }
        });

        hourlyRequest.setRetryPolicy(new DefaultRetryPolicy(
                10000,
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        // Add the request to the RequestQueue.
        httpRequestQueue.add(hourlyRequest);

    }


    private HealthMonitor initConnectionMonitoring() {

        final ImageView ivConnectionIcon = (ImageView) findViewById(R.id.ivConnectionIcon);

        final HealthMonitor healthMonitor = new HealthMonitor();

        Timer timer = new Timer();

        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                boolean status = healthMonitor.getStatus();
                Log.i("Connection Health", "Status: " + (status ? " Connected" : "Disconnected"));

                final int resourceId = status ? R.drawable.connected : R.drawable.disconnected;

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        ivConnectionIcon.setImageResource(resourceId);
                    }
                });

            }
        }, 0, 3000);

        return healthMonitor;
    }

    private void initRealtimeGraphWebView() {

        // WebView Test
        WebView myWebView = (WebView) findViewById(R.id.wvRealtimeGraph);

        myWebView.setWebViewClient(new EmbeddedWebViewClient()); // EMBED WITHIN WEBVIEW COMPONENT
        myWebView.getSettings().setJavaScriptEnabled(true); // EMBED WITHIN WEBVIEW COMPONENT
        myWebView.getSettings().setAllowFileAccessFromFileURLs(true); // JSON TO EXTERNAL URL
        myWebView.getSettings().setAllowUniversalAccessFromFileURLs(true);
        myWebView.setBackgroundColor(0x00000000); // TRANSPARENT

        realtimeWebViewInterface = new PlantOverviewRealtimeWebViewInterface(this, healthMonitor);
        myWebView.addJavascriptInterface(realtimeWebViewInterface, "Android");

        myWebView.loadUrl("file:///android_asset/plant_overview_realtime_graph.html");
    }


}
