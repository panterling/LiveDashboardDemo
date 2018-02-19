import Publisher from "./Publisher.js";

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