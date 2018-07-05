#!/bin/bash

screen -d -m -S sensorBoot bash -c "cd /home/pi/LiveDashboardDemo/RaspberryPi && python3 kafkaSoilProducer.py"
screen -d -m -S remoteControlBoot bash -c "cd /home/pi/LiveDashboardDemo/RaspberryPi && python3 remoteControlServer.py"

