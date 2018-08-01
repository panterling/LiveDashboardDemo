#!/bin/bash

screen -d -m -L -S sensorBoot bash -c "cd /home/pi/LiveDashboardDemo/RaspberryPi && python3 kafkaSoilProducer.py";
screen -d -m -L -S remoteControlBoot bash -c "cd /home/pi/LiveDashboardDemo/RaspberryPi && python3 remoteControlServer.py";

# NOIP daemon
/usr/local/bin/noip2
