package com.example.chris.soilmonitor.Misc;

import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import com.example.chris.soilmonitor.Activities.PlantOverviewActivity;
import com.example.chris.soilmonitor.R;

import org.w3c.dom.Text;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

/**
 * Created by chris on 02/07/18.
 */

public class WateringClient extends AsyncTask<String, String, Boolean> {

    public PlantOverviewActivity activity;
    private Exception exception;
    SharedPreferences sharedPrefs;

    public WateringClient(PlantOverviewActivity a)
    {
        this.activity = a;
        sharedPrefs = PreferenceManager.getDefaultSharedPreferences(a);
    }


    @Override
    protected Boolean doInBackground(String[] params) {
        boolean result = false;

        String logTAG = "WateringError";
        Log.i(logTAG, "onClick: WATER!");

        try{

            Socket socket = new Socket(params[0], 8888);
            BufferedReader input = new BufferedReader(new InputStreamReader(socket.getInputStream()));

            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);

            // Welcome Message
            String msg = input.readLine();

            publishProgress(new String[] {msg});

            String duration = sharedPrefs.getString("etWateringDuration", "2");

            int durationMillis = Integer.parseInt(duration) * 1000;

            out.write("1W" + duration);
            out.flush();

            // TODO: Real responses

            try {
                boolean done = false;
                long start = System.currentTimeMillis();
                socket.setSoTimeout(2000);

                while(!done && (System.currentTimeMillis() - start) < durationMillis + 2000) {
                    msg = input.readLine();
                    publishProgress(new String[]{msg});

                    if(msg == "done") {
                        done = true;
                    }
                }

            } catch(Exception e){
                Log.e("", "doInBackground: ", e);
            }

            publishProgress(new String[]{" >> CLOSING CONNECTION <<"});
            Thread.sleep(1000);

            result = true;

            socket.close();

        } catch(Exception e) {
            Log.e(logTAG, "err", e);
        }

        return result;
    }

    @Override
    protected void onPreExecute() {
        super.onPreExecute();

        activity.runOnUiThread(new Runnable() {

            @Override
            public void run() {
                final ImageView ivMoistureIcon = (ImageView) activity.findViewById(R.id.ivMoistureIcon);
                ivMoistureIcon.setClickable(false);
                ivMoistureIcon.setImageResource(R.drawable.water_drop_outline_white);

                TextView tvSensorServerConsole = (TextView) activity.findViewById(R.id.tvSensorServerConsole);
                tvSensorServerConsole.setVisibility(View.VISIBLE);

                tvSensorServerConsole.setText("# Raspberry Pi Remote Control");
            }
        });

    }

    @Override
    protected void onPostExecute(Boolean result) {
        super.onPostExecute(result);

        String outcomeMessage = "No outcome set....";
        if(result) {
            outcomeMessage = "Watered Plants!";

            activity.updateHourly();
        } else {
            outcomeMessage = "Unable to water plants :(";
        }

        final String finalOutcomeMessage = outcomeMessage;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final ImageView ivMoistureIcon = (ImageView) activity.findViewById(R.id.ivMoistureIcon);
                ivMoistureIcon.setImageResource(R.drawable.water_drop_full);
                ivMoistureIcon.setClickable(true);

                TextView tvSensorServerConsole = (TextView) activity.findViewById(R.id.tvSensorServerConsole);
                tvSensorServerConsole.setVisibility(View.INVISIBLE);

                Toast.makeText(activity, finalOutcomeMessage, Toast.LENGTH_LONG).show();
            }
        });

    }

    @Override
    protected void onProgressUpdate(String[] params) {
        super.onProgressUpdate(params);

        TextView tvSensorServerConsole = (TextView) activity.findViewById(R.id.tvSensorServerConsole);

        String nextMessage = params[0];
        String currentText = tvSensorServerConsole.getText().toString();
        tvSensorServerConsole.setText(currentText + "\n" + ">>> " + nextMessage);

    }
}