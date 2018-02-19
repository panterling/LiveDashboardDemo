from kafka import KafkaConsumer

import threading

class ConsumerThread(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)

        self.consumer = KafkaConsumer('spark-output-topic')

    def run(self):
        for msg in self.consumer:
            print (msg)