import json

import pika
from time import sleep

QUEUE_NAME = "test"
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

channel.queue_declare(queue=QUEUE_NAME)

fakeMessages = [
    {
        "command": "startProducer",
        "feedId": "feed_1"
    },
    {
        "command": "stopProducer",
        "feedId": "feed_1"
    },
    {
        "command": "startProducer",
        "feedId": "feed_1"
    },
    {
        "command": "stopProducer",
        "feedId": "feed_1"
    },
]

sleep(2)

for msg in fakeMessages:
    channel.basic_publish(exchange='',
                          routing_key=QUEUE_NAME,
                          body=json.dumps(msg))

    sleep(5)