import Publisher from "./Publisher"
import FeedSocketProxy from './FeedSocketProxy.js'

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

const EVENTS = {
    FEED_STATE_CHANGE: Symbol("FeedSocketManager::" + "FEED_STATE_CHANGE"),
    NEW_DATA: Symbol("FeedSocketManager::" + "NEW_DATA"),
    RX: Symbol("FeedSocketManager::" + "RX")
};

export default class FeedSocketManager extends Publisher {

    _feeds: Array<any>;

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
        
        let socketProxy = new FeedSocketProxy(this, id);
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

        this.broadcastEvent(FeedSocketManager.EVENTS.RX, { feedId: id, value: JSON.parse(e.data).value })

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
                this._feeds[id].proxy.broadcastEvent(FeedSocketProxy.EVENTS.NEW_DATA, {data: JSON.parse(e.data)});
                

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
        this.broadcastEvent(FeedSocketManager.EVENTS.FEED_STATE_CHANGE, {
            feedId: id, 
            state: newState
        })

        this._feeds[id].state = newState;
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

    static get EVENTS() {
        return EVENTS;
    }
}