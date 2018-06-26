import json
import random
from random import random as rand

import numpy as np
from scipy import signal

from confluent_kafka import avro
from confluent_kafka.avro import AvroProducer

import io
import time
import math
import threading

FPS = 30
ALERT_EVENT_INCREASE = 3
TOTAL_ALERT_EVENT_DURATION = 20 * FPS # seconds

BROKER_URL= "209.97.137.81:9092"
SCHEMA_REGISTRY_URL = "http://209.97.137.81:8081"

AVRO_VALUE_SCHEMA = avro.load("FeedServer/res/feedSchema.avsc")

class ProducerThread(threading.Thread):
    def __init__(self, feedId, msgQueue):
        threading.Thread.__init__(self)

        random.seed()

        self.writeTopic = feedId
        self.msgQueue = msgQueue

        self.producer = AvroProducer({
            'bootstrap.servers': BROKER_URL, 
            'schema.registry.url': SCHEMA_REGISTRY_URL}, 
            default_value_schema = AVRO_VALUE_SCHEMA)


        self.FPS = FPS
        self.framesElapsed = int(1000 * rand())
        self.baseValue = round(rand() * 10, 1)

    def run(self):
        alive = True
        inAlertEvent = False
        currentAlertEventDuration = 0

        while alive:
            # Check for messages
            try:
                msg = self.msgQueue.get(block=False)
                if msg == -1:
                    alive = False
                    continue

            except:
                pass

                # Do some work



            # Check: Start an inAlertEvent?
            if not inAlertEvent and (self.framesElapsed % (self.FPS * 5) == 0):
                print("Starting Alert Event")
                inAlertEvent = True


            # Compute value
            t = self.framesElapsed / self.FPS

            if False: #rand() > 0.5:
                sig = np.sin(2 * np.pi * t)
                s = signal.square(2 * np.pi * 30 * t, duty=(sig + 1)/2)
                val = self.baseValue + s
            else:
                val = self.baseValue + (math.sin(t) + (rand() - 0.5) * 0.2)

            if inAlertEvent:
                progress = (currentAlertEventDuration / TOTAL_ALERT_EVENT_DURATION)

                if progress >= 1:
                    print("Ending Alert Event")
                    inAlertEvent = False
                    currentAlertEventDuration = 0

                else:
                    val += ALERT_EVENT_INCREASE * progress
                    currentAlertEventDuration += 1


            # Prepare Message and Send
            msg = {
                "timestamp": int(round(time.time() * 1000)),
                "value": val
            }

            self.producer.produce(topic=self.writeTopic, value=msg)
            self.producer.flush()

            time.sleep(1 / self.FPS)
            self.framesElapsed += 1


        print("Producer for <{feedId}> quiting...".format(feedId = self.writeTopic))


    