import json
import random
import traceback
from random import random as rand

import numpy as np

from confluent_kafka import avro, KafkaException
from confluent_kafka.avro import AvroProducer

import os
import io
import time
import math
import threading

import Adafruit_ADS1x15

import RPi.GPIO as GPIO
import time



    
TEMP_SENSOR_DIR = "28-001898432182"
TEMP_SENSOR_ONOFF_PIN = 7
    
BROKER_URL= "209.97.137.81:9092"
SCHEMA_REGISTRY_URL = "http://209.97.137.81:8081"
AVRO_DEFAULT_SCHEMA_URL = "../FeedServer/res/soilappSchema.avsc"





def raspberryPiSetup():
    os.system('modprobe w1-gpio')
    os.system('modprobe w1-therm')
    
    GPIO.setmode(GPIO.BCM)
    
    GPIO.setup(21,GPIO.OUT)    
    GPIO.setup(TEMP_SENSOR_ONOFF_PIN,GPIO.OUT)


def readMoistureValue(adc):
    GPIO.output(21, GPIO.HIGH)
    time.sleep(0.1)
    moistureVal = adc.get_last_result()
    GPIO.output(21, GPIO.LOW)
    
    return moistureVal
    
def readTemperatureValue():

    def temp_raw():
        f = open("/sys/bus/w1/devices/{}/w1_slave".format(TEMP_SENSOR_DIR), 'r')
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

        
def restartTemperatureSensor():
    try:
        # Power cycle the temperature sensor via the transistor on its ground cable
        GPIO.output(TEMP_SENSOR_ONOFF_PIN, GPIO.LOW)
        time.sleep(4)
        GPIO.output(TEMP_SENSOR_ONOFF_PIN, GPIO.HIGH)
        os.system('modprobe w1-gpio')
        os.system('modprobe w1-therm')

        print("Giving Temperature probe time to turn on...")
        time.sleep(4)        

    except:
        pass
    
    

class Producer():
    def __init__(self, feedId):

        random.seed()

        self.writeTopic = feedId

        self.producer = AvroProducer({
            'bootstrap.servers': BROKER_URL,
            'schema.registry.url': SCHEMA_REGISTRY_URL},
            default_value_schema = avro.load(AVRO_DEFAULT_SCHEMA_URL))



        # Moisture Sensor Setup
        # Choose a gain of 1 for reading voltages from 0 to 4.09V.
        # Or pick a different gain to change the range of voltages that are read:
        #  - 2/3 = +/-6.144V
        #  -   1 = +/-4.096V
        #  -   2 = +/-2.048V
        #  -   4 = +/-1.024V
        #  -   8 = +/-0.512V
        #  -  16 = +/-0.256V
        # See table 3 in the ADS1015/ADS1115 datasheet for more info on gain.
        self.adc = Adafruit_ADS1x15.ADS1115()
        self.adc.start_adc(0, gain=1)
        
        
        # Temperature Sensor Setup
        GPIO.output(TEMP_SENSOR_ONOFF_PIN, GPIO.HIGH)





    def run(self):
        PERIOD = 1   # seconds
        
        lastTime = time.time()
        alive = True
        
        print("Starting Tx")
        while alive:
            now = time.time()
            diff = now - lastTime

            if diff < PERIOD:
                print("Waiting...")
                time.sleep(PERIOD - diff)
                
            else:

            
                try:

                    moistureVal = readMoistureValue(self.adc)

                    temperatureVal = readTemperatureValue()

                    # Prepare Message and Send
                    msg = {
                        "timestamp": int(round(time.time() * 1000)),
                        "value": -1, # UNUSED
                        "moisture": moistureVal,
                        "temperature": temperatureVal
                    }

                    self.producer.produce(topic = self.writeTopic, value = msg)
                    self.producer.flush()

                    print("Sent t({}) m({}) @ {}".format(temperatureVal, moistureVal, time.time()))
                    lastTime = now
                    
                except IOError as ioe:
                    # Assuming Temp probe gone offline
                    print("IOError: Assuming temperature probe has gone offline - restarting")
                    print(ioe)
                    traceback.print_exc()
                    
                    restartTemperatureSensor()
                    
                except KafkaException:
                    # TODO: Enumerate and handle KafkaExceptions....
                    print("KafkaException: TODO....")
                    pass
                    
                #except Exception as e:
                #    # TODO: Enumerate and handle KafkaExceptions....
                #    print("Exception: General unhandled exception - Hande as-and-when... ")
                #    print(e)
                #    pass

                
        print("Producer for <{feedId}> quiting...".format(feedId = self.writeTopic))
        
        
        self.adc.stop_adc()
        GPIO.output(TEMP_SENSOR_ONOFF_PIN, GPIO.LOW)



raspberryPiSetup()

p = Producer(feedId = "soilapp")

p.run()




