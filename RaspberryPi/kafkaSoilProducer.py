import json
import random
from random import random as rand

import numpy as np
#from scipy import signal

from confluent_kafka import avro
from confluent_kafka.avro import AvroProducer

import io
import time
import math
import threading

import Adafruit_ADS1x15

FPS = 30
ALERT_EVENT_INCREASE = 3
TOTAL_ALERT_EVENT_DURATION = 20 * FPS # seconds

BROKER_URL= "192.168.1.102:9092"
SCHEMA_REGISTRY_URL = "http://192.168.1.102:8081"

AVRO_VALUE_SCHEMA = avro.load("feedSchema.avsc")

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


                val = self.adc.get_last_result()

                # Prepare Message and Send
                msg = {
                    "timestamp": int(round(time.time() * 1000)),
                    "value": val
                }

                self.producer.produce(topic=self.writeTopic, value=msg)
                self.producer.flush()

                print("Sent {}".format(time.time()))
                lastTime = now


        print("Producer for <{feedId}> quiting...".format(feedId = self.writeTopic))
        self.adc.stop_adc()



p = Producer("feedone")


p.run()
