import Publisher from "./Publisher";
import AjaxManager from "./AjaxManager";

const SERVICE_STATUS_TIMEOUT = 2000; //milliseconds
const SERVICE_CHECK_INTERVAL = 3000; //milliseconds

const STATES = {
    OK: Symbol("OK"),
    DEGRADED: Symbol("DEGRADED"),
    UNAVAILABLE: Symbol("UNAVAILABLE"),
}

const EVENTS = {
    SERVICE_UPDATE: Symbol("ServiceMonitor::SERVICE_UPDATE")
};

export default class ServiceMonitor extends Publisher {
    constructor() {
        super();

        this._ajaxManager = AjaxManager.getInstance();

        this._state = ServiceMonitor.STATES.OK;

    }

    static get STATES() {
        return STATES;
    }

    startMonitoring() {
        this._statusCheckInterval = setInterval(() => {
            this._checkStatus();
        }, SERVICE_CHECK_INTERVAL)
    }

    stopMonitoring() {
        clearInterval(this._statusCheckInterval)
    }

    _checkStatus() {
        this._ajaxManager.request("addFeed", {
            url: "http://localhost:3000/status",
            timeout: SERVICE_STATUS_TIMEOUT,
            success: (response) => {
                this._serviceOK();
            },
            error: (jqXHR, textStatus, errorThrown ) => {
                switch(textStatus) {
                    case "timeout":
                        this._changeState(ServiceMonitor.STATES.DEGRADED);
                        break;

                    default:
                        this._changeState(ServiceMonitor.STATES.UNAVAILABLE);
                        break;
                }
            },
            complete: () => {
                this.broadcastEvent(ServiceMonitor.EVENTS.SERVICE_UPDATE, {
                    state: this._state
                })
            }
        })
    }

    _serviceOK() {
        if(this._state === ServiceMonitor.STATES.OK) {
            // TODO
        } else {
            this._changeState(ServiceMonitor.STATES.OK)
        }
    }

    _changeState(newState) {
        this.log(`CHANGE STATE: ${newState.toString()}`)

        this._state = newState;
    }

    static get EVENTS() {
        return EVENTS;
    }
}