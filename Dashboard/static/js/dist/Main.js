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
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
class Publisher {
    constructor() {
        this._subscribers = [];
    }

    subscribe(subscriber) {
        this._subscribers.push(subscriber);
    }

    broadcastEvent(event, params) {
        for(let subscriber of this._subscribers) {
            subscriber.processEvent(event, params);
        }
    }

    processEvent(event, params) {
        // Abstract
        throw "processEvent() should be implemented in Child class."
    }

}
/* harmony export (immutable) */ __webpack_exports__["a"] = Publisher;


/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketProxy_js__ = __webpack_require__(11);



const FEED_URL = "ws://localhost:3000/feedProvider"; // MAKE GLOBAL!

const FEED_STATE = {
    IDLE: Symbol("IDLE"), //DEFUNCT
    OPENING: Symbol("OPENING"),
    OPEN: Symbol("OPEN"),
    REQUESTING_FEED: Symbol("REQUESTING_FEED"),
    RECEIVING: Symbol("RECEIVING"),
    REJECTED: Symbol("REJECTED"),
    CLOSED: Symbol("CLOSED")
};

class FeedSocketManager extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */] {
    constructor() {
        super();

        this._feeds = []
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


    addFeed(id) {

        if(this._feeds.hasOwnProperty(id)){
            throw "Feed ID Already In Use: " + id;
        }
        
        let socketProxy = new __WEBPACK_IMPORTED_MODULE_1__FeedSocketProxy_js__["a" /* default */](this, id);
        this.subscribe(socketProxy);

        let webSocket = this._createWebSocket(id);
        
        this._feeds[id] = {
            state: FeedSocketManager.FEED_STATE.IDLE,
            proxy: socketProxy,
            socket: webSocket
        }        ;

        this._changeState(id, FeedSocketManager.FEED_STATE.OPENING);

        return this._feeds[id].proxy;
        
    }

    /// FEED MANAGEMENT
    _requestFeed(id){
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

    _socketClosed(id, e) {
        this.log(`<${id}> Closed: ${e.code}`);

        // Manually push for socket closure
        // Cases where the server sends ADNORMAL (1006) close event and continues sending messages as if the socket is open.
        this._feeds[id].socket.close();

        this._changeState(id, FeedSocketManager.FEED_STATE.CLOSED);
        
    }

    _socketError(id, e) {
        this.log(`<${id}> ERROR`);

        this._changeState(id, FeedSocketManager.FEED_STATE.CLOSED);
    }

    _socketMessageReceived(id, e) {
        //this.log(`<${id}> Rx`)

        this.broadcastEvent("RX", { feedId: id, value: JSON.parse(e.data).value })

        switch(this._feeds[id].state) {
            case FeedSocketManager.FEED_STATE.REQUESTING_FEED:
                let jsonResponse = JSON.parse(e.data);

                if(jsonResponse.status === "accepted") {
                    this._changeState(id, FeedSocketManager.FEED_STATE.RECEIVING);

                } else {
                    throw "Feed Request Rejected :("
                }

                break;

            case FeedSocketManager.FEED_STATE.RECEIVING:
                //this.log(`<${id}>Got a data packet.`);
                this._feeds[id].proxy.broadcastEvent("NEW_DATA", {data: JSON.parse(e.data)});
                

                break;
        }
    }

    _socketSend(id, payload) {
        try {
            if(typeof payload !== "string") {
                payload = JSON.stringify(payload);
            }
            this.log(`<${id}> Tx: ` + payload);

            this._feeds[id].socket.send(payload);
        } catch(e) {
            // TODO 
            throw "Unhandled Socket Send Exception";
        }
    }

    /// NISC
    _changeState(id, newState) {
        this.log(`<${id}> CHANGE STATE TO: ${newState.toString()}`)
        this.broadcastEvent("FEED_STATE_CHANGE", {
            feedId: id, 
            state: newState
        })

        this._feeds[id].state = newState;
    }

    /// UTILS

    log(msg) {
        console.log(this.constructor.name + ":: " + msg)
    }

    stopFeed(id) {
        this._feeds[id].socket.close();
        this._changeState(id, FeedSocketManager.FEED_STATE.CLOSED);
    }

    restartFeed(id) {
        if(this._feeds[id].state === FeedSocketManager.FEED_STATE.CLOSED){
            
            delete this._feeds[id].socket;
            this._feeds[id].socket = this._createWebSocket(id);
        } else {
            throw "Cannot restart when feed socket is not in CLOSED state."
        }
    }

    processEvent(event, params) {
        // Do Nothing
    }

}
/* harmony export (immutable) */ __webpack_exports__["a"] = FeedSocketManager;


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);


const SERVICE_STATUS_TIMEOUT = 2000; //milliseconds
const SERVICE_CHECK_INTERVAL = 3000; //milliseconds

const STATES = {
    OK: Symbol("OK"),
    DEGRADED: Symbol("DEGRADED"),
    UNAVAILABLE: Symbol("UNAVAILABLE"),
}

class ServiceMonitor extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */] {
    constructor() {
        super();

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
        $.ajax({
            url: "http://localhost:3000/status",
            method: "POST",
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
                this.broadcastEvent("SERVICE_UPDATE", {
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
        console.log(`${this.constructor.name}:: CHANGE STATE: ${newState.toString()}`)

        this._state = newState;
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = ServiceMonitor;


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);


class ChartFeedProxy extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */]{
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
                case "":
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
}
/* harmony export (immutable) */ __webpack_exports__["a"] = ChartFeedProxy;


/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__node_modules_vue_loader_lib_selector_type_script_index_0_FeedComponent_vue__ = __webpack_require__(5);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_160546e4_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_FeedComponent_vue__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__node_modules_vue_loader_lib_runtime_component_normalizer__ = __webpack_require__(6);
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
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__ = __webpack_require__(1);
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
            FeedSocketManager: __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */],

            alertPosition: 0
        };
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
                    params["position"] = this.alertPosition
                    break;
                
            }

