package com.example.chris.soilmonitor;

import android.content.Context;
import android.content.res.Resources;
import android.os.Handler;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.Request.Method;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.JsonRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.jjoe64.graphview.GraphView;
import com.jjoe64.graphview.helper.DateAsXAxisLabelFormatter;
import com.jjoe64.graphview.helper.StaticLabelsFormatter;
import com.jjoe64.graphview.series.BarGraphSeries;
import com.jjoe64.graphview.series.DataPoint;
import com.jjoe64.graphview.series.LineGraphSeries;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Properties;
import java.util.Timer;
import java.util.TimerTask;

import static com.android.volley.Request.Method.GET;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        final String SERVER_URL = getConfigValue(this, "serverurl");


        // Instantiate the RequestQueue.
        final RequestQueue queue = Volley.newRequestQueue(this);


        DataPoint[] baseDataPoints = new DataPoint[50];
        final Calendar calendar = Calendar.getInstance();

        Long nowMillis = calendar.getTimeInMillis();

        for(int i = 0; i < 49; i++) {
            baseDataPoints[i] = new DataPoint(nowMillis - (1000 * (50 - 1)), 12500);
        }

        baseDataPoints[49] = new DataPoint(nowMillis, 12501);

        final GraphView graphRealtime = (GraphView) findViewById(R.id.graph);
        final LineGraphSeries<DataPoint> series = new LineGraphSeries<>(baseDataPoints);
        graphRealtime.addSeries(series);

        graphRealtime.getGridLabelRenderer().setLabelFormatter(new DateAsXAxisLabelFormatter(this, new SimpleDateFormat("hh:mm:ss")));
        graphRealtime.getGridLabelRenderer().setNumHorizontalLabels(4); // only 4 because of the space
        graphRealtime.getGridLabelRenderer().setHumanRounding(false);
        graphRealtime.getGridLabelRenderer().setPadding(32);

        graphRealtime.getViewport().setXAxisBoundsManual(true);
        graphRealtime.getViewport().setMinX(nowMillis - 1000 * 45);
        graphRealtime.getViewport().setMaxX(nowMillis);

        graphRealtime.getViewport().setYAxisBoundsManual(true);
        graphRealtime.getViewport().setMinY(9000);
        graphRealtime.getViewport().setMaxY(13000);




        new Timer().scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {



                        final String url = SERVER_URL + "/soil/";
                        StringRequest stringRequest = new StringRequest(GET, url,


                                new Response.Listener<String>() {
                                    @Override
                                    public void onResponse(String response) {

                                        final String responseString = response.toString();

                                        runOnUiThread(new Runnable() {

                                            @Override
                                            public void run() {
                                                final TextView mTextView = (TextView) findViewById(R.id.mytext);

                                                mTextView.setText("Response is: " + responseString);

                                                String rString = responseString;
                                                String[] parts = rString.split(",");


                                                long nextTime = Calendar.getInstance().getTimeInMillis();
                                                Log.i("info", String.valueOf(nextTime) + " vs " + parts[1]);

                                                series.appendData(new DataPoint(nextTime, Double.parseDouble(parts[0])), true, 100);

                                            }
                                        });

                                    }
                                }, new Response.ErrorListener() {
                            @Override
                            public void onErrorResponse(VolleyError error) {
                                runOnUiThread(new Runnable() {

                                    @Override
                                    public void run() {
                                        final TextView mTextView = (TextView) findViewById(R.id.mytext);
                                        mTextView.setText("That didn't work!");
                                    }
                                });
                            }
                        });

                        // Add the request to the RequestQueue.
                        queue.add(stringRequest);

                    }
                });


            }
        }, 0, 500);




        // HOURLY GRAPH
        final GraphView graphHourly = (GraphView) findViewById(R.id.hourlygraph);

        final BarGraphSeries<DataPoint> hourlySeries = new BarGraphSeries<>(new DataPoint[] {
                new DataPoint(0, 0),
                new DataPoint(1, 5),
                new DataPoint(2, 0),
                new DataPoint(3, 5),
                new DataPoint(4, 0)
        });

        graphHourly.addSeries(hourlySeries);
        hourlySeries.setSpacing(50);

        graphHourly.getGridLabelRenderer().setNumHorizontalLabels(5);
        graphHourly.getGridLabelRenderer().setHumanRounding(false);
        graphHourly.getGridLabelRenderer().setPadding(100);

        // Axis Labels
        StaticLabelsFormatter staticLabelsFormatter = new StaticLabelsFormatter(graphHourly);
        staticLabelsFormatter.setHorizontalLabels(new String[] {"Nothing", "to", "show", "here", "yet!"});
        graphHourly.getGridLabelRenderer().setLabelFormatter(staticLabelsFormatter);


        StringRequest hourlyRequest = new StringRequest(SERVER_URL + "/soil/hourly",


                new Response.Listener<String>() {
                    @Override
                    public void onResponse(final String jsonData) {

                        runOnUiThread(new Runnable() {

                            @Override
                            public void run() {

                                try {

                                    JSONArray jsonArray = new JSONArray(jsonData);

                                    DataPoint[] newData = new DataPoint[jsonArray.length()];
                                    String[] newLabels = new String[jsonArray.length()];

                                    for (int i = 0; i < jsonArray.length(); i++) {
                                        JSONObject jo = jsonArray.getJSONObject(i);

                                        String label = jo.getString("label");
                                        Double value = jo.getDouble("value");
                                        Integer hour = jo.getInt("hour");


                                        newData[i] = new DataPoint(i, value);
                                        newLabels[i] = label.split(":")[0];
                                    }


                                    hourlySeries.resetData(newData);

                                    StaticLabelsFormatter staticLabelsFormatter = new StaticLabelsFormatter(graphHourly);
                                    staticLabelsFormatter.setHorizontalLabels(newLabels);
                                    graphHourly.getGridLabelRenderer().setLabelFormatter(staticLabelsFormatter);

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
                        final TextView mTextView = (TextView) findViewById(R.id.mytext);
                        mTextView.setText("Hourly Load Failed :'(");
                    }
                });
            }
        });

        hourlyRequest.setRetryPolicy(new DefaultRetryPolicy(
                10000,
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));
        // Add the request to the RequestQueue.
        queue.add(hourlyRequest);


    }


    public static String getConfigValue(Context context, String name) {
        Resources resources = context.getResources();

        try {
            InputStream rawResource = resources.openRawResource(R.raw.config);
            Properties properties = new Properties();
            properties.load(rawResource);
            return properties.getProperty(name);
        } catch (Resources.NotFoundException e) {
            Log.e("configLoad", "Unable to find the config file: " + e.getMessage());
        } catch (IOException e) {
            Log.e("configLoad", "Failed to open config file.");
        }

        return null;
    }

}
