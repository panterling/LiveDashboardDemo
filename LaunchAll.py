from FeedServer import QueueManager

import os
import multiprocessing
import subprocess

# Start Kafka
#kafkaStartArgs = ["/opt/kafka/kafka_2.11-0.11.0.0/bin/kafka-server-start.sh", "/opt/kafka/kafka_2.11-0.11.0.0/config/server.properties"]
#subprocess.Popen(kafkaStartArgs) #, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

# Start Spark
#subprocess.Popen(["/usr/lib/spark/bin/spark-submit", "--packages", "org.apache.spark:spark-streaming-kafka-0-8_2.11:2.2.0 Analytics/Spark.py"])

# Build the JS
webpackResult = subprocess.Popen(["webpack", "--config", "Dashboard/config/webpack.config.js", "--context", "Dashboard"])

# Start Node Server
#subprocess.Popen(["node", "Dashboard/back/app.js"])

# Start Stream Management
QueueManagerProcess = multiprocessing.Process(target = QueueManager.main)
QueueManagerProcess.start()
QueueManagerProcess.join()