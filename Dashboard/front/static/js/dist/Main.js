/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 12);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var mixins = __webpack_require__(13);
const Logging_1 = __webpack_require__(4);
class Publisher {
    constructor() {
        mixins(Logging_1.default, this);
        this._subscribers = [];
    }
    subscribe(subscriber) {
        this._subscribers.push(subscriber);
    }
    broadcastEvent(event, params) {
        this.log("BROADCASTING: " + event.toString());
        for (let subscriber of this._subscribers) {
            subscriber.processEvent(event, params);
        }
    }
    processEvent(event, params) {
        // Abstract
        throw Error("processEvent() should be implemented in Child class.");
    }
    static get EVENTS() {
        // Abstract
        throw Error("EVENTS() should be implemented in Child class.");
    }
}
exports.default = Publisher;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Publisher_1 = __webpack_require__(0);
const FeedSocketProxy_js_1 = __webpack_require__(6);
const FEED_URL = "ws://localhost:3000/feedProvider"; // MAKE GLOBAL!
const FEED_STATE = {
    IDLE: Symbol("IDLE"),
    OPENING: Symbol("OPENING"),
    OPEN: Symbol("OPEN"),
    REQUESTING_FEED: Symbol("REQUESTING_FEED"),
    RECEIVING: Symbol("RECEIVING"),
    REJECTED: Symbol("REJECTED"),
    CLOSED: Symbol("CLOSED")
};
const EVENTS = {
    FEED_STATE_CHANGE: Symbol("FeedSocketManager::" + "FEED_STATE_CHANGE"),
    NEW_DATA: Symbol("FeedSocketManager::" + "NEW_DATA"),
    RX: Symbol("FeedSocketManager::" + "RX")
};
class FeedSocketManager extends Publisher_1.default {
    constructor() {
        super();
        this._feeds = [];
    }
    static get FEED_STATE() {
        return FEED_STATE;
    }
    _createWebSocket(id) {
        let ws = new WebSocket(FEED_URL);
        ws.onopen = (e) => {
            this._socketOpened(id, e);
            this._requestFeed(id);
        };
        ws.onclose = (e) => {
            this._socketClosed(id, e);
        };
        ws.onmessage = (e) => {
            this._socketMessageReceived(id, e);
        };
        ws.onerror = (e) => {
            this._socketError(id, e);
        };
        return ws;
    }
    addFeed(feedId) {
        if (this._feeds.hasOwnProperty(feedId)) {
            throw "Feed ID Already In Use: " + feedId;
        }
        let socketProxy = new FeedSocketProxy_js_1.default(this, feedId);
        this.subscribe(socketProxy);
        let webSocket = this._createWebSocket(feedId);
        this._feeds[feedId] = {
            state: FeedSocketManager.FEED_STATE.IDLE,
            proxy: socketProxy,
            socket: webSocket
        };
        this._changeState(feedId, FeedSocketManager.FEED_STATE.OPENING);
        return this._feeds[feedId].proxy;
    }
    removeFeed(feedId) {
        delete this._feeds[feedId];
    }
    /// FEED MANAGEMENT
    _requestFeed(id) {
        this._changeState(id, FeedSocketManager.FEED_STATE.REQUESTING_FEED);
        this._socketSend(id, {
            feedId: id
        });
    }
    /// SOCKET MANAGEMENT
    _socketOpened(id, e) {
        this.log(`<${id}> Opened`);
        this._changeState(id, FeedSocketManager.FEED_STATE.OPEN);
    }
    _socketClosed(feedId, e) {
        this.log(`<${feedId}> Closed: ${e.code}`);
        // If the feed as been removed, we no longer care for updates of this socket.
        if (this._feeds[feedId]) {
            // Manually push for socket closure
            // Cases where the server sends ADNORMAL (1006) close event and continues sending messages as if the socket is open.
            this._feeds[feedId].socket.close();
            this._changeState(feedId, FeedSocketManager.FEED_STATE.CLOSED);
        }
    }
    _socketError(id, e) {
        this.log(`<${id}> ERROR`);
        this._changeState(id, FeedSocketManager.FEED_STATE.CLOSED);
    }
    _socketMessageReceived(id, e) {
        //this.log(`<${id}> Rx`)
        this.broadcastEvent(FeedSocketManager.EVENTS.RX, { feedId: id, value: JSON.parse(e.data).value });
        switch (this._feeds[id].state) {
            case FeedSocketManager.FEED_STATE.REQUESTING_FEED:
                let jsonResponse = JSON.parse(e.data);
                if (jsonResponse.status === "accepted") {
                    this._changeState(id, FeedSocketManager.FEED_STATE.RECEIVING);
                }
                else {
                    throw "Feed Request Rejected :(";
                }
                break;
            case FeedSocketManager.FEED_STATE.RECEIVING:
                //this.log(`<${id}>Got a data packet.`);
                this._feeds[id].proxy.broadcastEvent(FeedSocketProxy_js_1.default.EVENTS.NEW_DATA, { data: JSON.parse(e.data) });
                break;
        }
    }
    _socketSend(id, payload) {
        try {
            if (typeof payload !== "string") {
                payload = JSON.stringify(payload);
            }
            this.log(`<${id}> Tx: ` + payload);
            this._feeds[id].socket.send(payload);
        }
        catch (e) {
            // TODO 
            throw "Unhandled Socket Send Exception";
        }
    }
    /// NISC
    _changeState(id, newState) {
        this.log(`<${id}> CHANGE STATE TO: ${newState.toString()}`);
        this.broadcastEvent(FeedSocketManager.EVENTS.FEED_STATE_CHANGE, {
            feedId: id,
            state: newState
        });
        this._feeds[id].state = newState;
    }
    stopFeed(id) {
        this._feeds[id].socket.close();
        this._changeState(id, FeedSocketManager.FEED_STATE.CLOSED);
    }
    restartFeed(id) {
        if (this._feeds[id].state === FeedSocketManager.FEED_STATE.CLOSED) {
            delete this._feeds[id].socket;
            this._feeds[id].socket = this._createWebSocket(id);
        }
        else {
            throw "Cannot restart when feed socket is not in CLOSED state.";
        }
    }
    processEvent(event, params) {
        // Do Nothing
    }
    static get EVENTS() {
        return EVENTS;
    }
}
exports.default = FeedSocketManager;


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Publisher__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__ChartManager__ = __webpack_require__(5);



const EVENTS = {
    ALTER_POSITION_CHANGE: Symbol("ChartFeedProxy::" + "ALTER_POSITION_CHANGE")
}

class ChartFeedProxy extends __WEBPACK_IMPORTED_MODULE_0__Publisher___default.a{
    constructor(chartManager, feedId) {
        super();

        this._feedId = feedId;
        this._alive = true;

        this._chartManager = chartManager;
        chartManager.subscribe(this);


        this._chartManager._addFeed(feedId);

    }

    processEvent(event, params) {
        if(params.feedId && params.feedId === this._feedId) {
            switch(event) {
                case __WEBPACK_IMPORTED_MODULE_1__ChartManager__["a" /* default */].EVENTS.ALTER_POSITION_CHANGE:
                    this.broadcastEvent(ChartFeedProxy.EVENTS.ALTER_POSITION_CHANGE, params);
                    break;
            }
        }
    }

    _isAlive() {
        return this._alive;
    }

    _validityCheck() {
        if(!this._isAlive()) {
            throw Error("This ChartFeedProxy is invalid.")
        }
    }

    addDataElement(data) {
        this._validityCheck();

        this._chartManager._giveData(this._feedId, data);
    }

    setAlertPosition(position) {
        this._chartManager._setAlertLine(this._feedId, position);
    }

    clearAll() {
        this._validityCheck();

    }

    destroy() {
        this._validityCheck();

        this._chartManager._killFeed(this._feedId);
        this._alive = false;
    }

