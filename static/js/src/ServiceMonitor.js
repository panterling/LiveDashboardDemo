import Publisher from "./Publisher.js";

const SERVICE_STATUS_TIMEOUT = 2000; //milliseconds
const SERVICE_CHECK_INTERVAL = 3000; //milliseconds

const STATES = {
    OK: Symbol("OK"),
    DEGRADED: Symbol("DEGRADED"),
    UNAVAILABLE: Symbol("UNAVAILABLE"),
}

export default class ServiceMonitor extends Publisher {
    constructor() {
        super();

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
        $.ajax({
            url: "/status",
            method: "POST",
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
                this.broadcastEvent("SERVICE_UPDATE", {
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
        console.log(`${this.constructor.name}:: CHANGE STATE: ${newState.toString()}`)

        this._state = newState;
    }
}