from FeedServer import QueueManager

import os
import multiprocessing
import subprocess

# Start Kafka
kafkaStartArgs = ["/opt/kafka/kafka_2.11-0.11.0.0/bin/kafka-server-start.sh", "/opt/kafka/kafka_2.11-0.11.0.0/config/server.properties"]
subprocess.Popen(kafkaStartArgs) #, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

# Build the JS
webpackResult = subprocess.Popen(["webpack", "--config", "Dashboard/config/webpack.config.js", "--context", "Dashboard"])

# Star Node Server
subprocess.Popen(["node", "Dashboard/app.js"])

# Start Stream Management
QueueManagerProcess = multiprocessing.Process(target = QueueManager.main)
QueueManagerProcess.start()
QueueManagerProcess.join()