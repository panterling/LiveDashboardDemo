<template>
    <div>
        <div class="row">
            <div class="col-sm-4">
                <div class="panel panel-default">
                    <div class="panel-heading">Service Monitor</div>
                    <div class="panel-body">
                        <p class="card-text">
                            Status: <h3><span class="badge " :class="stateClasses">{{ serviceMonitor.status }}</span></h3>
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-sm-8">
                <div class="panel panel-default">
                    <div class="panel-heading" style="width: 100%; margin: auto; overflow: auto;">
                        Pending Feeds 
                        <input type="button" value="Request New Feed" class="btn btn-success" style="float: right" @click="catchRequestNewFeed()"/>
                    </div>
                    <div class="panel-body">
                        <ul class="list-group">
                            <li v-for="feedPending in feedList.pending" class="list-group-item list-group-item-warning">
                                {{ feedPending }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-sm-6">
                <div class="panel panel-default">
                    <div class="panel-heading">Available Feeds</div>
                    <div class="panel-body">
                        <ul class="list-group">
                            <li v-for="feed in feedList.available" :key="feed.feedId" class="list-group-item list-group-item-success" style="margin: auto; width: 100%; overflow: auto;">
                                {{ feed.feedId }}
                                <input type="button" value="Add Feed" class="btn btn-primary" style="float: right;" v-show="!feed.isAdded" @click="catchAddFeed(feed.feedId)"/>
                                <input type="button" value="Remove Feed" class="btn btn-danger" style="float: right;" v-show="feed.isAdded" @click="catchRemoveFeed(feed.feedId)"/>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-sm-6">
                <ul class="list-group">
                        
                    </ul>
                <feed-component v-for="feed in feeds.model" 
                    :key="feed.id"
                    :feed="feed"
                    v-on:actionPassThrough="catchActionPassThrough">
                </feed-component>
            </div>
        </div>
    </div>
</template>

<script>
    import ServiceMonitor from "../ServiceMonitor.js"
    import FeedComponent from "./FeedComponent.vue"

    export default {
        components: {
            'feed-component': FeedComponent
        },
        methods: {
            catchAddFeed(id){
                this.$emit("addFeed", {
                    id: id
                })
            },

            catchRemoveFeed(id){
                this.$emit("removeFeed", {
                    id: id
                })
            },
            catchRequestNewFeed() {
                this.$emit("requestNewFeed", {})
            },


            catchActionPassThrough(params) {
                this.$emit("feedAction", params)
            }
            
        },
        computed: {
            stateClasses() {
                let ret = ""
                switch(this.serviceMonitor.status) {
                    case ServiceMonitor.STATES.OK:
                        ret = "badge-success"
                        break;
                    case ServiceMonitor.STATES.DEGRADED:
                        ret = "badge-warning"
                        break;
                    case ServiceMonitor.STATES.UNAVAILABLE:
                        ret = "badge-error"
                        break;
                }
                return ret;
            }
        }
    }
</script>