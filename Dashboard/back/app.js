var path = require("path");
var amqp = require('amqplib/callback_api');


var KafkaAvro = require('kafka-avro');
 
var kafkaAvro = new KafkaAvro({
    kafkaBroker: '209.97.137.81:9092', // http causing issues?!
    schemaRegistry: 'http://209.97.137.81:8081',
});
 
// Query the Schema Registry for all topic-schema's
// fetch them and evaluate them.
kafkaAvro.init()
    .then(function() {
        console.log('KAFKA Ready to use');
    });



var express = require('express');
var cors = require('cors')
var app = express();

var expressWs = require('express-ws')(app);
var bodyParser = require('body-parser')

app.use( bodyParser.json() ); 
app.use(cors())


let REQUEST_MQ_NAME = "CMD"
let RESPONSE_MQ_NAME = "RESPONSE"
let MQChannel = undefined; 
// RABBIT MQ
amqp.connect('amqp://localhost', function(err, conn) {
    conn.createChannel(function(err, ch) {

        // TODO: CP: Is this correct practice?
        MQChannel = ch;
        
        MQChannel.consume(RESPONSE_MQ_NAME, function(msg) {

            console.log(`Rx: ${msg.content}`)
            let payload = JSON.parse(msg.content);

            feedId = payload["feedId"]
            status = payload["status"]

            if (status === "available" && feedsPending.findIndex(elem => elem === feedId) !== -1) {
                feedsPending.splice(feedsPending.findIndex(elem => elem === feedId), 1);
                feedsAvailable.push(feedId);
            } else{ 
                    console.log("Don't know what to do with this message......")            
            }

        }, {noAck: true});
    });
});

function sendCommandToMQ(payload) {
    console.log(` [x] Sent: ${payload}`);
    MQChannel.sendToQueue(REQUEST_MQ_NAME, new Buffer(JSON.stringify(payload)));
}




// KAFKA
//var kafka = require('kafka-node');
//var ConsumerGroup = kafka.ConsumerGroup;

let KAFKA_TOPIC_LIST = []
/*
new kafka.Client().zk.client.getChildren("/brokers/topics", (err, children, stats) => {
    children.forEach(child => KAFKA_TOPIC_LIST.push(child));

    console.log(KAFKA_TOPIC_LIST)
});
*/


// WEB SOCKETS
expressWs.getWss().on('connection', function (ws) {
    console.log("Connection opened.....")
});



////////////////////////////////////////////////////////////////////////////////////////////
/*
app.use(function (req, res, next) {
    console.log('middleware');
    req.testing = 'testing';
    return next();
});
*/

let getNextFeed = function*() {
    let FEEDS = ["soilapp", "spark-output-topic-avro"]; //KAFKA_TOPIC_LIST; 
    let i = 0
    while(true) {
        yield FEEDS[i]
        i += 1
    }
}

let feedIdGenerator = getNextFeed();

let feedsAvailable = [];
let feedsPending = [];


app.use('/js', express.static(path.join(__dirname, '../front/js')))
app.get('/', function(req, res, next){
    res.sendFile(path.join(__dirname + "/templates/index.html"));
});


app.all('/getFeedState', function(req, res, next){

    let responseCode = 200;
    let ret = {};
    let feedId = req.body.feedId;

    if(feedId){

        status = "unavailable"
       /* if feedId in feedsAvailable:
            status = "available"
        elif feedId in feedsPending:
            status = "pending"
*/
        ret = {
            "feedId": feedId,
            "state": status
        }
    } else {
        responseCode = 400
    }

    res.send(responseCode, JSON.stringify(ret))
});

app.all('/addFeed', function(req, res, next){
    console.log('addFeed', req.testing);

    let ret = {};
    let responseCode = 200;

    let feedId = feedIdGenerator.next().value;

    if(feedId) {
        feedsPending.push(feedId);

        ret = {
            "feedId": feedId
        };

        sendCommandToMQ({
            "command": "startProducer",
            "feedId": feedId
        })
    } else {
        responseCode = 400;
    }

    res.send(responseCode, JSON.stringify(ret))
});

app.all('/feedList', function(req, res, next){
    let ret = feedsAvailable;
    res.send(JSON.stringify(ret));
});

app.all('/status', function(req, res, next){
    //console.log('status', req.testing);
    res.send(JSON.stringify({}));
});










app.ws('/feedProvider', function(ws, req) {

    let alive = true;
    let feedId = undefined;
    let consumer = undefined;

    ws.on('message', (msg)  => {
        console.log("Rx::RCV " + msg);

        let payload = JSON.parse(msg)
        if(feedId === undefined && payload.feedId) {
            feedId = payload["feedId"]

            response = JSON.stringify({
                "status": "accepted"
            })
            console.log("Feed requested: " + feedId)

            ws.send(response)

            // Start consumption
            kafkaAvro.getConsumer({
                'group.id': 'librd-test',
                'socket.keepalive.enable': true,
                'enable.auto.commit': true,
            })
            // the "getConsumer()" method will return a bluebird promise.
            .then(function(localConsumer) {
                // Perform a consumer.connect()
                consumer = localConsumer;

                return new Promise(function (resolve, reject) {
                    consumer.on('ready', function() {
                        resolve(consumer);
                    });
                
                    consumer.connect({}, function(err) {
                        if (err) {
                            console.log("KAFKA-Consumer: Unable to Connect")
                            reject(err);
                            return;
                        }
                        resolve(consumer); // depend on Promises' single resolve contract.
                    });
                });
            })
            .then(function() {
                // Subscribe and consume.
                var topicName = feedId;
                console.log(`Subscribing consumer to feed: ${feedId}`)
                consumer.subscribe([topicName]);
                consumer.consume();
                
                consumer.on('disconnected', function() {
                    console.log("Kafka Consumer disconnected!")
                    delete consumer;
                })

                consumer.on('data', function(rawData) {

                    data = rawData.parsed

                    let msgObj = {};
                    
                    for(let key in data) { 
                        if(data.hasOwnProperty(key)) {
                            msgObj[key] = data[key]
                        }
                    }

                    ws.send(JSON.stringify(msgObj))
                });
            });
        }

    });

    ws.on('close', (msg) => {
        console.log("Closing kafka Consumer....")
        consumer.disconnect()
    });

    console.log('socket', req.testing);
});

app.listen(3000);
