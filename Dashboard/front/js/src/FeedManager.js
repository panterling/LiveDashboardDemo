import Publisher from "./Publisher"
import FeedSocketManager from "./FeedSocketManager";
import Feed from "./Feed.js";
import ChartFeedProxy from "./ChartFeedProxy.js";
import AjaxManager from "./AjaxManager"

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

export default class FeedManager extends Publisher {
    constructor(chartManager) {
        super();

        this._chartManager = chartManager;

        this._state = FeedManager.STATES.IDLE;
        this._feedsAvailable = [];
        this._feedsPending = [];

        this._feeds = {};

        this._socketManager = new FeedSocketManager();
        
        this._ajaxManager = AjaxManager.getInstance();

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

        
        let newFeed = new Feed(feedId);
        newFeed.subscribe(this);

        let chartProxy = new ChartFeedProxy(this._chartManager, feedId);
        
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
            case Feed.EVENTS.STATE_CHANGE:
                this._updateViewModel();
                break;
        }
    }

    static get EVENTS() {
        return EVENTS;
    }
}