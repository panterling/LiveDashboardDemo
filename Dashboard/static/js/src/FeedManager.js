import Publisher from "./Publisher.js"
import FeedSocketManager from "./FeedSocketManager.js";
import Feed from "./Feed.js";
import ChartFeedProxy from "./ChartFeedProxy.js";

const STATES = {
    IDLE: Symbol("IDLE"),
    REQUESTING_FEED_LIST: Symbol("REQUESTING_FEED_LIST"),
    REQUESTING_NEW_FEED: Symbol ("REQUESTING_NEW_FEED"),
    AWAITING_NEW_FEED: Symbol ("AWAITING_NEW_FEED"),
    CHECKING_FEED_STATE: Symbol("CHECKING_FEED_STATE")

}

export default class FeedManager extends Publisher {
    constructor(chartManager) {
        super();

        this._chartManager = chartManager;

        this._state = FeedManager.STATES.IDLE;
        this._feedsAvailable = [];
        this._feedsPending = [];

        this._feeds = {};

        this._socketManager = new FeedSocketManager();

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

        
        let newFeed = new Feed(feedId);
        newFeed.subscribe(this);

        let chartProxy = new ChartFeedProxy(this._chartManager, feedId);
        
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
            url: "/getFeedState",
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
            url: "/feedList",
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
            url: "/addFeed",
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