    static get EVENTS() {
        return EVENTS;
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = ChartFeedProxy;


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Publisher__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__AjaxManager__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__AjaxManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__AjaxManager__);



const SERVICE_STATUS_TIMEOUT = 2000; //milliseconds
const SERVICE_CHECK_INTERVAL = 3000; //milliseconds

const STATES = {
    OK: Symbol("OK"),
    DEGRADED: Symbol("DEGRADED"),
    UNAVAILABLE: Symbol("UNAVAILABLE"),
}

const EVENTS = {
    SERVICE_UPDATE: Symbol("ServiceMonitor::SERVICE_UPDATE")
};

class ServiceMonitor extends __WEBPACK_IMPORTED_MODULE_0__Publisher___default.a {
    constructor() {
        super();

        this._ajaxManager = __WEBPACK_IMPORTED_MODULE_1__AjaxManager___default.a.getInstance();

        this._state = ServiceMonitor.STATES.OK;

    }

    static get STATES() {
        return STATES;
    }

    startMonitoring() {
        this._statusCheckInterval = setInterval(() => {
            this._checkStatus();
        }, SERVICE_CHECK_INTERVAL)
    }

    stopMonitoring() {
        clearInterval(this._statusCheckInterval)
    }

    _checkStatus() {
        this._ajaxManager.request("addFeed", {
            url: "http://localhost:3000/status",
            timeout: SERVICE_STATUS_TIMEOUT,
            success: (response) => {
                this._serviceOK();
            },
            error: (jqXHR, textStatus, errorThrown ) => {
                switch(textStatus) {
                    case "timeout":
                        this._changeState(ServiceMonitor.STATES.DEGRADED);
                        break;

                    default:
                        this._changeState(ServiceMonitor.STATES.UNAVAILABLE);
                        break;
                }
            },
            complete: () => {
                this.broadcastEvent(ServiceMonitor.EVENTS.SERVICE_UPDATE, {
                    state: this._state
                })
            }
        })
    }

    _serviceOK() {
        if(this._state === ServiceMonitor.STATES.OK) {
            // TODO
        } else {
            this._changeState(ServiceMonitor.STATES.OK)
        }
    }

    _changeState(newState) {
        this.log(`CHANGE STATE: ${newState.toString()}`)

        this._state = newState;
    }

    static get EVENTS() {
        return EVENTS;
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = ServiceMonitor;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const PRINT_CALLING_FUNC_STACK = false;
class Logging {
    log(msg) {
        let s = this.constructor.name + ":: " + msg;
        if (PRINT_CALLING_FUNC_STACK) {
            s += "\n\t";
            s += this.getCallingCodeLine();
        }
        console.log(s);
    }
    getCallingCodeLine() {
        let s = (new Error().stack);
        var s1 = s.substr(this.nthIndexOf(s, "\n", 3) + 1, s.length);
        return s1.substring(0, s1.search("\n")).trim();
    }
    nthIndexOf(str, pattern, n) {
        var i = -1;
        while (n-- && i++ < str.length) {
            i = str.indexOf(pattern, i);
            if (i < 0)
                break;
        }
        return i;
    }
}
exports.default = Logging;


/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__ChartFeedProxy_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__Publisher__);




const REFRESH_FPS = 25;
const AUTO_UPDATE_INTERVAL = 1000 / REFRESH_FPS;
const EVENTS = {
    ALTER_POSITION_CHANGE: Symbol("ChartManager::" + "ALTER_POSITION_CHANGE")
};

class ChartManager extends __WEBPACK_IMPORTED_MODULE_1__Publisher___default.a {
    constructor() {
        super();

        /// DATA FEED SETUP ///
        this._feeds = {}


        /// BEHAVIOUR SETUP ///
        this._inAlertDraggingMode = undefined;

        /// CHART SETUP ////
        let parseTime = d3.timeParse("%d-%b-%y");
        
        this._svg = d3.select("svg");
        this._margin = {top: 20, right: 20, bottom: 30, left: 50};
        this._width = this._svg.attr("width") - this._margin.left - this._margin.right;
        this._height = this._svg.attr("height") - this._margin.top - this._margin.bottom;

        this._g = this._svg.append("g").attr("transform", "translate(" + this._margin.left + "," + this._margin.top + ")");


        this._x = d3.scaleTime()
            .rangeRound([0, this._width]);

        this._y = d3.scaleLinear()
            .rangeRound([this._height, 0]);

        this._line = d3.line()
            .x((d) => { return this._x(d.date); })
            .y((d) => { return this._y(d.value); });


        this._setYDomain();
        this._setXDomain();


        this._g.append("g")
                .attr("class", "xAxis")
            .attr("transform", "translate(0," + this._height + ")")
            .call(d3.axisBottom(this._x))
            .select(".domain")
            .remove();

        this._g.append("g")
            .attr("class", "yAxis")
            .call(d3.axisLeft(this._y))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Value");


        function* colourGenerator() {
            let i = 1;
            while (true) { 
                yield d3.schemeCategory20[i++ % 20]; 
            }
        }
        this._colourGenerator = colourGenerator();


        // Update graph at set interval
        this._autoUpdateInterval = setInterval(this._updateGraph.bind(this), AUTO_UPDATE_INTERVAL);
    }

    getChartFeedProxy(feedId) {
        return new __WEBPACK_IMPORTED_MODULE_0__ChartFeedProxy_js__["a" /* default */](this, feedId);
    }

    _setYDomain() {

        let dataExtents = [-1, 1];

        for(let feedId in this._feeds) {
            dataExtents[0] = d3.min([dataExtents[0], this._feeds[feedId].dataExtents[0]])
            dataExtents[1] = d3.max([dataExtents[1], this._feeds[feedId].dataExtents[1]])
        }
    
        this._y.domain([d3.min([-1, dataExtents[0]]), d3.max([1, dataExtents[1]])]);
    }
    _setXDomain() {
    
        let now = new Date();
    
        let yDomainLowerLimit = new Date(now);
        yDomainLowerLimit.setSeconds(yDomainLowerLimit.getSeconds() - WINDOW_SIZE);
    
        let yDomainUpperLimit = new Date(now);
        yDomainUpperLimit.setSeconds(yDomainUpperLimit.getSeconds() + 5);
    
    
        this._x.domain([yDomainLowerLimit, yDomainUpperLimit]);
    }

    _updateData(id) {
        let now = (new Date()).getTime();
    
        this._feeds[id].data = this._feeds[id].data.filter((elem) => {
            return elem.date.getTime() > now - (WINDOW_SIZE * 1000)
        });

        this._feeds[id].dataExtents = d3.extent(this._feeds[id].data, (elem) => { return elem.value; })

        this._resolveAlertLineHandleCollisions();
    }
    
    _updateGraph() {

        for(let feedId in this._feeds) {
            this._updateData(feedId);
        }

        this._setYDomain();

        this._setXDomain();
    
        this._g.select(".yAxis")
            .call(d3.axisLeft(this._y))
    
        this._g.select(".xAxis")
            .call(d3.axisBottom(this._x))
    
    

        for(let feedId in this._feeds) {
            d3.selectAll("." + feedId)
                .attr("d", this._line(this._feeds[feedId].data));
        }

        this._updateAlertLines();
    }

    _updateAlertLines() {
        for(let feedId in this._feeds) {
            this._g.select(".alertLine" + feedId)
                .attr("y1", this._y(this._feeds[feedId].alertPosition))
                .attr("y2", this._y(this._feeds[feedId].alertPosition))

            this._g.select(".alertLineName" + feedId)
                .attr("y", this._y(this._feeds[feedId].alertPosition))

            this._g.select(".alertLineHandle" + feedId)
                .attr("cy", this._y(this._feeds[feedId].alertPosition))


        }
    }

