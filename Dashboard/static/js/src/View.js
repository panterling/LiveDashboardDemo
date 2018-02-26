import FeedSocketManager from "./FeedSocketManager";
import ServiceMonitor from "./ServiceMonitor.js";

import Vue from 'vue'
import Main from "./components/Main.vue"




export default class View {
    constructor() {
        this._data = {}
    }

    injectStateItem(id, stateObj) {
        if(this._data[id] !== undefined) {
            throw `Attempt to assign to id already in use: ${id}`;
        } else {
            this._data[id] = stateObj;
        }
    }
    injectStateItems(items) {
        for(let item in items) {
            this.injectStateItems(item.id, item.stateObj);
        }
    }

    build() {
        Object.assign(Main, {
            el: '#app',
            data: this._data,
        });

        this._vm = new Vue(Main);
    }

    on(id, func) {
        if(this._vm === undefined) {
            throw "Vue instance not built. Call build() before attaching listeners. "
        } else {
            this._vm.$on(id, func);
        }
    }
}