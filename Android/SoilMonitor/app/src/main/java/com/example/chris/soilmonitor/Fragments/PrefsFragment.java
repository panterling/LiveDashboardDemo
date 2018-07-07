package com.example.chris.soilmonitor.Fragments;

import android.os.Bundle;
import android.preference.PreferenceFragment;

import com.example.chris.soilmonitor.R;

/**
 * Created by chris on 06/07/18.
 */

public class PrefsFragment extends PreferenceFragment {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preferences);
    }
}