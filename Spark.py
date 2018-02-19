import sys

import time
from pyspark import SparkContext
from pyspark.streaming import StreamingContext
from pyspark.streaming.kafka import KafkaUtils

from kafka import KafkaProducer

import json

broker = "localhost:9092"
readTopic = "test"
readTopicPi = "raspberryPiStream"

writeTopic = "spark-output-topic"

producer = KafkaProducer(bootstrap_servers="localhost:9092")

def quantize(val):
    if val > 0.5:
        return 1
    elif val > 0:
        return 0.5
    elif val > -0.5:
        return 0
    elif val > -1:
        return -0.5
    else:
        return -1

def mapFunc(x):
    obj = json.loads(x)
    #obj['value'] = quantize(obj['value'])

    #if obj['value'] > 0:
    #    obj['alertValue'] = quantize(obj['value'])

    return obj

def handler(message):

    incomingMessages = message.map(lambda x: mapFunc(x[1]))

    # Send All Messages
    sum = 0
    lastTimestamp = time.time() * 1000
    for inMessage in incomingMessages.collect():
        sum += inMessage['value']
        lastTimestamp = inMessage['timestamp']
    #    msg = json.dumps(inMessage)
    #    producer.send(writeTopic, str.encode('{}'.format(msg)))
    #    producer.flush()

    # Send Stat!
    #sum = incomingMessages.reduce(lambda a, b: a['value'] + b['value'])
    count = incomingMessages.count()

    msg = json.dumps({
        "timestamp": lastTimestamp,
        "value": sum / count
    })
    #producer.send(writeTopic, str.encode('{}'.format(msg)))
    #producer.flush()


def windowReduceFunc(a, b):
    if isinstance(a, tuple):
        aa = mapFunc(a[1])['value']
    else:
        aa = a


    if isinstance(b, tuple):
        bb = mapFunc(b[1])['value']
    else:
        bb = b


    return aa + bb


def windowHandler(rdd):
    msg = json.dumps({
        "timestamp": int(round(time.time() * 1000)),
        "value": rdd.collect()[0]
    })
    producer.send(writeTopic, str.encode('{}'.format(msg)))
    producer.flush()

def joinHandler(rdd):
    for item in rdd.collect():
        itemA = json.loads(item[1][0])
        itemB = json.loads(item[1][1])

        msg = json.dumps({
            "timestamp": int(round(time.time() * 1000)),
            "value": itemA["value"] + itemB["value"]
        })
        producer.send(writeTopic, str.encode('{}'.format(msg)))
        producer.flush()

if __name__ == "__main__":


    sc = SparkContext(appName="PythonStreamingKafka")


    ssc = StreamingContext(sc, 2)

    kvs = KafkaUtils.createDirectStream(ssc, [readTopic],{"metadata.broker.list": broker})
    piStream = KafkaUtils.createDirectStream(ssc, [readTopicPi],{"metadata.broker.list": broker})

    # Process Stuff Here

    windowStream = kvs.window(4, 2)
    windowStream.foreachRDD(handler)

    PiWindowStream = piStream.window(4, 2)
    PiWindowStream.foreachRDD(handler)

    windowStream.join(PiWindowStream).foreachRDD(joinHandler)


    #windowStream = kvs.reduceByWindow(windowReduceFunc, None, 4, 2)
    #windowStream.foreachRDD(windowHandler)

    ssc.start()
    ssc.awaitTermination()
