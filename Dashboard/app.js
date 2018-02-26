var path = require("path");
var amqp = require('amqplib/callback_api');

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
var kafka = require('kafka-node');
var ConsumerGroup = kafka.ConsumerGroup;


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
    let FEEDS = ["feed_1", "feed_2"]
    let i = 0
    while(true) {
        yield FEEDS[i]
        i += 1
    }
}

let feedIdGenerator = getNextFeed();

let feedsAvailable = [];
let feedsPending = [];


app.use('/static', express.static(path.join(__dirname, '/static')))
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
    console.log('status', req.testing);
    res.send();
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
            let client = new kafka.Client();
            let kafkaOffset = new kafka.Offset(client);
            
            kafkaOffset.fetch([
                { topic: feedId, partition: 0, time: -1, maxNum: 1 }
            ], function (err, data) {
                offsetVal = data[feedId][0][0]

                console.log("Starting at offset: " + offsetVal);

                consumer = new ConsumerGroup({
                        fromOffset: 'latest',
                        groupId: "" + (Math.random())
                    }, 
                    feedId);

                consumer.on('message', function (message) {
                    if(ws.readyState === ws.OPEN) {
        
                        msgObj = JSON.parse(message.value)
                        msgObj.value += Math.random()
        
                        ws.send(JSON.stringify(msgObj))
                    } else {
                        console.log("WS closed but consumer still running ARGHHHH hmmmmm")
                    }
                });

            });
        }

    });

    ws.on('close', (msg) => {
        consumer.close(() => {
            console.log("Closing kafka ConsumerGroup....")
        });
        delete consumer;
    });

    console.log('socket', req.testing);
});

app.listen(3000);