    _setAlertLine(feedId, position) {
        this._g.select(".alertLine" + feedId)
            .attr("y1", this._y(position))
            .attr("y2", this._y(position))
    }

    _getNextColour() { 
        return this._colourGenerator.next().value;
    }

    _setAlertLine(feedId, position) {
        this._feeds[feedId].alertPosition = position;
        
        this._g.select(".alertLine" + feedId)
            .attr("y1", this._y(position))
            .attr("y2", this._y(position))
    }

    _addFeed(feedId) {
        let feedObj = {
            data: [],
            dataExtents: [-1, 1],
            alertPosition: 0
        };

        let feedColour = this._getNextColour();

        
        this._g.append("path")
            .attr("class", feedId)
            .attr("fill", "none")
            .attr("stroke", feedColour)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", this._line(feedObj.data));

            let alertLineGroup = this._g.append("g")
                .attr("class", "")

            let radius = 10;
            let radiusSquared = (2*radius) * (2*radius);
            alertLineGroup.append("circle")
                .attr("class", "alertLineHandle" + feedId)
                .attr("cx", this._x(this._x.domain()[1]) + radius)
                .attr("cy", this._y(feedObj.alertPosition))
                .attr("r", radius)
                .style("fill", feedColour)
                .call(d3.drag()
                    .on("start", () => {
                        d3.select(".alertLineHandle" + feedId).raise()
                        this._inAlertDraggingMode = feedId;
                    })
                    .on("drag", () => {
                        
                        //let newXY = this._resolveAlertLineHandleCollisions();
                        let thisHandle = d3.select(".alertLineHandle" + feedId)
                        let newXY = [(this._x(this._x.domain()[1]) + radius), d3.event.y]

                        for(let otherFeedId in this._feeds) {
                            if(otherFeedId !== feedId) {
                                let otherHandle = d3.select(".alertLineHandle" + otherFeedId)
                                let otherXY = [Number(otherHandle.attr("cx")), Number(otherHandle.attr("cy"))]
                                let dSquared = ((newXY[0] - otherXY[0]) * (newXY[0] - otherXY[0])) + ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]));

                                if(dSquared < radiusSquared && Math.abs(dSquared - radiusSquared) > 0.00001) {
                                    this.log("HANDLE COLLISION - translate in x by: " + (radiusSquared - dSquared));
                                    otherHandle.attr("cx", (this._x(this._x.domain()[1]) + radius) - Math.sqrt(radiusSquared - ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]))));
                                } else {
                                    otherHandle.attr("cx", (this._x(this._x.domain()[1]) + radius));
                                }
                            }
                        }

                        thisHandle.attr("cy", newXY[1])
                        
                        let newPosition = this._y.invert(d3.event.y);
                        newPosition = d3.max([this._y.domain()[0], newPosition])
                        newPosition = d3.min([this._y.domain()[1], newPosition])
                        newPosition = Number(newPosition.toFixed(2))

                        this._resolveAlertLineHandleCollisions();

                        feedObj.alertPosition = newPosition;

                        this.broadcastEvent(ChartManager.EVENTS.ALTER_POSITION_CHANGE, {
                            feedId: feedId,
                            newPosition: newPosition
                        });

                        this._updateAlertLines();
                    })
                    .on("end", () => {
                        this._resolveAlertLineHandleCollisions();
                        this._inAlertDraggingMode = undefined;
                    }));

            alertLineGroup.append("line")
                .attr("class", "alertLine" + feedId)
                .attr("x1", this._x(this._x.domain()[0]))
                .attr("y1", this._y(feedObj.alertPosition))
                .attr("x2", this._x(this._x.domain()[1]))
                .attr("y2", this._y(feedObj.alertPosition))
                .style("stroke-width", 2)
                .style("stroke", feedColour)
                .style("fill", "none")

            alertLineGroup.append("text")
                .attr("class", "alertLineName" + feedId)
                .attr("x", 2)
                .attr("y", this._y(feedObj.alertPosition))
                .text(feedId)

        
        
        this._feeds[feedId] = feedObj;
    }

    // Only implemented for the case of TWO handles. Needs more thought for N > 2
    _resolveAlertLineHandleCollisions() {
        return;
        if(Object.keys(this._feeds).length < 2 ) {
            return;
        }

        let radiusSquared = 20*20;
        let radius = 10;
        

        let feedId = undefined;
        if(this._inAlertDraggingMode !== undefined) {
            feedId = this._inAlertDraggingMode;
        } else {
            let feedKeys = Object.keys(this._feeds);

            let idx = d3.scan(Object.keys(this._feeds).map((elem) => {
                return {
                    feedId: elem, 
                    cy: d3.select(".alertLineHandle" + elem).attr("cx")
                }
            }), (a, b) => { return b.cy - a.cy});

            feedId = feedKeys[idx];
        }

        let thisHandle = d3.select(".alertLineHandle" + feedId)
        let newXY = [Number(thisHandle.attr("cx")), Number(thisHandle.attr("cy"))]

        for(let otherFeedId in this._feeds) {
            if(otherFeedId !== feedId) {
                let otherHandle = d3.select(".alertLineHandle" + otherFeedId)
                let otherXY = [Number(otherHandle.attr("cx")), Number(otherHandle.attr("cy"))]
                let dSquared = ((newXY[0] - otherXY[0]) * (newXY[0] - otherXY[0])) + ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]));

                if(dSquared < radiusSquared && Math.abs(dSquared - radiusSquared) > 0.00001) {
                    this.log("HANDLE COLLISION - translate in x by: " + (radiusSquared - dSquared));
                
                    otherHandle.attr("cx", this._x(this._x.domain()[1]) + radius - Math.sqrt(radiusSquared - ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]))))
                } else if (otherXY[0] !== this._x(this._x.domain()[1]) + radius) {
                    otherHandle.attr("cx", this._x(this._x.domain()[1]) + radius)
                }
            }
        }

    }

    _giveData(id, data) {
        this._feeds[id].data.push({
            value: data.value,
            date: new Date(data.timestamp)
        });
    
    }

    _killFeed(feedId) {
        delete this._feeds[feedId];

        // Remove data line
        this._g.selectAll("." + feedId).remove();

        // Remove alert line
        d3.select(".alertLine" + feedId).remove();
        d3.select(".alertLineName" + feedId).remove();
        d3.select(".alertLineHandle" + feedId).remove();
        
        this._updateGraph();
    }

    static get EVENTS() {
        return EVENTS;
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = ChartManager;


/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Publisher__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__FeedSocketManager__);



const EVENTS = {
    FEED_STATE_CHANGE: Symbol("FeedSocketProxy::" + "FEED_STATE_CHANGE"),
    NEW_DATA: Symbol("FeedSocketProxy::" + "NEW_DATA"),
};

class FeedSocketProxy extends __WEBPACK_IMPORTED_MODULE_0__Publisher___default.a {
    constructor(feedSocketManager, feedId) {
        super();

        this._feedId = feedId;
        this._feedSocketManager = feedSocketManager;
    }

    restartFeed() { 
        this._feedSocketManager.restartFeed(this._feedId); 
    }
    
    stopFeed() { 
        this._feedSocketManager.stopFeed(this._feedId); 
    }

    remove() {
        this.stopFeed();
        this._feedSocketManager.removeFeed(this._feedId); 
    }

    processEvent(event, params) {
        if(params.feedId === this._feedId) {
            switch(event){
                case __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager___default.a.EVENTS.FEED_STATE_CHANGE:
                    this.broadcastEvent(FeedSocketProxy.EVENTS.FEED_STATE_CHANGE, params)
                    break;
                case __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager___default.a.EVENTS.NEW_DATA:
                    this.broadcastEvent(FeedSocketProxy.EVENTS.NEW_DATA, params);
                    break;
            }
        }
    }

