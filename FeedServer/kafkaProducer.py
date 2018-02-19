import json
import random
from random import random as rand

from kafka import KafkaProducer
import time
import math
import threading

FPS = 30
ALERT_EVENT_INCREASE = 3
TOTAL_ALERT_EVENT_DURATION = 20 * FPS # seconds

class ProducerThread(threading.Thread):
    def __init__(self, feedId, msgQueue):
        threading.Thread.__init__(self)

        random.seed()

        self.writeTopic = feedId
        self.msgQueue = msgQueue

        self.producer = KafkaProducer(bootstrap_servers='localhost:9092')
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
            key = int(round(time.time() * 1000))
            msg = {
                "timestamp": key,
                "value": val
            }

            msg = json.dumps(msg)

            self.producer.send(self.writeTopic, key = str.encode('{}'.format(key)), value=str.encode('{}'.format(msg)))

            time.sleep(1 / self.FPS)
            self.framesElapsed += 1


        print("Producer for <{feedId}> quiting...".format(feedId = self.writeTopic))