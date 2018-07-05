package com.example.chris.soilmonitor.Activities;

import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.View;
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
import com.example.chris.soilmonitor.Models.DayOfWeekListItemModel;
import com.example.chris.soilmonitor.R;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Timer;
import java.util.TimerTask;

public class SettingsActivity extends AppCompatActivity {
    RequestQueue httpRequestQueue;
    String SERVER_URL = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);



        httpRequestQueue = Volley.newRequestQueue(this);
        SERVER_URL = MiscHelpers.getConfigValue(this, "serverurlbase");

        final StringRequest dailyRequest = new StringRequest(SERVER_URL + "/soil/systemStatus",


                new Response.Listener<String>() {
                    @Override
                    public void onResponse(final String jsonData) {

                        runOnUiThread(new Runnable() {

                            @Override
                            public void run() {

                                try {

                                    JSONObject jo = new JSONObject(jsonData);

                                    String sensorIP = jo.getString("sensorLastKnownIP");
                                    String sensorStatus = jo.getString("sensorStatus");
                                    String dataPipelineStatus = jo.getString("dataPipelineStatus");

                                    String timeStamp = new SimpleDateFormat("HH:mm:ss").format(new java.util.Date());


                                    TextView tvSensorIP = (TextView) findViewById(R.id.tvSensorIP);
                                    TextView tvStatusAPI = (TextView) findViewById(R.id.tvStatusAPI);
                                    TextView tvStatusSensor = (TextView) findViewById(R.id.tvStatusSensor);
                                    TextView tvStatusData = (TextView) findViewById(R.id.tvStatusData);
                                    TextView tvStatusLastTime = (TextView) findViewById(R.id.tvStatusLastTime);


                                    tvStatusAPI.setText("OK");
                                    tvSensorIP.setText(sensorIP);
                                    tvStatusSensor.setText(sensorStatus);
                                    tvStatusData.setText(dataPipelineStatus);
                                    tvStatusLastTime.setText("@ " + timeStamp);




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
                        TextView tvSensorIP = (TextView) findViewById(R.id.tvSensorIP);
                        TextView tvStatusAPI = (TextView) findViewById(R.id.tvStatusAPI);
                        TextView tvStatusSensor = (TextView) findViewById(R.id.tvStatusSensor);
                        TextView tvStatusData = (TextView) findViewById(R.id.tvStatusData);

                        tvStatusAPI.setText("Unavailable");
                        tvSensorIP.setText("");
                        tvStatusSensor.setText("");
                        tvStatusData.setText("");
                    }
                });
            }
        });

        dailyRequest.setRetryPolicy(new DefaultRetryPolicy(
                10000,
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));


        Timer timer = new Timer();

        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                httpRequestQueue.add(dailyRequest);

            }
        }, 0, 5000);


    }

}
