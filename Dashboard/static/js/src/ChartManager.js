import ChartFeedProxy from "./ChartFeedProxy.js";
import Publisher from "./Publisher.js";

export default class ChartManager extends Publisher {
    constructor() {
        super();

        /// DATA FEED SETUP ///
        this._feeds = {}

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
    }
    
    _updateGraph() {
        this._setYDomain();

        this._setXDomain();
    
        this._g.select(".yAxis")
            .call(d3.axisLeft(this._y))
    
        this._g.select(".xAxis")
            .call(d3.axisBottom(this._x))
    
    

        for(let feedId in this._feeds) {
            d3.selectAll("." + feedId)
                .attr("d", this._line(this._feeds[feedId].data));

            this._g.select(".alertLine" + feedId)
                .attr("y1", this._y(this._feeds[feedId].alertPosition))
                .attr("y2", this._y(this._feeds[feedId].alertPosition))
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
            alertPosition: 0
        };

        
        this._g.append("path")
            .attr("class", feedId)
            .attr("fill", "none")
            .attr("stroke", this._getNextColour())
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", this._line(feedObj.data));

        this._g.append("line")
            .attr("class", "alertLine" + feedId)
            .attr("x1", this._x(this._x.domain()[0]))
            .attr("y1", this._y(feedObj.alertPosition))
            .attr("x2", this._x(this._x.domain()[1]))
            .attr("y2", this._y(feedObj.alertPosition))
            .style("stroke-width", 2)
            .style("stroke", "red")
            .style("fill", "none")
        
        
        this._feeds[feedId] = feedObj;
    }

    _giveData(id, data) {
        this._feeds[id].data.push({
            value: data.value,
            date: new Date(data.timestamp)
        });
    
        this._updateData(id);
        
        this._updateGraph();
    }

    _killFeed(id) {
        delete this._feeds[id];

        this._g.selectAll("." + id).remove();
        
        this._updateGraph();
    }
}