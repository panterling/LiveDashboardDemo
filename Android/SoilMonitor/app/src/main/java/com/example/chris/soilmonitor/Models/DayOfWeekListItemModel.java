package com.example.chris.soilmonitor.Models;

/**
 * Created by chris on 02/06/18.
 */

public class DayOfWeekListItemModel {

    public String dayOfWeek = null;
    public int moisturePercentage = 0;

    public DayOfWeekListItemModel(String dayOfWeek, int moisturePercentage) {
        this.dayOfWeek = dayOfWeek;
        this.moisturePercentage = moisturePercentage;
    }
}
