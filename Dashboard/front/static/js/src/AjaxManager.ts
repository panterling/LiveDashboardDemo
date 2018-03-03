import Publisher from "./Publisher"
import * as $ from 'jquery';

export default class AjaxManager extends Publisher {

    _requests: Array <any>;
    static _instance: any;

    constructor() {
        if(AjaxManager._instance !== undefined) {
            throw Error("Attempt to re-instanciate AjaxManager. It is a singleton - please use getInstance().")
        }

        super();
        this._requests = [];
    }

    static getInstance(): AjaxManager {
        if(AjaxManager._instance === undefined) {
            AjaxManager._instance = new AjaxManager();
        }

        return AjaxManager._instance;
    }

    request(id, options) {
        if(id === undefined) {
            throw Error("AJAX Request requires an ID")
        } else if (options === undefined) {
            throw Error("AJAX Request requires options")            
        } else if (options.url === undefined) {
            throw Error("AJAX Request requires a URL")            
        } else if (options.success === undefined) {
            throw Error("AJAX Request requires a success callback")            
        }


        if(this._requests[id] !== undefined) {
            this.log(`Aborting in-progress AJAX request <${id}>`)
            this._requests[id].abort();
        }

        if(!options.method) {
            options.method = "POST";
        }

        if(!options.beforeSend) {
            options.beforeSend = () => {};
        }

        if(!options.complete) {
            options.complete = () => {};
        }

        if(!options.error) {
            options.error = () => {};
        }

        if(options.data) {
            options.data = JSON.stringify(options.data)
        }

        
        options.dataType = "json";
        options.contentType = "application/json";

        this._requests[id] = $.ajax(options)
    }


}