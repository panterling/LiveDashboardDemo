import ChartFeedProxy from "./ChartFeedProxy.js";
import Publisher from "./Publisher";


const REFRESH_FPS = 25;
const AUTO_UPDATE_INTERVAL = 1000 / REFRESH_FPS;
const EVENTS = {
    ALTER_POSITION_CHANGE: Symbol("ChartManager::" + "ALTER_POSITION_CHANGE")
};

export default class ChartManager extends Publisher {
    constructor() {
        super();

        /// DATA FEED SETUP ///
        this._feeds = {}


        /// BEHAVIOUR SETUP ///
        this._inAlertDraggingMode = undefined;

        /// CHART SETUP ////
        let parseTime = d3.timeParse("%d-%b-%y");
        
        this._svg = d3.select("svg");
        this._margin = {top: 20, right: 20, bottom: 30, left: 50};
        this._width = this._svg.attr("width") - this._margin.left - this._margin.right;
        this._height = this._svg.attr("height") - this._margin.top - this._margin.bottom;

        this._g = this._svg.append("g").attr("transform", "translate(" + this._margin.left + "," + this._margin.top + ")");


        this._x = d3.scaleTime()
            .rangeRound([0, this._width]);

        this._y = d3.scaleLinear()
            .rangeRound([this._height, 0]);

        this._line = d3.line()
            .x((d) => { return this._x(d.date); })
            .y((d) => { return this._y(d.value); });


        this._setYDomain();
        this._setXDomain();


        this._g.append("g")
                .attr("class", "xAxis")
            .attr("transform", "translate(0," + this._height + ")")
            .call(d3.axisBottom(this._x))
            .select(".domain")
            .remove();

        this._g.append("g")
            .attr("class", "yAxis")
            .call(d3.axisLeft(this._y))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Value");


        function* colourGenerator() {
            let i = 1;
            while (true) { 
                yield d3.schemeCategory20[i++ % 20]; 
            }
        }
        this._colourGenerator = colourGenerator();


        // Update graph at set interval
        this._autoUpdateInterval = setInterval(this._updateGraph.bind(this), AUTO_UPDATE_INTERVAL);
    }

    getChartFeedProxy(feedId) {
        return new ChartFeedProxy(this, feedId);
    }

    _setYDomain() {

        let dataExtents = [-1, 1];

        for(let feedId in this._feeds) {
            dataExtents[0] = d3.min([dataExtents[0], this._feeds[feedId].dataExtents[0]])
            dataExtents[1] = d3.max([dataExtents[1], this._feeds[feedId].dataExtents[1]])
        }
    
        this._y.domain([d3.min([-1, dataExtents[0]]), d3.max([1, dataExtents[1]])]);
    }
    _setXDomain() {
    
        let now = new Date();
    
        let yDomainLowerLimit = new Date(now);
        yDomainLowerLimit.setSeconds(yDomainLowerLimit.getSeconds() - WINDOW_SIZE);
    
        let yDomainUpperLimit = new Date(now);
        yDomainUpperLimit.setSeconds(yDomainUpperLimit.getSeconds() + 5);
    
    
        this._x.domain([yDomainLowerLimit, yDomainUpperLimit]);
    }

    _updateData(id) {
        let now = (new Date()).getTime();
    
        this._feeds[id].data = this._feeds[id].data.filter((elem) => {
            return elem.date.getTime() > now - (WINDOW_SIZE * 1000)
        });

        this._feeds[id].dataExtents = d3.extent(this._feeds[id].data, (elem) => { return elem.value; })

        this._resolveAlertLineHandleCollisions();
    }
    
    _updateGraph() {

        for(let feedId in this._feeds) {
            this._updateData(feedId);
        }

        this._setYDomain();

        this._setXDomain();
    
        this._g.select(".yAxis")
            .call(d3.axisLeft(this._y))
    
        this._g.select(".xAxis")
            .call(d3.axisBottom(this._x))
    
    

        for(let feedId in this._feeds) {
            d3.selectAll("." + feedId)
                .attr("d", this._line(this._feeds[feedId].data));
        }

        this._updateAlertLines();
    }

    _updateAlertLines() {
        for(let feedId in this._feeds) {
            this._g.select(".alertLine" + feedId)
                .attr("y1", this._y(this._feeds[feedId].alertPosition))
                .attr("y2", this._y(this._feeds[feedId].alertPosition))

            this._g.select(".alertLineName" + feedId)
                .attr("y", this._y(this._feeds[feedId].alertPosition))

            this._g.select(".alertLineHandle" + feedId)
                .attr("cy", this._y(this._feeds[feedId].alertPosition))


        }
    }

    _setAlertLine(feedId, position) {
        this._g.select(".alertLine" + feedId)
            .attr("y1", this._y(position))
            .attr("y2", this._y(position))
    }

    _getNextColour() { 
        return this._colourGenerator.next().value;
    }

    _setAlertLine(feedId, position) {
        this._feeds[feedId].alertPosition = position;
        
        this._g.select(".alertLine" + feedId)
            .attr("y1", this._y(position))
            .attr("y2", this._y(position))
    }

