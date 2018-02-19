import json
from threading import Thread

import pika
import queue

from FeedServer.kafkaProducer import ProducerThread

REQUEST_MQ_NAME = "CMD"
RESPONSE_MQ_NAME = "RESPONSE"

producerList = {}

txQueue = queue.Queue()


def callback(ch, method, properties, payload):
    print(" [x] Rx %r" % payload)

    # Validate
    try:
        msg = json.loads(payload.decode("utf-8"))
        cmd = msg["command"]
        feedId = msg["feedId"]

        print("    [+] COMMAND: " + cmd)

        if cmd == "startProducer":
            # Validate
            # TODO

            if feedId not in producerList or not producerList[feedId]["thread"].is_alive():
                producerList[feedId] = {}

                newQueue = queue.Queue()
                newThread = ProducerThread(feedId, newQueue)
                newThread.daemon = True
                producerList[feedId] = {
                    "messageQueue": newQueue,
                    "thread": newThread
                }

                print("        [+] Starting producer....")

                newThread.start()

                txQueue.put({
                    "feedId": feedId,
                    "status": "available"
                })

            else:
                print("        [!] Producer already running for feed <{feedId}>".format(feedId = feedId))

        elif cmd == "stopProducer":
            producerList[feedId]["messageQueue"].put(-1)

            txQueue.put({
                "feedId": feedId,
                "status": "unavailable"
            })

            print("           [+] Stopped producer....")

        else:
            print("        [!] UNKNOWN COMMAND")


        # Process


    except Exception as e:
        print("    [!] INVALID PAYLOAD")
        print(e)


    ch.basic_ack(delivery_tag=method.delivery_tag)

def txWorker():
    txConnection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    txCchannel = txConnection.channel()
    txCchannel.queue_declare(queue=RESPONSE_MQ_NAME)
    while True:
        msg = txQueue.get()
        msg = json.dumps(msg)

        txCchannel.basic_publish(exchange='',
                              routing_key=RESPONSE_MQ_NAME,
                              body=msg)

        print(" [x] Tx: {}".format(msg))


def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    channel.queue_declare(queue=REQUEST_MQ_NAME)

    channel.basic_consume(callback,
                          queue=REQUEST_MQ_NAME)


    txThread = Thread(target = txWorker)
    txThread.daemon = True
    txThread.start()

    print("Starting to consume on queue:" + REQUEST_MQ_NAME)
    channel.start_consuming()

if __name__ == "__main__":
    main()