    static get EVENTS() {
        return EVENTS;
    }
}
/* harmony export (immutable) */ __webpack_exports__["default"] = FeedSocketProxy;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Publisher_1 = __webpack_require__(0);
const $ = __webpack_require__(16);
class AjaxManager extends Publisher_1.default {
    constructor() {
        if (AjaxManager._instance !== undefined) {
            throw Error("Attempt to re-instanciate AjaxManager. It is a singleton - please use getInstance().");
        }
        super();
        this._requests = [];
    }
    static getInstance() {
        if (AjaxManager._instance === undefined) {
            AjaxManager._instance = new AjaxManager();
        }
        return AjaxManager._instance;
    }
    request(id, options) {
        if (id === undefined) {
            throw Error("AJAX Request requires an ID");
        }
        else if (options === undefined) {
            throw Error("AJAX Request requires options");
        }
        else if (options.url === undefined) {
            throw Error("AJAX Request requires a URL");
        }
        else if (options.success === undefined) {
            throw Error("AJAX Request requires a success callback");
        }
        if (this._requests[id] !== undefined) {
            this.log(`Aborting in-progress AJAX request <${id}>`);
            this._requests[id].abort();
        }
        if (!options.method) {
            options.method = "POST";
        }
        if (!options.beforeSend) {
            options.beforeSend = () => { };
        }
        if (!options.complete) {
            options.complete = () => { };
        }
        if (!options.error) {
            options.error = () => { };
        }
        if (options.data) {
            options.data = JSON.stringify(options.data);
        }
        options.dataType = "json";
        options.contentType = "application/json";
        this._requests[id] = $.ajax(options);
    }
}
exports.default = AjaxManager;


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__node_modules_vue_loader_lib_selector_type_script_index_0_FeedComponent_vue__ = __webpack_require__(9);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_160546e4_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_FeedComponent_vue__ = __webpack_require__(17);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__node_modules_vue_loader_lib_runtime_component_normalizer__ = __webpack_require__(10);
var disposed = false
/* script */


/* template */

/* template functional */
var __vue_template_functional__ = false
/* styles */
var __vue_styles__ = null
/* scopeId */
var __vue_scopeId__ = null
/* moduleIdentifier (server only) */
var __vue_module_identifier__ = null

var Component = Object(__WEBPACK_IMPORTED_MODULE_2__node_modules_vue_loader_lib_runtime_component_normalizer__["a" /* default */])(
  __WEBPACK_IMPORTED_MODULE_0__node_modules_vue_loader_lib_selector_type_script_index_0_FeedComponent_vue__["a" /* default */],
  __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_160546e4_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_FeedComponent_vue__["a" /* render */],
  __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_160546e4_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_FeedComponent_vue__["b" /* staticRenderFns */],
  __vue_template_functional__,
  __vue_styles__,
  __vue_scopeId__,
  __vue_module_identifier__
)
Component.options.__file = "static/js/src/components/FeedComponent.vue"

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-160546e4", Component.options)
  } else {
    hotAPI.reload("data-v-160546e4", Component.options)
  }
  module.hot.dispose(function (data) {
    disposed = true
  })
})()}

/* harmony default export */ __webpack_exports__["a"] = (Component.exports);


/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__FeedSocketManager__);
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//



const ACTIONS = {
    STOP_FEED: Symbol("STOP_FEED"),
    RESTART: Symbol("RESTART"),
    UPDATE_ALERT_POSITION: Symbol("UPDATE_ALERT_POSITION"),
};

/* harmony default export */ __webpack_exports__["a"] = ({
    props: ["feed"],
    data() {
        return {
            // Pass-Through of data/methods into the Vue namespace
            ACTIONS: ACTIONS,
            FeedSocketManager: __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a,

            localAlertPosition: this.feed.alertPosition
        };
    },
    watch: {
        "feed.alertPosition": function(newValue) {
            this.localAlertPosition = newValue;
        }
    },
    methods: {
        catchAction(action) {
            let params = {
                action: action,
                id: this.feed.id
            };

            switch(action) {
                case ACTIONS.STOP_FEED:
                    break;
                case ACTIONS.RESTART:
                    break;
                case ACTIONS.UPDATE_ALERT_POSITION:
                    params["position"] = this.localAlertPosition;
                    break;
                
            }

            this.$emit("actionPassThrough", params)
        },
    },
    computed: {
        stateClasses() {
            let ret = "badge-success"
            switch(this.feed.state) {
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.RECEIVING:
                    ret = "badge-success"
                    break;
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.IDLE:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.OPEN:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.OPENING:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.REQUESTING_FEED:
                    ret = "badge-warning"
                    break;
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.CLOSED:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default.a.FEED_STATE.REJECTED:
                    ret = "badge-danger"
                    break;
            }
            return ret;
        }
    },

    // NON-VUE Additional Data/Methods
    ACTIONS: ACTIONS,
});


/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = normalizeComponent;
/* globals __VUE_SSR_CONTEXT__ */

// IMPORTANT: Do NOT use ES2015 features in this file (except for modules).
// This module is a runtime utility for cleaner component module output and will
// be included in the final webpack user bundle.

function normalizeComponent (
  scriptExports,
  render,
  staticRenderFns,
  functionalTemplate,
  injectStyles,
  scopeId,
  moduleIdentifier, /* server only */
  shadowMode /* vue-cli only */
) {
  scriptExports = scriptExports || {}

  // ES6 modules interop
  var type = typeof scriptExports.default
  if (type === 'object' || type === 'function') {
    scriptExports = scriptExports.default
  }

  // Vue.extend constructor export interop
  var options = typeof scriptExports === 'function'
    ? scriptExports.options
    : scriptExports

  // render functions
  if (render) {
    options.render = render
    options.staticRenderFns = staticRenderFns
    options._compiled = true
  }

  // functional template
  if (functionalTemplate) {
    options.functional = true
  }

  // scopedId
  if (scopeId) {
    options._scopeId = scopeId
  }

  var hook
  if (moduleIdentifier) { // server build
    hook = function (context) {
      // 2.3 injection
      context =
        context || // cached call
        (this.$vnode && this.$vnode.ssrContext) || // stateful
        (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext) // functional
      // 2.2 with runInNewContext: true
      if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
        context = __VUE_SSR_CONTEXT__
      }
      // inject component styles
      if (injectStyles) {
        injectStyles.call(this, context)
      }
      // register component module identifier for async chunk inferrence
      if (context && context._registeredComponents) {
        context._registeredComponents.add(moduleIdentifier)
      }
    }
    // used by ssr in case component is cached and beforeCreate
    // never gets called
    options._ssrRegister = hook
  } else if (injectStyles) {
    hook = shadowMode
      ? function () { injectStyles.call(this, this.$root.$options.shadowRoot) }
      : injectStyles
  }

  if (hook) {
    if (options.functional) {
      // for template-only hot-reload because in that case the render fn doesn't
      // go through the normalizer
      options._injectStyles = hook
      // register for functioal component in vue file
      var originalRender = options.render
      options.render = function renderWithStyleInjection (h, context) {
        hook.call(context)
        return originalRender(h, context)
      }
    } else {
      // inject component registration as beforeCreate hook
      var existing = options.beforeCreate
      options.beforeCreate = existing
        ? [].concat(existing, hook)
        : [hook]
    }
  }

  return {
    exports: scriptExports,
    options: options
  }
}


/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__ServiceMonitor_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedComponent_vue__ = __webpack_require__(8);
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//




