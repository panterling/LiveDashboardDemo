export default class Publisher {
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