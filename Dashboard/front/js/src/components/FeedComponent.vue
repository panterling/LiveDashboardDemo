<template>
    <div class="panel panel-default">
        <div class="panel-heading" style="width: 100%; margin: auto;">
            {{ feed.id }} <span class="badge" :class="stateClasses" style="float: right;">{{ feed.state }}</span>
        </div>
        <div class="panel-body">
            <div class="row">

                <div class="col-sm">
                    <div class="row">
                        <div class="col-sm-9">
                        Rx: {{ feed.rxCount }}
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-sm-12">
                            <div class="row">
                                <div class="col-sm-3">
                                    <input v-if="feed.state === FeedSocketManager.FEED_STATE.CLOSED" 
                                            type="button" class="btn btn-warning" value="Restart" @click="catchAction(ACTIONS.RESTART)"/>
                                    <input v-if="feed.state !== FeedSocketManager.FEED_STATE.CLOSED" 
                                            type="button" class="btn btn-danger" value="Stop" @click="catchAction(ACTIONS.STOP_FEED)"/>
                                </div>
                                <div class="col-sm-3">
                                    <input type="button" class="btn btn-primary" value="???" />
                                </div>
                                <div class="col-sm-3">
                                    <input type="button" class="btn btn-primary" value="???" />
                                </div>
                                <div class="col-sm-3">
                                    <div v-show="feed.showAlert" class="glyphicon glyphicon-alert" style="color: red;font-size: 25px;"></div>
                                </div>
                            </div>
                            
                            <input type="text" v-model="localAlertPosition" />
                            <input type="button" class="btn btn-primary" value="Update Alert Position" @click="catchAction(ACTIONS.UPDATE_ALERT_POSITION)"/>
                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import FeedSocketManager from "../FeedSocketManager"

const ACTIONS = {
    STOP_FEED: Symbol("STOP_FEED"),
    RESTART: Symbol("RESTART"),
    UPDATE_ALERT_POSITION: Symbol("UPDATE_ALERT_POSITION"),
};

export default {
    props: ["feed"],
    data() {
        return {
            // Pass-Through of data/methods into the Vue namespace
            ACTIONS: ACTIONS,
            FeedSocketManager: FeedSocketManager,

            localAlertPosition: this.feed.alertPosition
        };
    },
    watch: {
        "feed.alertPosition": function(newValue) {
            this.localAlertPosition = newValue;
        }
    },
    methods: {
        catchAction(action) {
            let params = {
                action: action,
                id: this.feed.id
            };

            switch(action) {
                case ACTIONS.STOP_FEED:
                    break;
                case ACTIONS.RESTART:
                    break;
                case ACTIONS.UPDATE_ALERT_POSITION:
                    params["position"] = this.localAlertPosition;
                    break;
                
            }

            this.$emit("actionPassThrough", params)
        },
    },
    computed: {
        stateClasses() {
            let ret = "badge-success"
            switch(this.feed.state) {
                case FeedSocketManager.FEED_STATE.RECEIVING:
                    ret = "badge-success"
                    break;
                case FeedSocketManager.FEED_STATE.IDLE:
                case FeedSocketManager.FEED_STATE.OPEN:
                case FeedSocketManager.FEED_STATE.OPENING:
                case FeedSocketManager.FEED_STATE.REQUESTING_FEED:
                    ret = "badge-warning"
                    break;
                case FeedSocketManager.FEED_STATE.CLOSED:
                case FeedSocketManager.FEED_STATE.REJECTED:
                    ret = "badge-danger"
                    break;
            }
            return ret;
        }
    },

    // NON-VUE Additional Data/Methods
    ACTIONS: ACTIONS,
}
</script>