/* harmony default export */ __webpack_exports__["a"] = ({
    components: {
        'feed-component': __WEBPACK_IMPORTED_MODULE_1__FeedComponent_vue__["a" /* default */]
    },
    methods: {
        catchAddFeed(id){
            this.$emit("addFeed", {
                id: id
            })
        },

        catchRemoveFeed(id){
            this.$emit("removeFeed", {
                id: id
            })
        },
        catchRequestNewFeed() {
            this.$emit("requestNewFeed", {})
        },


        catchActionPassThrough(params) {
            this.$emit("feedAction", params)
        }
        
    },
    computed: {
        stateClasses() {
            let ret = ""
            switch(this.serviceMonitor.status) {
                case __WEBPACK_IMPORTED_MODULE_0__ServiceMonitor_js__["a" /* default */].STATES.OK:
                    ret = "badge-success"
                    break;
                case __WEBPACK_IMPORTED_MODULE_0__ServiceMonitor_js__["a" /* default */].STATES.DEGRADED:
                    ret = "badge-warning"
                    break;
                case __WEBPACK_IMPORTED_MODULE_0__ServiceMonitor_js__["a" /* default */].STATES.UNAVAILABLE:
                    ret = "badge-error"
                    break;
            }
            return ret;
        }
    }
});


/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Logging__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Logging___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Logging__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__Publisher__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ChartManager_js__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__FeedManager_js__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__ServiceMonitor_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_FeedComponent_vue__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__View_js__ = __webpack_require__(18);













class Main extends __WEBPACK_IMPORTED_MODULE_1__Publisher___default.a {
    constructor() {
        super();

        this._feedList = {
            available: [],
            pending: []
        };

        $("#killSwitch").on("click", () => {
            this._killAllFeeds();
        });


        this._cm = new __WEBPACK_IMPORTED_MODULE_2__ChartManager_js__["a" /* default */]()

        
        
        this._feedManager = new __WEBPACK_IMPORTED_MODULE_3__FeedManager_js__["a" /* default */](this._cm);
        this._feedManager.subscribe(this);
        this._feedManager.fetchAllFeeds();        


        // Monitoring
        this._serviceMonitor = new __WEBPACK_IMPORTED_MODULE_4__ServiceMonitor_js__["a" /* default */]();
        this._serviceMonitor.subscribe(this)
        this._serviceMonitor.startMonitoring();
        this._serviceMonitorState = {
            status: this._serviceMonitor._state
        }
    }

    _addFeed(feedId) {

        if(feedId === undefined) {
            throw TypeError("id is undefined");
        } 

        this._feedManager.addFeed(feedId);        
    }
    
    _stopFeed(feedId) {
        this._feedManager.stopFeed(feedId);
    }
    
    _restartFeed(feedId) {
        this._feedManager.restartFeed(feedId);
    }

    _removeFeed(feedId) {

        if(feedId === undefined) {
            throw TypeError("id is undefined");
        } 

        this._feedManager.removeFeed(feedId);        
    }

    _setFeedAlertPosition(feedId, position) {
        this._feedManager.setAlertPosition(feedId, position);
    }
    
    
    _killAllFeeds() {
        this._feedManager.removeAllFeeds();
    }
    
    processEvent(event, params) {
        switch(event) {
            case __WEBPACK_IMPORTED_MODULE_3__FeedManager_js__["a" /* default */].EVENTS.UPDATED_FEED_LIST:
                this.log(params.feedList);

                // AVAILABLE
                this._feedList.available = []

                for(let item of params.feedList.available){
                    this._feedList.available.push(item);
                }

                // PENDING
                this._feedList.pending = []

                for(let item of params.feedList.pending){
                    this._feedList.pending.push(item);
                }

                break;

            case __WEBPACK_IMPORTED_MODULE_4__ServiceMonitor_js__["a" /* default */].EVENTS.SERVICE_UPDATE:
                this._serviceMonitorState.status = params.state;
                break;
        }
    }
}
/// MAIN ///
let main = new Main();

/// VIEW ///
let view = new __WEBPACK_IMPORTED_MODULE_6__View_js__["a" /* default */]();
    view.injectStateItem("feeds", main._feedManager.getViewModel());
    view.injectStateItem("feedList", main._feedList);
    view.injectStateItem("serviceMonitor", main._serviceMonitorState);
view.build();


view.on("addFeed", (params) => {
    main._addFeed(params.id);
})

view.on("requestNewFeed", (params) => {
    main._feedManager.requestNewFeed();
})

view.on("removeFeed", (params) => {
    main._removeFeed(params.id);
})


// Events/Action that have bubbled-up from an individual FeedComponent
view.on("feedAction", (params) => {
    switch(params.action) {
        case __WEBPACK_IMPORTED_MODULE_5__components_FeedComponent_vue__["a" /* default */].ACTIONS.STOP_FEED:
            main._stopFeed(params.id)
            break;
            
        case __WEBPACK_IMPORTED_MODULE_5__components_FeedComponent_vue__["a" /* default */].ACTIONS.RESTART:
            main._restartFeed(params.id)
            break;

        case __WEBPACK_IMPORTED_MODULE_5__components_FeedComponent_vue__["a" /* default */].ACTIONS.UPDATE_ALERT_POSITION:
            main._setFeedAlertPosition(params.id, params.position)
            break;
    }
});





/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

/**
 * Remember mixins? Until facebook and various react utilities figure out a new solution this will
 * make mixins work how they used to, by adding mixin methods directly to your react component.
 *
 * @param {function/array} mixins A reference to your mixin class
 * @param {object} context A reference to the react component class. Usually just "this".
 * @param {object} options An object of optional settings".
 * @returns undefined
 *
 * use it like this in your constructor:
 * mixins([mixin1, mixin2], this, {options});
 */

var Mixins = (function () {
    function Mixins() {
        _classCallCheck(this, Mixins);
    }

    _createClass(Mixins, [{
        key: 'init',
        value: function init(mixins, context, options) {
            this.mixins = mixins;
            this.context = context;

            this.opt = {
                warn: true,
                mergeDuplicates: true
            };

            this.contextMethods = Object.getOwnPropertyNames(this.context.constructor.prototype);
            this.reactMethods = ['componentWillMount', 'componentDidMount', 'componentWillReceiveProps', 'shouldComponentUpdate', 'componentWillUpdate', 'componentDidUpdate', 'componentWillUnmount'];

            if (options) {
                this.opt.warn = options.warn !== undefined ? options.warn : this.opt.warn;
                this.opt.mergeDuplicates = options.mergeDuplicates !== undefined ? options.mergeDuplicates : this.opt.mergeDuplicates;
            }

            if (this.mixins.constructor === Array) {
                mixins.map(function (mixin) {
                    this.grabMethods(mixin);
                }, this);
            } else if (typeof mixins === 'function' || typeof mixins === 'object') {
                this.grabMethods(mixins);
            } else {
                throw 'mixins expects a function, an array, or an object. Please and thank you';
            }
        }
    }, {
        key: 'addNewMethod',

        /**
         * If the method doesn't already exist on the react component, simply add this to it.
         *
         * @param {string} mm The name of a single mixin method
         * @param {function} currentMixin A reference to the mixin you are adding to the react component
         */
        value: function addNewMethod(mm, currentMixin) {
            if (this.mixins.prototype) {
                this.context.constructor.prototype[mm] = this.mixins.prototype[mm];
            } else {
                this.context.constructor.prototype[mm] = typeof currentMixin === 'object' ? currentMixin[mm] : currentMixin.prototype[mm];
            }
            this.contextMethods = Object.getOwnPropertyNames(this.context.constructor.prototype);
        }
    }, {
        key: 'extendMethod',

        /**
         * If there is already a method on your react component that matches the mixin method create a new function that
         * calls both methods so they can live in harmony.
         *
         * @param {string} mm The name of a single mixin method
         * @param {string} cm The name of the matched react method to extend
         * @param {function} currentMixin A reference to the mixin being added to the react method.
         */
        value: function extendMethod(mm, cm, currentMixin) {
            var orig = this.context[cm];
            var newMethod = typeof currentMixin === 'object' ? currentMixin[mm] : currentMixin.prototype[mm];
            this.context[mm] = function () {
                newMethod.call(this, arguments);
                orig.call(this, arguments);
            };
        }
    }, {
        key: 'grabMethods',

        /**
         * Takes a mixin method and sends it along the pipe
         * @param {function} mixin A single method from your mixin
         *
         */
        value: function grabMethods(mixin) {
            var _this = this;

            var currentMixin = mixin;
            var mixinMethods = typeof mixin === 'object' ? Object.getOwnPropertyNames(mixin) : Object.getOwnPropertyNames(mixin.prototype);

            mixinMethods.map(function (method) {
                if (method !== 'constructor' && method !== 'render') {
                    _this.checkForMatch(method, currentMixin);
                }
            }, this);
        }
    }, {
        key: 'checkForMatch',

        /**
         * Checks the react component to see if the method we want to add is already there.
         * If it is a duplicate and a React lifecycle method it silently extends the React method.
         * If it is a duplicate and not a React lifecycle method it warns you before extending the React method.
         *
         * @param {string} mm the mixin method to check against the react methods
         * @param {function} currentMixin A reference to the mixin being added to the React Component.
         */
        value: function checkForMatch(mm, currentMixin) {
            var _this2 = this;

            this.contextMethods.map(function (ctxMethod) {
                if (mm === ctxMethod) {
                    if (_this2.reactMethods.indexOf(mm) > -1) {
                        _this2.extendMethod(mm, ctxMethod, currentMixin);
                    } else {
                        if (_this2.opt.warn) {
                            console.warn(mm + ' method already exists within the ' + _this2.context.constructor.name + ' component.');
                        }
                        if (_this2.opt.mergeDuplicates) {
                            _this2.extendMethod(mm, ctxMethod, currentMixin);
                        }
                    }
                }
            });
            this.addNewMethod(mm, currentMixin);
        }
    }]);

    return Mixins;
})();

