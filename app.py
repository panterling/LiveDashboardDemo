import json
import random
from threading import Thread, Lock

import pika
from flask import Flask, render_template, request
from flask_sockets import Sockets
from threading import Thread
import queue

from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
from gevent.server import _tcp_listener

import QueueManager

app = Flask(__name__)
sockets = Sockets(app)

from kafka import KafkaConsumer, TopicPartition

analyticsFeedTopic = 'spark-output-topic'
rawFeedTopic = 'test'
piFeedTopic = 'raspberryPiStream'

listener = _tcp_listener(('', 5000), reuse_addr = 1)


@sockets.route('/liveRawFeed')
def echo_socket(ws):
    while not ws.closed:
        consumer = KafkaConsumer(rawFeedTopic)  # bootstrap_servers='localhost:9092')
        for msg in consumer:
            ws.send(msg.value.decode("utf-8"))

@sockets.route('/otherLiveRawFeed')
def echo_socket(ws):
    while not ws.closed:
        consumer = KafkaConsumer(piFeedTopic)  # bootstrap_servers='localhost:9092')
        for msg in consumer:
            ws.send(msg.value.decode("utf-8"))




@sockets.route('/analyticsFeed')
def echo_socket(ws):
    while not ws.closed:
        consumer = KafkaConsumer(analyticsFeedTopic)
        for msg in consumer:
            ws.send(msg.value.decode("utf-8"))


#################################################################################
##########################              NEW             #########################
#################################################################################


txProducerManagerQueue = queue.Queue()

def txProducerManagerWorker():
    txConnection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    txCchannel = txConnection.channel()
    txCchannel.queue_declare(queue=QueueManager.REQUEST_MQ_NAME)

    print("Ready to send Rx to RabbitMQ")
    while True:
        msg = txProducerManagerQueue.get()

        print("Tx: {}".format(msg["command"]))
        txCchannel.basic_publish(exchange='',
                                 routing_key=QueueManager.REQUEST_MQ_NAME,
                                 body=json.dumps(msg))

def rxProducerManagerWorker(ch, method, properties, payload):

    print("Rx: {}".format(payload.decode("utf-8")))

    msg = json.loads(payload.decode("utf-8"))
    feedId = msg["feedId"]
    status = msg["status"]

    with feedsMutex:
        if status == "available" and feedId in feedsPending:
            feedsPending.remove(feedId)
            feedsAvailable.append(feedId)
        else:
            print("Don't know what to do with this message......")

        


    ch.basic_ack(delivery_tag = method.delivery_tag)

########################################################################################

feedsMutex = Lock()
feedsAvailable = []
feedsPending = []


def getNextFeed():
    FEEDS = ["feed_1", "feed_2"]
    i = 0
    while True:
        yield FEEDS[i]
        i += 1

feedIdGenerator = getNextFeed()

########################################################################################


@sockets.route('/feedProvider')
def echo_socket(ws):
    feedId = None

    while feedId is None:
        message = ws.receive()
        try:
            payload = json.loads(message)
            if "feedId" in payload:
                feedId = payload["feedId"]

                response = json.dumps({
                    "status": "accepted"
                })
                print("Feed requested: " + feedId)

                ws.send(response)

        except Exception as e:
            print(e)
            pass

        consumer = KafkaConsumer()  # bootstrap_servers='localhost:9092')
        for p in consumer.partitions_for_topic(feedId):
            tp = TopicPartition(feedId, p)
            consumer.assign([tp])
            #consumer.seek_to_beginning(tp)

    while ws is not None and not ws.closed :
        msg = next(consumer)
        msgObj = json.loads(msg.value.decode("utf-8"))
        msgObj["value"] = float(msgObj["value"]) + random.random()

        ws.send(json.dumps(msgObj))




@app.route('/')
def index():
    return render_template('index.html')

@app.route('/status', methods = ["GET", "POST"])
def status():
    return json.dumps({}), 200


@app.route('/feedList', methods = ["POST"])
def feedList():
    with feedsMutex:
        ret = feedsAvailable

    return json.dumps(ret), 200


@app.route('/addFeed', methods = ["POST"])
def addFeed():

        
    with feedsMutex:
        feedId = next(feedIdGenerator)
        feedsPending.append(feedId)


    ret = {
        "feedId": feedId
    }

    txProducerManagerQueue.put({
        "command": "startProducer",
        "feedId": feedId
    })

    return json.dumps(ret), 200

@app.route('/getFeedState', methods = ["POST"])
def checkFeedState():
    responseCode = 200

    ret = {}
    jsonData = request.get_json()

    if "feedId" in jsonData:
        feedId = jsonData["feedId"]

        status = "unavailable"
        if feedId in feedsAvailable:
            status = "available"
        elif feedId in feedsPending:
            status = "pending"

        ret = {
            "feedId": feedId,
            "state": status
        }
    else:
        responseCode = 400

    return json.dumps(ret), responseCode

########################################################################################

def serve_forever(listener):
    pywsgi.WSGIServer(listener, app, handler_class = WebSocketHandler).serve_forever()



def main():
    ## WebSocket processes
    number_of_processes = 3
    for i in range(number_of_processes):
        Thread(target = serve_forever, args = (listener,)).start()

    ## RabbitMQ Tx
    txThread = Thread(target = txProducerManagerWorker)
    txThread.daemon = True
    txThread.start()


    ## RabbitMQ Rx
    rxConnection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    rxChannel = rxConnection.channel()
    rxChannel.queue_declare(queue = QueueManager.RESPONSE_MQ_NAME)
    rxChannel.basic_consume(rxProducerManagerWorker, queue = QueueManager.RESPONSE_MQ_NAME)
    rxChannel.start_consuming()

if __name__ == "__main__":
    main();