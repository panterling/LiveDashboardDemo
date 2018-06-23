import json
import random
from random import random as rand

import numpy as np
#from scipy import signal

from confluent_kafka import avro
from confluent_kafka.avro import AvroProducer

import os
import io
import time
import math
import threading

import Adafruit_ADS1x15

import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(21,GPIO.OUT)

os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')


FPS = 30
ALERT_EVENT_INCREASE = 3
TOTAL_ALERT_EVENT_DURATION = 20 * FPS # seconds

BROKER_URL= "209.97.137.81:9092"
SCHEMA_REGISTRY_URL = "http://209.97.137.81:8081"

AVRO_VALUE_SCHEMA = avro.load("../FeedServer/res/soilappSchema.avsc")


def read_temp():

    def temp_raw():
        f = open("/sys/bus/w1/devices/28-001898432182/w1_slave", 'r')
        lines = f.readlines()
        f.close()
        return lines

    lines = temp_raw()
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.1)
        lines = temp_raw()

    temp_output = lines[1].find('t=')

    if temp_output != -1:
        temp_string = lines[1].strip()[temp_output+2:]
        temp_c = float(temp_string) / 1000.0
        return temp_c
    else:
        return -1


class Producer():
    def __init__(self, feedId):

        random.seed()

        self.writeTopic = feedId

        self.producer = AvroProducer({
            'bootstrap.servers': BROKER_URL, 
            'schema.registry.url': SCHEMA_REGISTRY_URL},
            default_value_schema = AVRO_VALUE_SCHEMA)



        # Sensor Setup
        self.adc = Adafruit_ADS1x15.ADS1115()
        # Choose a gain of 1 for reading voltages from 0 to 4.09V.
        # Or pick a different gain to change the range of voltages that are read:
        #  - 2/3 = +/-6.144V
        #  -   1 = +/-4.096V
        #  -   2 = +/-2.048V
        #  -   4 = +/-1.024V
        #  -   8 = +/-0.512V
        #  -  16 = +/-0.256V
        # See table 3 in the ADS1015/ADS1115 datasheet for more info on gain.
        self.adc.start_adc(0, gain=1)





    def run(self):
        PERIOD = 1
        lastTime = time.time()

        print("Starting Tx")
        while True:
            now = time.time()
            diff = now - lastTime

            if diff < PERIOD:
                print("Waiting...")
                time.sleep(PERIOD - diff)
            else:

                GPIO.output(21, GPIO.HIGH)
                time.sleep(0.1)
                moistureVal = self.adc.get_last_result()
                GPIO.output(21, GPIO.LOW)

                temperatureVal = read_temp()

                # Prepare Message and Send
                msg = {
                    "timestamp": int(round(time.time() * 1000)),
                    "value": -1,
                    "moisture": moistureVal,
                    "temperature": temperatureVal
                }

                self.producer.produce(topic=self.writeTopic, value=msg)
                self.producer.flush()

                print("Sent m({}) t({}) @ {}".format(temperatureVal, moistureVal, time.time()))
                lastTime = now


        print("Producer for <{feedId}> quiting...".format(feedId = self.writeTopic))
        self.adc.stop_adc()



p = Producer("soilapp")


p.run()