var mix = new Mixins();

module.exports = mix.init.bind(mix);


/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Publisher__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__FeedSocketManager__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__Feed_js__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ChartFeedProxy_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__AjaxManager__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__AjaxManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__AjaxManager__);






const STATES = {
    IDLE: Symbol("IDLE"),
    REQUESTING_FEED_LIST: Symbol("REQUESTING_FEED_LIST"),
    REQUESTING_NEW_FEED: Symbol ("REQUESTING_NEW_FEED"),
    AWAITING_NEW_FEED: Symbol ("AWAITING_NEW_FEED"),
    CHECKING_FEED_STATE: Symbol("CHECKING_FEED_STATE")

}

const EVENTS = {
    UPDATED_FEED_LIST: Symbol("FeedManager::" + "UPDATED_FEED_LIST")
}

class FeedManager extends __WEBPACK_IMPORTED_MODULE_0__Publisher___default.a {
    constructor(chartManager) {
        super();

        this._chartManager = chartManager;

        this._state = FeedManager.STATES.IDLE;
        this._feedsAvailable = [];
        this._feedsPending = [];

        this._feeds = {};

        this._socketManager = new __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager___default.a();
        
        this._ajaxManager = __WEBPACK_IMPORTED_MODULE_4__AjaxManager___default.a.getInstance();

        this._viewModel = { model: [] };
    }

    static get STATES() {
        return STATES;
    }

    addFeed(feedId) {
        if(feedId === undefined) {
            throw Error("feedId is undefined")
        } else if(this._feedsAvailable.findIndex((elem) => { return elem.feedId === feedId; }) === -1) {
            throw Error("feedId is not AVAILABLE")
        } else if(this._feeds[feedId] !== undefined) {
            throw Error("feedId already in use.")
        }

        
        let newFeed = new __WEBPACK_IMPORTED_MODULE_2__Feed_js__["a" /* default */](feedId);
        newFeed.subscribe(this);

        let chartProxy = new __WEBPACK_IMPORTED_MODULE_3__ChartFeedProxy_js__["a" /* default */](this._chartManager, feedId);
        
        let socketProxy = this._socketManager.addFeed(feedId);
        newFeed.attachSocket(socketProxy);
        newFeed.attachChart(chartProxy);

        this._feeds[feedId] = newFeed;

        this._feedsAvailable[this._feedsAvailable.findIndex((elem) => { return elem.feedId === feedId; })].isAdded = true;   

        this._updateViewModel();
    }

    restartFeed(feedId) {
        if(this._feeds[feedId] == undefined) {
            throw Error(`Feed id does not exist: ${feedId}`)
        }

        this._feeds[feedId].restartFeed();

        this._updateViewModel();
    }

    stopFeed(feedId) {
        if(this._feeds[feedId] == undefined) {
            throw Error(`Feed id does not exist: ${feedId}`)
        }

        this._feeds[feedId].stopFeed();

        this._updateViewModel();
    }

    removeFeed(feedId) {
        if(feedId === undefined) {
            throw Error("feedId is undefined")
        } else if(this._feeds[feedId] === undefined) {
            throw Error("feedId has not been added - cannot remove.")
        }

        this._feeds[feedId].removeFeed();

        this._feedsAvailable[this._feedsAvailable.findIndex((elem) => { return elem.feedId === feedId; })].isAdded = false;   

        this._feeds[feedId] = undefined;
        this._updateViewModel();
        delete this._feeds[feedId];
    }

    removeAllFeeds() {
        for(let feedId in this._feeds) {
            this.removeFeed(feedId);
        }
    }

    setAlertPosition(id, position) {
        this._feeds[id].setAlertPosition(position);
    }

    getViewModel() {
        return this._viewModel;
    }

    _changeState(newState) {
        this.log(` CHANGE STATE: ${newState.toString()}`);
        this._state = newState;
    }

    _checkFeedState(id) {
        let currentStatus = this._feedsPending.findIndex((elem) => { return elem === id}) !== -1 ? "pending" : "available";

        this._ajaxManager.request("getFeedState", {
            url: "http://localhost:3000/getFeedState", //TODO: CP: Magic string
            data: {
                feedId: id
            },
            beforeSend: () => {},
            success: (response) => {
                if(response.state && response.state !== currentStatus) {
                    if(currentStatus === "pending") {
                        this._feedsPending.splice(this._feedsPending.findIndex((elem) => { return elem === id}), 1)
                        this._feedsAvailable.push({
                            feedId: id,
                            isAdded: false
                        })

                        this._notifyAllFeedListChanges();
                    }
                }
            },
            complete: () => {},
            error: () => {},

        })
    }

    fetchAllFeeds() {
        this._ajaxManager.request("getFeedList", {
            url: "http://localhost:3000/feedList",
            beforeSend: () => {
                this._changeState(FeedManager.STATES.REQUESTING_FEED_LIST);
            },
            success: (response) => {
                this._feedsAvailable = response.map((elem) => {
                    return {
                        feedId: elem,
                        isAdded: false
                    }
                });

                this._notifyAllFeedListChanges();
            },
            complete: () => {
                this._changeState(FeedManager.STATES.IDLE);               
            }
        })
    }

    requestNewFeed() {
        this._ajaxManager.request("addFeed", {
            url: "http://localhost:3000/addFeed",
            beforeSend: () => {
                this._changeState(FeedManager.STATES.REQUESTING_NEW_FEED);
            },
            success: (response) => {
                this._changeState(FeedManager.STATES.AWAITING_NEW_FEED);

                this._feedsPending.push(response.feedId);

                this._notifyAllFeedListChanges();

                // TEMP
                let state = "pending";
                let timedOut = false;

                setInterval(() => {
                    this._checkFeedState(response.feedId);
                }, 2000 );

                this.log(`Pending Feed: ${response.feedId}`);
            },
            error: () => {
                this._changeState(FeedManager.STATES.IDLE);                
            }
        })
    }
    