            this.$emit("actionPassThrough", params)
        },
    },
    computed: {
        stateClasses() {
            let ret = "badge-success"
            switch(this.feed.state) {
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.RECEIVING:
                    ret = "badge-success"
                    break;
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.IDLE:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.OPEN:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.OPENING:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.REQUESTING_FEED:
                    ret = "badge-warning"
                    break;
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.CLOSED:
                case __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__["a" /* default */].FEED_STATE.REJECTED:
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
/* 6 */
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
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__ServiceMonitor_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedComponent_vue__ = __webpack_require__(4);
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
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__ChartManager_js__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__FeedManager_js__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ServiceMonitor_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_FeedComponent_vue__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__View_js__ = __webpack_require__(14);












class Main extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */] {
    constructor() {
        super();

        this._feedList = {
            available: [],
            pending: []
        };

        $("#killSwitch").on("click", () => {
            this._killAllFeeds();
        });


        this._cm = new __WEBPACK_IMPORTED_MODULE_1__ChartManager_js__["a" /* default */]()

        
        
        this._feedManager = new __WEBPACK_IMPORTED_MODULE_2__FeedManager_js__["a" /* default */](this._cm);
        this._feedManager.subscribe(this);
        this._feedManager.fetchAllFeeds();        


        // Monitoring
        this._serviceMonitor = new __WEBPACK_IMPORTED_MODULE_3__ServiceMonitor_js__["a" /* default */]();
        this._serviceMonitor.subscribe(this)
        this._serviceMonitor.startMonitoring();
        this._serviceMonitorState = {
            status: this._serviceMonitor._state
        }
    }

    _addFeed(id) {

        if(id === undefined) {
            throw TypeError("id is undefined");
        } 

        this._feedManager.addFeed(id);        
    }
    
    _stopFeed(id) {
        this._feedManager.stopFeed(id);
    }
    
    _restartFeed(id) {
        this._feedManager.restartFeed(id);
    }

    _setFeedAlertPosition(id, position) {
        this._feedManager.setAlertPosition(id, position);
    }
    
    
    _killAllFeeds() {
        this._feedManager.killAll(id);
    }
    
    processEvent(event, params) {
        switch(event) {
            case "UPDATED_FEED_LIST":
                console.log(params.feedList);

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

            case "SERVICE_UPDATE":
                this._serviceMonitorState.status = params.state;
                break;
        }
    }
}
/// MAIN ///
let main = new Main();

/// VIEW ///
let view = new __WEBPACK_IMPORTED_MODULE_5__View_js__["a" /* default */]();
    view.injectStateItem("feeds", main._feedManager.getViewModel());
    view.injectStateItem("feedList", main._feedList);
    view.injectStateItem("serviceMonitor", main._serviceMonitorState);
view.build();


view.on("addFeed", (params) => {
    main._addFeed(params.id);
})

view.on("requestNewFeed", () => {
    main._feedManager.requestNewFeed();
})


// Events/Action that have bubbled-up from an individual FeedComponent
view.on("feedAction", (params) => {
    switch(params.action) {
        case __WEBPACK_IMPORTED_MODULE_4__components_FeedComponent_vue__["a" /* default */].ACTIONS.STOP_FEED:
            main._stopFeed(params.id)
            break;
            
        case __WEBPACK_IMPORTED_MODULE_4__components_FeedComponent_vue__["a" /* default */].ACTIONS.RESTART:
            main._restartFeed(params.id)
            break;

        case __WEBPACK_IMPORTED_MODULE_4__components_FeedComponent_vue__["a" /* default */].ACTIONS.UPDATE_ALERT_POSITION:
            main._setFeedAlertPosition(params.id, params.position)
            break;
    }
});





/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__ChartFeedProxy_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Publisher_js__ = __webpack_require__(0);



class ChartManager extends __WEBPACK_IMPORTED_MODULE_1__Publisher_js__["a" /* default */] {
    constructor() {
        super();

        /// DATA FEED SETUP ///
        this._feeds = {}

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
    }
    
    _updateGraph() {
        this._setYDomain();

        this._setXDomain();
    
        this._g.select(".yAxis")
            .call(d3.axisLeft(this._y))
    
        this._g.select(".xAxis")
            .call(d3.axisBottom(this._x))
    
    

        for(let feedId in this._feeds) {
            d3.selectAll("." + feedId)
                .attr("d", this._line(this._feeds[feedId].data));

            this._g.select(".alertLine" + feedId)
                .attr("y1", this._y(this._feeds[feedId].alertPosition))
                .attr("y2", this._y(this._feeds[feedId].alertPosition))
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

        
        this._g.append("path")
            .attr("class", feedId)
            .attr("fill", "none")
            .attr("stroke", this._getNextColour())
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", this._line(feedObj.data));

        this._g.append("line")
            .attr("class", "alertLine" + feedId)
            .attr("x1", this._x(this._x.domain()[0]))
            .attr("y1", this._y(feedObj.alertPosition))
            .attr("x2", this._x(this._x.domain()[1]))
            .attr("y2", this._y(feedObj.alertPosition))
            .style("stroke-width", 2)
            .style("stroke", "red")
            .style("fill", "none")
        
        
        this._feeds[feedId] = feedObj;
    }

    _giveData(id, data) {
        this._feeds[id].data.push({
            value: data.value,
            date: new Date(data.timestamp)
        });
    
        this._updateData(id);
        
        this._updateGraph();
    }

    _killFeed(id) {
        delete this._feeds[id];

        this._g.selectAll("." + id).remove();
        
        this._updateGraph();
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = ChartManager;


/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager_js__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__Feed_js__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ChartFeedProxy_js__ = __webpack_require__(3);





const STATES = {
    IDLE: Symbol("IDLE"),
    REQUESTING_FEED_LIST: Symbol("REQUESTING_FEED_LIST"),
    REQUESTING_NEW_FEED: Symbol ("REQUESTING_NEW_FEED"),
    AWAITING_NEW_FEED: Symbol ("AWAITING_NEW_FEED"),
    CHECKING_FEED_STATE: Symbol("CHECKING_FEED_STATE")

}

class FeedManager extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */] {
    constructor(chartManager) {
        super();

        this._chartManager = chartManager;

        this._state = FeedManager.STATES.IDLE;
        this._feedsAvailable = [];
        this._feedsPending = [];

        this._feeds = {};

        this._socketManager = new __WEBPACK_IMPORTED_MODULE_1__FeedSocketManager_js__["a" /* default */]();

        this._viewModel = { model: [] };
    }

    static get STATES() {
        return STATES;
    }

    addFeed(feedId) {
        if(feedId === undefined) {
            throw Error("feedId is undefined")
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

        this._updateViewModel();
    }

    restartFeed(id) {
        if(this._feeds[id] == undefined) {
            throw Error(`Feed id does not exist: ${id}`)
        }

        this._feeds[id].restartFeed();

        this._updateViewModel();
    }

    stopFeed(id) {
        if(this._feeds[id] == undefined) {
            throw Error(`Feed id does not exist: ${id}`)
        }

        this._feeds[id].stopFeed();

        this._updateViewModel();
    }

    setAlertPosition(id, position) {
        this._feeds[id].setAlertPosition(position);
    }

    getViewModel() {
        return this._viewModel;
    }

    _changeState(newState) {
        console.log(`${this.constructor.name}:: CHANGE STATE: ${newState.toString()}`);
        this._state = newState;
    }

    _checkFeedState(id) {
        let currentStatus = this._feedsPending.findIndex((elem) => { return elem === id}) !== -1 ? "pending" : "available";
        $.ajax({
            url: "http://localhost:3000/getFeedState",
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify({
                feedId: id
            }),
            beforeSend: () => {
                //this._changeState(FeedManager.STATES.CHECKING_FEED_STATE);
            },
            success: (response) => {
                if(response.state && response.state !== currentStatus) {
                    if(currentStatus === "pending") {
                        this._feedsPending.splice(this._feedsPending.findIndex((elem) => { return elem === id}), 1)
                        this._feedsAvailable.push(id)

                        this._notifyAllFeedListChanges();
                    }
                }
            },
            complete: () => {
                //this._changeState(FeedManager.STATES.IDLE);               
            }
        })
    }

    fetchAllFeeds() {
        $.ajax({
            url: "http://localhost:3000/feedList",
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            beforeSend: () => {
                this._changeState(FeedManager.STATES.REQUESTING_FEED_LIST);
            },
            success: (response) => {
                this._feedsAvailable = response;

                this._notifyAllFeedListChanges();
            },
            complete: () => {
                this._changeState(FeedManager.STATES.IDLE);               
            }
        })
    }

    requestNewFeed() {
        $.ajax({
            url: "http://localhost:3000/addFeed",
            method: "POST",
            dataType: "json",
            contentType: "application/json",
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

                console.log(`Pending Feed: ${response.feedId}`);
            },
            error: () => {
                this._changeState(FeedManager.STATES.IDLE);                
            }
        })
    }
    
    _notifyAllFeedListChanges() {
        this.broadcastEvent("UPDATED_FEED_LIST", {
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

            if(idx === -1) {
                this._viewModel["model"].push({
                    id: feedId,
                    state: undefined,
                    rxCount: undefined,
                    showAlert: undefined
                });
                idx = this._viewModel["model"].length - 1;
            }

            this._viewModel["model"][idx].state = this._feeds[feedId]._state;
            this._viewModel["model"][idx].rxCount = this._feeds[feedId]._rxCount;
            this._viewModel["model"][idx].showAlert = this._feeds[feedId]._showAlert;
        }
    }

    processEvent(event, params) {
        switch(event) {
            case "STATE_CHANGE":
                this._updateViewModel();
                break;
        }
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = FeedManager;


/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);


class FeedSocketProxy extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */] {
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

    processEvent(event, params) {
        if(params.feedId === this._feedId) {
            switch(event){
                case "FEED_STATE_CHANGE":
                    this.broadcastEvent("FEED_STATE_CHANGE", params)
                    break;
                case "NEW_DATA":
                    this.broadcastEvent("NEW_DATA", params);
                    break;
            }
        }
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = FeedSocketProxy;


/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Publisher_js__ = __webpack_require__(0);


class Feed extends __WEBPACK_IMPORTED_MODULE_0__Publisher_js__["a" /* default */] {
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
    }


    restartFeed() {
        this._socketProxy.restartFeed();
    }

    stopFeed() {
        this._socketProxy.stopFeed();
    }

    setAlertPosition(position) {
        this._alertPosition = position;
        this._chartProxy.setAlertPosition(position);
    }


    processEvent(event, params) {
        switch(event){
            case "FEED_STATE_CHANGE":
                this._state = params.state;

                this.broadcastEvent("STATE_CHANGE", {});
                break;

            case "NEW_DATA":
                this._rxCount++;

                if(params.data.value > this._alertPosition) {
                    this._showAlert = true;
                } else {
                    this._showAlert = false;
                }

                this._chartProxy.addDataElement(params.data)

                this.broadcastEvent("STATE_CHANGE", {});

                break;
        }
    }

}
/* harmony export (immutable) */ __webpack_exports__["a"] = Feed;


/***/ }),
/* 13 */
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
                _vm._m(2)
              ]),
              _vm._v(" "),
              _c("input", {
                directives: [
                  {
                    name: "model",
                    rawName: "v-model",
                    value: _vm.alertPosition,
                    expression: "alertPosition"
                  }
                ],
                attrs: { type: "text" },
                domProps: { value: _vm.alertPosition },
                on: {
                  input: function($event) {
                    if ($event.target.composing) {
                      return
                    }
                    _vm.alertPosition = $event.target.value
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
        ]),
        _vm._v(" "),
        _c("div", { staticClass: "col-sm-12" }, [
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
            staticStyle: { color: "red", "font-size": "71px" }
          })
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
  },
  function() {
    var _vm = this
    var _h = _vm.$createElement
    var _c = _vm._self._c || _h
    return _c("div", { staticClass: "col-sm-3" }, [
      _c("input", {
        staticClass: "btn btn-danger",
        attrs: { type: "button", value: "Remove" }
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
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__FeedSocketManager_js__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__ServiceMonitor_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_vue__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_Main_vue__ = __webpack_require__(16);









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
/* 15 */
/***/ (function(module, exports) {

module.exports = Vue;

/***/ }),
/* 16 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__node_modules_vue_loader_lib_selector_type_script_index_0_Main_vue__ = __webpack_require__(7);
/* unused harmony namespace reexport */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_dc97f338_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_selector_type_template_index_0_Main_vue__ = __webpack_require__(17);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__node_modules_vue_loader_lib_runtime_component_normalizer__ = __webpack_require__(6);
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
/* 17 */
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
              staticStyle: { width: "100%", margin: "auto" }
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
              _vm._l(_vm.feedList.available, function(feedId) {
                return _c(
                  "li",
                  {
                    staticClass: "list-group-item list-group-item-success",
                    staticStyle: { margin: "auto", width: "100%" }
                  },
                  [
                    _vm._v(
                      "\n                            " +
                        _vm._s(feedId) +
                        "\n                            "
                    ),
                    _c("input", {
                      staticClass: "btn btn-primary",
                      staticStyle: { float: "right" },
                      attrs: { type: "button", value: "Add Feed" },
                      on: {
                        click: function($event) {
                          _vm.catchAddFeed(feedId)
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