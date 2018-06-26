package com.example.chris.soilmonitor.Adapters;


import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.TextView;

import com.example.chris.soilmonitor.Models.DayOfWeekListItemModel;
import com.example.chris.soilmonitor.R;

import java.util.ArrayList;

public class DayOfWeekAdapter extends ArrayAdapter<DayOfWeekListItemModel> {

    private ArrayList<DayOfWeekListItemModel> items;

    public DayOfWeekAdapter(Context context, int textViewResourceId, ArrayList<DayOfWeekListItemModel> items) {
        super(context, textViewResourceId, items);
        this.items = items;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        View v = convertView;
        if (v == null) {
            LayoutInflater vi = (LayoutInflater) getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            v = vi.inflate(R.layout.plant_overview_day_of_week_listitem, null);
        }


        DayOfWeekListItemModel o = items.get(position);
        if (o != null) {
            TextView tvDayOfWeek = (TextView) v.findViewById(R.id.dow);
            tvDayOfWeek.setText(o.dayOfWeek);

            TextView tvMoisturePerecentage = (TextView) v.findViewById(R.id.tvMoisturePercentage);
            tvMoisturePerecentage.setText(Integer.toString(o.moisturePercentage) + "%");

        }
        return v;
    }
}