    _notifyAllFeedListChanges() {
        this.broadcastEvent(FeedManager.EVENTS.UPDATED_FEED_LIST, {
            feedList: {
                available: this._feedsAvailable,
                pending: this._feedsPending
            }
        });
    }


    _updateViewModel() {
        for(let feedId in this._feeds) {
            
            let idx = this._viewModel["model"].findIndex((elem) => {
                return elem.id === feedId;
            });

            if(this._feeds[feedId] !== undefined) {    
                if(idx === -1) {
                    this._viewModel["model"].push({
                        id: feedId,
                        state: undefined,
                        rxCount: undefined,
                        alertPosition: 0,
                        showAlert: undefined,
                        isAdded: false
                    });
                    idx = this._viewModel["model"].length - 1;
                }

                this._viewModel["model"][idx].state = this._feeds[feedId]._state;
                this._viewModel["model"][idx].rxCount = this._feeds[feedId]._rxCount;
                this._viewModel["model"][idx].alertPosition = this._feeds[feedId]._alertPosition;
                this._viewModel["model"][idx].showAlert = this._feeds[feedId]._showAlert;
                this._viewModel["model"][idx].isAdded = this._feeds[feedId] !== undefined;
            } else {
                this._viewModel["model"].splice(idx, 1);
            }
        }
    }

    processEvent(event, params) {
        switch(event) {
            case __WEBPACK_IMPORTED_MODULE_2__Feed_js__["a" /* default */].EVENTS.STATE_CHANGE:
                this._updateViewModel();
                break;
        }
    }

    static get EVENTS() {
        return EVENTS;
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = FeedManager;


/***/ }),
/* 15 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Publisher__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketProxy__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ChartFeedProxy__ = __webpack_require__(2);




const EVENTS = {
    STATE_CHANGE: Symbol("Feed::" + "STATE_CHANGE")
}

class Feed extends __WEBPACK_IMPORTED_MODULE_0__Publisher___default.a {
    constructor(feedId) {
        super();

        this._feedId = feedId;


        this._socketProxy = undefined;
        this._chartProxy = undefined;

        this._state = undefined;
        this._rxCount = 0;
        this._showAlert = undefined;
        this._alertPosition = 0;
    }

    attachSocket(socketProxy) {
        if(this._socketProxy !== undefined) {
            throw Error("Attempt to redefine _socket. Case not yet handled.");
        }

        this._socketProxy = socketProxy;
        this._socketProxy.subscribe(this);
    }

    attachChart(chartProxy) {
        if(this._chartProxy !== undefined) {
            throw Error("Attempt to redefine _chartProxy. Case not yet handled.");
        }

        this._chartProxy = chartProxy;
        this._chartProxy.subscribe(this);
    }


    restartFeed() {
        this._socketProxy.restartFeed();
    }

    stopFeed() {
        this._socketProxy.stopFeed();
    }

    removeFeed() {
        this._socketProxy.remove();

        this._chartProxy.destroy();
    }

    setAlertPosition(position) {
        this._alertPosition = position;
        this._chartProxy.setAlertPosition(position);
    }


    processEvent(event, params) {
        switch(event){
            case __WEBPACK_IMPORTED_MODULE_1__FeedSocketProxy__["default"].EVENTS.FEED_STATE_CHANGE:
                this._state = params.state;

                this.broadcastEvent(Feed.EVENTS.STATE_CHANGE, {});
                break;

            case __WEBPACK_IMPORTED_MODULE_1__FeedSocketProxy__["default"].EVENTS.NEW_DATA:
                this._rxCount++;

                if(params.data.value > this._alertPosition) {
                    this._showAlert = true;
                } else {
                    this._showAlert = false;
                }

                this._chartProxy.addDataElement(params.data)

                this.broadcastEvent(Feed.EVENTS.STATE_CHANGE, {});

                break;

            case __WEBPACK_IMPORTED_MODULE_2__ChartFeedProxy__["a" /* default */].EVENTS.ALTER_POSITION_CHANGE:
                this._alertPosition = params.newPosition;

                this.broadcastEvent(Feed.EVENTS.STATE_CHANGE, {});

                this.
                break;
        }
    }

    static get EVENTS() {
        return EVENTS;
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = Feed;


/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = jQuery;

/***/ }),
/* 17 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return render; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return staticRenderFns; });
var render = function() {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
  return _c("div", { staticClass: "panel panel-default" }, [
    _c(
      "div",
      {
        staticClass: "panel-heading",
        staticStyle: { width: "100%", margin: "auto" }
      },
      [
        _vm._v("\n        " + _vm._s(_vm.feed.id) + " "),
        _c(
          "span",
          {
            staticClass: "badge",
            class: _vm.stateClasses,
            staticStyle: { float: "right" }
          },
          [_vm._v(_vm._s(_vm.feed.state))]
        )
      ]
    ),
    _vm._v(" "),
    _c("div", { staticClass: "panel-body" }, [
      _c("div", { staticClass: "row" }, [
        _c("div", { staticClass: "col-sm" }, [
          _c("div", { staticClass: "row" }, [
            _c("div", { staticClass: "col-sm-9" }, [
              _vm._v(
                "\n                    Rx: " +
                  _vm._s(_vm.feed.rxCount) +
                  "\n                    "
              )
            ])
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "row" }, [
            _c("div", { staticClass: "col-sm-12" }, [
              _c("div", { staticClass: "row" }, [
                _c("div", { staticClass: "col-sm-3" }, [
                  _vm.feed.state === _vm.FeedSocketManager.FEED_STATE.CLOSED
                    ? _c("input", {
                        staticClass: "btn btn-warning",
                        attrs: { type: "button", value: "Restart" },
                        on: {
                          click: function($event) {
                            _vm.catchAction(_vm.ACTIONS.RESTART)
                          }
                        }
                      })
                    : _vm._e(),
                  _vm._v(" "),
                  _vm.feed.state !== _vm.FeedSocketManager.FEED_STATE.CLOSED
                    ? _c("input", {
                        staticClass: "btn btn-danger",
                        attrs: { type: "button", value: "Stop" },
                        on: {
                          click: function($event) {
                            _vm.catchAction(_vm.ACTIONS.STOP_FEED)
                          }
                        }
                      })
                    : _vm._e()
                ]),
                _vm._v(" "),
                _vm._m(0),
                _vm._v(" "),
                _vm._m(1),
                _vm._v(" "),
                _c("div", { staticClass: "col-sm-3" }, [
                  _c("div", {
                    directives: [
                      {
                        name: "show",
                        rawName: "v-show",
                        value: _vm.feed.showAlert,
                        expression: "feed.showAlert"
                      }
                    ],
                    staticClass: "glyphicon glyphicon-alert",
                    staticStyle: { color: "red", "font-size": "25px" }
                  })
                ])
              ]),
              _vm._v(" "),
              _c("input", {
                directives: [
                  {
                    name: "model",
                    rawName: "v-model",
                    value: _vm.localAlertPosition,
                    expression: "localAlertPosition"
                  }
                ],
                attrs: { type: "text" },
                domProps: { value: _vm.localAlertPosition },
                on: {
                  input: function($event) {
                    if ($event.target.composing) {
                      return
                    }
                    _vm.localAlertPosition = $event.target.value
                  }
                }
              }),
              _vm._v(" "),
              _c("input", {
                staticClass: "btn btn-primary",
                attrs: { type: "button", value: "Update Alert Position" },
                on: {
                  click: function($event) {
                    _vm.catchAction(_vm.ACTIONS.UPDATE_ALERT_POSITION)
                  }
                }
              })
            ])
          ])
        ])
      ])
    ])
  ])
}
var staticRenderFns = [
  function() {
    var _vm = this
    var _h = _vm.$createElement
    var _c = _vm._self._c || _h
    return _c("div", { staticClass: "col-sm-3" }, [
      _c("input", {
        staticClass: "btn btn-primary",
        attrs: { type: "button", value: "???" }
      })
    ])
  },
  function() {
    var _vm = this
    var _h = _vm.$createElement
    var _c = _vm._self._c || _h
    return _c("div", { staticClass: "col-sm-3" }, [
      _c("input", {
        staticClass: "btn btn-primary",
        attrs: { type: "button", value: "???" }
      })
    ])
  }
]
render._withStripped = true

if (false) {
  module.hot.accept()
  if (module.hot.data) {
    require("vue-hot-reload-api")      .rerender("data-v-160546e4", { render: render, staticRenderFns: staticRenderFns })
  }
}

/***/ }),
/* 18 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__FeedSocketManager__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__ServiceMonitor_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_vue__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_Main_vue__ = __webpack_require__(20);









class View {
    constructor() {
        this._data = {}
    }

    injectStateItem(id, stateObj) {
        if(this._data[id] !== undefined) {
            throw `Attempt to assign to id already in use: ${id}`;
        } else {
            this._data[id] = stateObj;
        }
    }
    injectStateItems(items) {
        for(let item in items) {
            this.injectStateItems(item.id, item.stateObj);
        }
    }

    build() {
        Object.assign(__WEBPACK_IMPORTED_MODULE_3__components_Main_vue__["a" /* default */], {
            el: '#app',
            data: this._data,
        });

        this._vm = new __WEBPACK_IMPORTED_MODULE_2_vue___default.a(__WEBPACK_IMPORTED_MODULE_3__components_Main_vue__["a" /* default */]);
    }

    on(id, func) {
        if(this._vm === undefined) {
            throw "Vue instance not built. Call build() before attaching listeners. "
        } else {
            this._vm.$on(id, func);
        }
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = View;


/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = Vue;

/***/ }),
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__node_modules_vue_loader_lib_selector_type_script_index_0_Main_vue__ = __webpack_require__(11);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_dc97f338_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_Main_vue__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__node_modules_vue_loader_lib_runtime_component_normalizer__ = __webpack_require__(10);
var disposed = false
/* script */


