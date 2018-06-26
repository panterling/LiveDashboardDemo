package com.example.chris.soilmonitor.Monitors;

import java.util.Date;

/**
 * Created by chris on 06/06/18.
 */

public class HealthMonitor {

    final long MAX_TIME_SINCE_LAST_UPDATE = 3 * 1000;

    private long lastUpdateReceived = (new Date()).getTime();

    public HealthMonitor() { }

    public void giveUpdate(long timestamp) {
        if(timestamp > lastUpdateReceived) {
            this.lastUpdateReceived = timestamp;
        }
    }

    private void pushStatus() {
    }

    public boolean getStatus() {
        //HealthMonitorStatus status =
        boolean status = false;
        if(((new Date()).getTime() - lastUpdateReceived) < MAX_TIME_SINCE_LAST_UPDATE) {
            status = true;
        }

        return status;
    }
}
