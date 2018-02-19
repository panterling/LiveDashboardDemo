import QueueManager
import app as WebServer

import os
import multiprocessing
import subprocess

# Start Kafka
kafkaStartArgs = ["/opt/kafka/kafka_2.11-0.11.0.0/bin/kafka-server-start.sh", "/opt/kafka/kafka_2.11-0.11.0.0/config/server.properties"]
subprocess.Popen(kafkaStartArgs) #, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

# Build the JS
webpackResult = subprocess.Popen(["webpack"])

WebServerProcess = multiprocessing.Process(target = WebServer.main)
QueueManagerProcess = multiprocessing.Process(target = QueueManager.main)

WebServerProcess.start()
QueueManagerProcess.start()

WebServerProcess.join()
QueueManagerProcess.join()