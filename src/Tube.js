import React, { useEffect, useRef } from "react";
import * as d3 from 'd3';
import './LineChart.css';
import * as tubemaps from 'tubemaps';

import stations_csv from './stations.csv';
import routes_csv from './routes.csv';
import connections_csv from './lines2.csv';

const TubeChart = () => {

    return (

        d3.csv(stations_csv, function (stations) {
            d3.csv(connections_csv, function (connections) {
                d3.csv(routes_csv, function (routes) {

                    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
                        w = Math.max(760, window.innerWidth) - margin.left - margin.right,
                        h = Math.max(500, window.innerHeight) - margin.top - margin.bottom,
                        stationsById = {};

                    /*
                    Organising data
                    */

                    // Organising stations
                    stations.forEach(function (s) {
                        stationsById[s.id] = s;
                        s.conns = [];
                        s.display_name = (s.display_name == 'NULL') ? null : s.display_name;
                        s.rail = parseInt(s.rail, 10);
                        s.totalLines = parseInt(s.total_lines, 10);
                        s.latitude = parseFloat(s.latitude);
                        s.longitude = parseFloat(s.longitude);
                    });

                    // Linking lines
                    connections.forEach(function (c) {
                        c.station1 = stationsById[c.station1];
                        c.station2 = stationsById[c.station2];
                        c.station1.conns.push(c);
                        c.station2.conns.push(c);
                        c.time = parseInt(c.time, 10);
                    });

                    // Organizing lines
                    var routesById = {};
                    routes.forEach(function (r) {
                        routesById[r.line] = r;
                    });

                    /*
                    Setting up D3
                    */

                    // Find min and max long and lat  
                    var minLat = d3.min(stations, function (d) { return d.latitude });
                    var minLon = d3.min(stations, function (d) { return d.longitude });
                    var maxLat = d3.max(stations, function (d) { return d.latitude });
                    var maxLon = d3.max(stations, function (d) { return d.longitude });

                    // Set up the scales
                    var x = d3.scaleLinear()
                        .domain([minLon, maxLon])
                        .range([0, w]);

                    var y = d3.scaleLinear()
                        .domain([minLat, maxLat])
                        .range([h, 0]);

                    // Set up the axis
                    var xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom")
                        .tickSize(-h);

                    var yAxis = d3.svg.axis()
                        .scale(y)
                        .orient("left")
                        .ticks(5)
                        .tickSize(-w);

                    // Set up what will happen when zooming
                    var zoom = zoom()
                        .x(x)
                        .y(y)
                        .scaleExtent([1, 10])
                        .on("zoom", zoomed);

                    /*
                    Drawing from now on
                    */

                    // Setting up the canvas
                    var vis = d3.select("#map").append("svg")
                        .attr("width", w + margin.left + margin.right)
                        .attr("height", h + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

                    // Make sure it is zoomable
                    d3.select("#map svg")
                        .call(zoom);

                    // Drawing lines between stations
                    var route = vis.selectAll("line.route")
                        .data(connections)
                        .enter().append("svg:line")
                        .attr("class", "route")
                        .attr("stroke", function (d) { return '#' + routesById[d.line].colour; })
                        .attr("stroke-linecap", 'round')
                        .attr("x1", function (d) { return x(d.station1.longitude); })
                        .attr("y1", function (d) { return y(d.station1.latitude); })
                        .attr("x2", function (d) { return x(d.station2.longitude); })
                        .attr("y2", function (d) { return y(d.station2.latitude); })

                    // Striped stations (see official map)
                    var stripe = vis.selectAll("line.stripe")
                        .data(connections.filter(function (d) { return routesById[d.line].stripe != "NULL"; }))
                        .enter().append("svg:line")
                        .attr("class", "stripe")
                        .attr("stroke", function (d) { return '#' + routesById[d.line].stripe; })
                        .attr("stroke-linecap", 'round')
                        .attr("x1", function (d) { return x(d.station1.longitude); })
                        .attr("y1", function (d) { return y(d.station1.latitude); })
                        .attr("x2", function (d) { return x(d.station2.longitude); })
                        .attr("y2", function (d) { return y(d.station2.latitude); })

                    // Points with more stations
                    var connect = vis.selectAll("circle.connect")
                        .data(stations.filter(function (d) { return d.totalLines - d.rail > 1; }))
                        .enter().append("svg:circle")
                        .attr("class", "connect")
                        .attr("cx", function (d) { return x(d.longitude); })
                        .attr("cy", function (d) { return y(d.latitude); })
                        .style("fill", 'white')
                        .style("stroke", 'black')

                    // Drawing all the stations
                    var station = vis.selectAll("circle.station")
                        .data(stations)
                        .enter().append("svg:circle")
                        .attr("class", "station")
                        .attr("id", function (d) { return 'station' + d.id })
                        .attr("cx", function (d) { return x(d.longitude); })
                        .attr("cy", function (d) { return y(d.latitude); })
                        .attr("data-cx", function (d) { return d.longitude; })
                        .attr("data-cy", function (d) { return d.latitude; })
                        .attr("title", function (d) { return d.name })
                        .style("stroke", 'gray')
                        .style("fill", '#ffffff')
                        .style("opacity", 0.3)
                        .on('mouseover', function (d, i) {
                            d3.selectAll('#station' + d.id)
                                .transition()
                                .duration(25)
                                .attr("r", 3 / zoom.scale())
                                .style("stroke", 'black')
                                .style("stroke-width", 0.5 / zoom.scale())
                                .style('opacity', 1);
                        })
                        .on('mouseout', function (d, i) {
                            d3.selectAll('#station' + d.id)
                                .transition()
                                .attr("r", 2.5 / zoom.scale())
                                .duration(25)
                                .style("stroke-width", 0.5 / zoom.scale())
                                .style("stroke", 'gray')
                                .style('opacity', 0.3);
                        })

                    // .on('click', selectStation);

                    // Adding axis
                    vis.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + h + ")")
                        .call(xAxis);

                    vis.append("g")
                        .attr("class", "y axis")
                        .call(yAxis);

                    zoomed()

                    function zoomed() {
                        // Reset axis
                        vis.select(".x.axis").call(xAxis);
                        vis.select(".y.axis").call(yAxis);

                        // Rescale circles
                        vis.selectAll("circle")
                            .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
                            .style("stroke-width", 0.5 / zoom.scale())
                            .attr("r", 2.5 / zoom.scale());

                        // Rescale lines
                        vis.selectAll("line.route, line.stripe")
                            .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")

                        vis.selectAll("line.route")
                            .attr("stroke-width", 5 / (zoom.scale()))

                        vis.selectAll("line.stripe")
                            .attr("stroke-width", 4 / (zoom.scale()))

                    }


                }); // load routes      
            }); // load lines
        })); // load stations

}

export default TubeChart;