import Publisher from "./Publisher.js";

export default class Feed extends Publisher {
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