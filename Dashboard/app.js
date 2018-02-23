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
            console.log(" [x] Received %s", msg.content.toString());
        }, {noAck: true});
    });
});

function sendCommandToMQ(payload) {
    console.log(` [x] Sent: ${payload}`);
    MQChannel.sendToQueue(REQUEST_MQ_NAME, new Buffer(JSON.stringify(payload)));
}




// KAFKA
var kafka = require('kafka-node');
var HighLevelConsumer = kafka.HighLevelConsumer;


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

    let feedId = feedIdGenerator.next().value;
    feedsPending.push(feedId);

    let ret = {
        "feedId": feedId
    };

    sendCommandToMQ({
        "command": "startProducer",
        "feedId": feedId
    })

    res.send(JSON.stringify(ret))
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

            consumer = new HighLevelConsumer(
                client,
                [
                    { topic: feedId }
                ]
            );

            consumer.on('message', function (message) {
                if(ws.readyState === ws.OPEN) {
    
                    msgObj = JSON.parse(message.value)
                    msgObj.value += Math.random()
    
                    ws.send(JSON.stringify(msgObj))
                } else {
                    console.log("WS closed but consumer still running ARGHHHH hmmmmm")
                }
            });
        }

    });

    ws.on('close', (msg) => {
        consumer.close();
        delete consumer;
    });

    console.log('socket', req.testing);
});

app.listen(3000);
