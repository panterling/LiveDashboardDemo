package com.example.chris.soilmonitor.Helpers;

import android.content.Context;
import android.content.res.Resources;
import android.util.Log;

import com.example.chris.soilmonitor.R;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Created by chris on 07/06/18.
 */

public class MiscHelpers {

    public static int toDP(int dps, Context context){
        final float scale = context.getResources().getDisplayMetrics().density;
        return (int) (dps * scale + 0.5f);
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
