import Publisher from "./Publisher.js";

export default class ChartFeedProxy extends Publisher{
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