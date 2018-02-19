import Publisher from "./Publisher.js"
import ChartManager from "./ChartManager.js"
import FeedManager from "./FeedManager.js"
import ServiceMonitor from "./ServiceMonitor.js"

import FeedComponent from "./components/FeedComponent.vue"

import View from "./View.js"




class Main extends Publisher {
    constructor() {
        super();

        this._feedList = {
            available: [],
            pending: []
        };

        $("#killSwitch").on("click", () => {
            this._killAllFeeds();
        });


        this._cm = new ChartManager()

        
        
        this._feedManager = new FeedManager(this._cm);
        this._feedManager.subscribe(this);
        this._feedManager.fetchAllFeeds();        


        // Monitoring
        this._serviceMonitor = new ServiceMonitor();
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
let view = new View();
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
        case FeedComponent.ACTIONS.STOP_FEED:
            main._stopFeed(params.id)
            break;
            
        case FeedComponent.ACTIONS.RESTART:
            main._restartFeed(params.id)
            break;

        case FeedComponent.ACTIONS.UPDATE_ALERT_POSITION:
            main._setFeedAlertPosition(params.id, params.position)
            break;
    }
});