    _addFeed(feedId) {
        let feedObj = {
            data: [],
            dataExtents: [-1, 1],
            alertPosition: 0,
            _currentDataKey: "moisture" // CP: Should be dynamic & user-specified
        };

        let feedColour = this._getNextColour();

        
        this._g.append("path")
            .attr("class", feedId)
            .attr("fill", "none")
            .attr("stroke", feedColour)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", this._line(feedObj.data));

            let alertLineGroup = this._g.append("g")
                .attr("class", "")

            let radius = 10;
            let radiusSquared = (2*radius) * (2*radius);
            alertLineGroup.append("circle")
                .attr("class", "alertLineHandle" + feedId)
                .attr("cx", this._x(this._x.domain()[1]) + radius)
                .attr("cy", this._y(feedObj.alertPosition))
                .attr("r", radius)
                .style("fill", feedColour)
                .call(d3.drag()
                    .on("start", () => {
                        d3.select(".alertLineHandle" + feedId).raise()
                        this._inAlertDraggingMode = feedId;
                    })
                    .on("drag", () => {
                        
                        //let newXY = this._resolveAlertLineHandleCollisions();
                        let thisHandle = d3.select(".alertLineHandle" + feedId)
                        let newXY = [(this._x(this._x.domain()[1]) + radius), d3.event.y]

                        for(let otherFeedId in this._feeds) {
                            if(otherFeedId !== feedId) {
                                let otherHandle = d3.select(".alertLineHandle" + otherFeedId)
                                let otherXY = [Number(otherHandle.attr("cx")), Number(otherHandle.attr("cy"))]
                                let dSquared = ((newXY[0] - otherXY[0]) * (newXY[0] - otherXY[0])) + ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]));

                                if(dSquared < radiusSquared && Math.abs(dSquared - radiusSquared) > 0.00001) {
                                    this.log("HANDLE COLLISION - translate in x by: " + (radiusSquared - dSquared));
                                    otherHandle.attr("cx", (this._x(this._x.domain()[1]) + radius) - Math.sqrt(radiusSquared - ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]))));
                                } else {
                                    otherHandle.attr("cx", (this._x(this._x.domain()[1]) + radius));
                                }
                            }
                        }

                        thisHandle.attr("cy", newXY[1])
                        
                        let newPosition = this._y.invert(d3.event.y);
                        newPosition = d3.max([this._y.domain()[0], newPosition])
                        newPosition = d3.min([this._y.domain()[1], newPosition])
                        newPosition = Number(newPosition.toFixed(2))

                        this._resolveAlertLineHandleCollisions();

                        feedObj.alertPosition = newPosition;

                        this.broadcastEvent(ChartManager.EVENTS.ALTER_POSITION_CHANGE, {
                            feedId: feedId,
                            newPosition: newPosition
                        });

                        this._updateAlertLines();
                    })
                    .on("end", () => {
                        this._resolveAlertLineHandleCollisions();
                        this._inAlertDraggingMode = undefined;
                    }));

            alertLineGroup.append("line")
                .attr("class", "alertLine" + feedId)
                .attr("x1", this._x(this._x.domain()[0]))
                .attr("y1", this._y(feedObj.alertPosition))
                .attr("x2", this._x(this._x.domain()[1]))
                .attr("y2", this._y(feedObj.alertPosition))
                .style("stroke-width", 2)
                .style("stroke", feedColour)
                .style("fill", "none")

            alertLineGroup.append("text")
                .attr("class", "alertLineName" + feedId)
                .attr("x", 2)
                .attr("y", this._y(feedObj.alertPosition))
                .text(feedId)

        
        
        this._feeds[feedId] = feedObj;
    }

    // Only implemented for the case of TWO handles. Needs more thought for N > 2
    _resolveAlertLineHandleCollisions() {
        return;
        if(Object.keys(this._feeds).length < 2 ) {
            return;
        }

        let radiusSquared = 20*20;
        let radius = 10;
        

        let feedId = undefined;
        if(this._inAlertDraggingMode !== undefined) {
            feedId = this._inAlertDraggingMode;
        } else {
            let feedKeys = Object.keys(this._feeds);

            let idx = d3.scan(Object.keys(this._feeds).map((elem) => {
                return {
                    feedId: elem, 
                    cy: d3.select(".alertLineHandle" + elem).attr("cx")
                }
            }), (a, b) => { return b.cy - a.cy});

            feedId = feedKeys[idx];
        }

        let thisHandle = d3.select(".alertLineHandle" + feedId)
        let newXY = [Number(thisHandle.attr("cx")), Number(thisHandle.attr("cy"))]

        for(let otherFeedId in this._feeds) {
            if(otherFeedId !== feedId) {
                let otherHandle = d3.select(".alertLineHandle" + otherFeedId)
                let otherXY = [Number(otherHandle.attr("cx")), Number(otherHandle.attr("cy"))]
                let dSquared = ((newXY[0] - otherXY[0]) * (newXY[0] - otherXY[0])) + ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]));

                if(dSquared < radiusSquared && Math.abs(dSquared - radiusSquared) > 0.00001) {
                    this.log("HANDLE COLLISION - translate in x by: " + (radiusSquared - dSquared));
                
                    otherHandle.attr("cx", this._x(this._x.domain()[1]) + radius - Math.sqrt(radiusSquared - ((newXY[1] - otherXY[1]) * (newXY[1] - otherXY[1]))))
                } else if (otherXY[0] !== this._x(this._x.domain()[1]) + radius) {
                    otherHandle.attr("cx", this._x(this._x.domain()[1]) + radius)
                }
            }
        }

    }

    _giveData(id, data) {
        this._feeds[id].data.push({
            value: data[this._feeds[id]._currentDataKey],
            date: new Date(data.timestamp)
        });
    
    }

    _killFeed(feedId) {
        delete this._feeds[feedId];

        // Remove data line
        this._g.selectAll("." + feedId).remove();

        // Remove alert line
        d3.select(".alertLine" + feedId).remove();
        d3.select(".alertLineName" + feedId).remove();
        d3.select(".alertLineHandle" + feedId).remove();
        
        this._updateGraph();
    }

    static get EVENTS() {
        return EVENTS;
    }
}