var mixins = require("es6-mixins")

import Logging from "./Logging";

export default class Publisher {
    _subscribers: Array<any>;
    
    constructor() {
        mixins(Logging, this);

        this._subscribers = [];
    }

    subscribe(subscriber) {
        this._subscribers.push(subscriber);
    }

    broadcastEvent(event, params) {
        this.log("BROADCASTING: " + event.toString());
        for(let subscriber of this._subscribers) {
            subscriber.processEvent(event, params);
        }
    }

    processEvent(event, params) {
        // Abstract
        throw Error("processEvent() should be implemented in Child class.")
    }

    static get EVENTS() :any {
        // Abstract
        throw Error("EVENTS() should be implemented in Child class.")
    }

}