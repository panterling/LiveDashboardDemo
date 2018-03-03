import Publisher from "./Publisher";
import FeedSocketManager from "./FeedSocketManager"

const EVENTS = {
    FEED_STATE_CHANGE: Symbol("FeedSocketProxy::" + "FEED_STATE_CHANGE"),
    NEW_DATA: Symbol("FeedSocketProxy::" + "NEW_DATA"),
};

export default class FeedSocketProxy extends Publisher {
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
                case FeedSocketManager.EVENTS.FEED_STATE_CHANGE:
                    this.broadcastEvent(FeedSocketProxy.EVENTS.FEED_STATE_CHANGE, params)
                    break;
                case FeedSocketManager.EVENTS.NEW_DATA:
                    this.broadcastEvent(FeedSocketProxy.EVENTS.NEW_DATA, params);
                    break;
            }
        }
    }

    static get EVENTS() {
        return EVENTS;
    }
}