/* template */

/* template functional */
var __vue_template_functional__ = false
/* styles */
var __vue_styles__ = null
/* scopeId */
var __vue_scopeId__ = null
/* moduleIdentifier (server only) */
var __vue_module_identifier__ = null

var Component = Object(__WEBPACK_IMPORTED_MODULE_2__node_modules_vue_loader_lib_runtime_component_normalizer__["a" /* default */])(
  __WEBPACK_IMPORTED_MODULE_0__node_modules_vue_loader_lib_selector_type_script_index_0_Main_vue__["a" /* default */],
  __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_dc97f338_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_Main_vue__["a" /* render */],
  __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_dc97f338_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_Main_vue__["b" /* staticRenderFns */],
  __vue_template_functional__,
  __vue_styles__,
  __vue_scopeId__,
  __vue_module_identifier__
)
Component.options.__file = "static/js/src/components/Main.vue"

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-dc97f338", Component.options)
  } else {
    hotAPI.reload("data-v-dc97f338", Component.options)
  }
  module.hot.dispose(function (data) {
    disposed = true
  })
})()}

/* harmony default export */ __webpack_exports__["a"] = (Component.exports);


/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return render; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return staticRenderFns; });
var render = function() {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
  return _c("div", [
    _c("div", { staticClass: "row" }, [
      _c("div", { staticClass: "col-sm-4" }, [
        _c("div", { staticClass: "panel panel-default" }, [
          _c("div", { staticClass: "panel-heading" }, [
            _vm._v("Service Monitor")
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "panel-body" }, [
            _c("p", { staticClass: "card-text" }, [
              _vm._v("\n                        Status: ")
            ]),
            _c("h3", [
              _c("span", { staticClass: "badge ", class: _vm.stateClasses }, [
                _vm._v(_vm._s(_vm.serviceMonitor.status))
              ])
            ]),
            _vm._v(" "),
            _c("p")
          ])
        ])
      ]),
      _vm._v(" "),
      _c("div", { staticClass: "col-sm-8" }, [
        _c("div", { staticClass: "panel panel-default" }, [
          _c(
            "div",
            {
              staticClass: "panel-heading",
              staticStyle: { width: "100%", margin: "auto", overflow: "auto" }
            },
            [
              _vm._v(
                "\n                    Pending Feeds \n                    "
              ),
              _c("input", {
                staticClass: "btn btn-success",
                staticStyle: { float: "right" },
                attrs: { type: "button", value: "Request New Feed" },
                on: {
                  click: function($event) {
                    _vm.catchRequestNewFeed()
                  }
                }
              })
            ]
          ),
          _vm._v(" "),
          _c("div", { staticClass: "panel-body" }, [
            _c(
              "ul",
              { staticClass: "list-group" },
              _vm._l(_vm.feedList.pending, function(feedPending) {
                return _c(
                  "li",
                  { staticClass: "list-group-item list-group-item-warning" },
                  [
                    _vm._v(
                      "\n                            " +
                        _vm._s(feedPending) +
                        "\n                        "
                    )
                  ]
                )
              })
            )
          ])
        ])
      ])
    ]),
    _vm._v(" "),
    _c("div", { staticClass: "row" }, [
      _c("div", { staticClass: "col-sm-6" }, [
        _c("div", { staticClass: "panel panel-default" }, [
          _c("div", { staticClass: "panel-heading" }, [
            _vm._v("Available Feeds")
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "panel-body" }, [
            _c(
              "ul",
              { staticClass: "list-group" },
              _vm._l(_vm.feedList.available, function(feed) {
                return _c(
                  "li",
                  {
                    key: feed.feedId,
                    staticClass: "list-group-item list-group-item-success",
                    staticStyle: {
                      margin: "auto",
                      width: "100%",
                      overflow: "auto"
                    }
                  },
                  [
                    _vm._v(
                      "\n                            " +
                        _vm._s(feed.feedId) +
                        "\n                            "
                    ),
                    _c("input", {
                      directives: [
                        {
                          name: "show",
                          rawName: "v-show",
                          value: !feed.isAdded,
                          expression: "!feed.isAdded"
                        }
                      ],
                      staticClass: "btn btn-primary",
                      staticStyle: { float: "right" },
                      attrs: { type: "button", value: "Add Feed" },
                      on: {
                        click: function($event) {
                          _vm.catchAddFeed(feed.feedId)
                        }
                      }
                    }),
                    _vm._v(" "),
                    _c("input", {
                      directives: [
                        {
                          name: "show",
                          rawName: "v-show",
                          value: feed.isAdded,
                          expression: "feed.isAdded"
                        }
                      ],
                      staticClass: "btn btn-danger",
                      staticStyle: { float: "right" },
                      attrs: { type: "button", value: "Remove Feed" },
                      on: {
                        click: function($event) {
                          _vm.catchRemoveFeed(feed.feedId)
                        }
                      }
                    })
                  ]
                )
              })
            )
          ])
        ])
      ]),
      _vm._v(" "),
      _c(
        "div",
        { staticClass: "col-sm-6" },
        [
          _c("ul", { staticClass: "list-group" }),
          _vm._v(" "),
          _vm._l(_vm.feeds.model, function(feed) {
            return _c("feed-component", {
              key: feed.id,
              attrs: { feed: feed },
              on: { actionPassThrough: _vm.catchActionPassThrough }
            })
          })
        ],
        2
      )
    ])
  ])
}
var staticRenderFns = []
render._withStripped = true

if (false) {
  module.hot.accept()
  if (module.hot.data) {
    require("vue-hot-reload-api")      .rerender("data-v-dc97f338", { render: render, staticRenderFns: staticRenderFns })
  }
}

/***/ })
/******/ ]);