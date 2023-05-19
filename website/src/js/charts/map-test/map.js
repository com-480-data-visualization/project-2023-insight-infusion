import { auto } from '@popperjs/core';
import * as d3 from 'd3'

import '../../scss/map.scss'

const ENDPOINT = 'http://localhost:8080';

const assets = ressource => `${ENDPOINT}/${ressource}`

const json = async ressource => await d3.json(assets(ressource))

const geojson = await json('map/world.geojson')
const data = await json('test.json')

console.log(d3.schemeOrRd[5][0])
console.log(d3.schemeOrRd[5][1])
console.log(d3.schemeOrRd[5][2])
console.log(d3.schemeOrRd[5][3])
console.log(d3.schemeOrRd[5][4])



// const data = {
//     'Spain': {value: 1000, origins: ['China', 'Brazil', 'Egypt']},
//     'France': {value: 800, origins: ['Angola']}
// }

// const getDataFrom = (country) => {
//     if (country in data) return data[country]
//     else return {}
// }

// const features = geojson.features.map(feature => ({
//     id: feature.id,
//     type: feature.type,
//     properties: {...feature.properties, ...getDataFrom(feature.properties.name)},
//     geometry: feature.geometry 
// }))

const features = geojson.features;

const domain = d3.extent(d3.map(data, d => d.value))
const scale = d3.scaleSqrt().domain(domain).range([3, 20])
const opacity = d3.scaleSqrt().domain(domain).range([0.2, 1])
const color = d3.scaleSequential().domain([-domain[1], domain[1]]).interpolator(d3.interpolateOrRd)

const lines = data;
// const lines = [
//     {from: 'Spain', to: 'China'},
//     {from: 'Spain', to: 'Brazil'},
//     {from: 'Spain', to: 'Australia'},
//     {from: 'Spain', to: 'Canada'},
// ]

// const domain = d3.extent(d3.map(Object.values(data), d => d.value))
// const color = d3.scaleSequential(domain, d3.interpolateOrRd);

const getFeature = name => features.filter(d => d.properties.name === name)[0]

const getCentroid = name => d3.geoCentroid(getFeature(name))

const width = document.getElementById('map').parentElement.clientWidth
const height = width
const rotationSpeed = 0.005

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    // .attr('preserveAspectRatio', 'xMidYMid')

const map = svg.append('g');

const projection = d3.geoOrthographic()
    .scale(width / (Math.PI / 1.4))
    .translate([width / 2, height / 2])
    .precision(0.1);

const path = d3.geoPath()
    .projection(projection)

const graticule = d3.geoGraticule()
    .extent([[-180, -90], [180 - .1, 90 - .1]])

const handleUpdate = () => {
    map.selectAll(".map-country").attr("d", path);
    map.selectAll('.map-line').attr("d", d => path(d))
    backLine.datum(graticule)
    .attr("class", "back-line")
    .attr("d", path);
    worldOutline
    .attr("class", "world-outline")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale());
}

/**
 * 
 *      Zoom feature
 * 
 */
const handleZoom = (event) => {
    const factor = event.transform.k
    projection.scale(factor * width / (Math.PI / 1.4));
    handleUpdate();
}

const zoomBehavior = d3.zoom()
    .scaleExtent([1, 10])
    .on("zoom", handleZoom)

svg.call(zoomBehavior)

/**
 * 
 *      Auto rotate feature
 * 
 */
const timerCallback = (elapsed) => {
    projection.rotate([elapsed * rotationSpeed, 0, 0])
    handleUpdate()
}

const autoRotateTimer = d3.timer(timerCallback);

/**
 * 
 *      Dragging feature
 * 
 */
const saveAndGetRotation = (() => {
    let currentRotation = projection.rotate()
    return (save=false) => {
        const previousRotation = currentRotation
        if(save) currentRotation = projection.rotate()
        return previousRotation
    }
})()

const handleDrag = (event) => {
    const deltaX = event.x - event.subject.x
    const deltaY = event.y - event.subject.y
    const startRotation = saveAndGetRotation();
    const rotation = [
        startRotation[0] + deltaX / 4,
        startRotation[1] - deltaY / 4,
        startRotation[2]
    ]
    projection.rotate(rotation);
    handleUpdate();
}

const handleDragStart = () => {
    autoRotateTimer.stop()
    saveAndGetRotation(true)
}

const handleDragEnd = () => {
    // autoRotateTimer.restart(timerCallback)
}

const dragBehavior = d3.drag()
    .on('start',handleDragStart)
    .on("drag", handleDrag)
    .on('end', handleDragEnd)

map.call(dragBehavior)

/**
 * 
 *      Adding map elements
 * 
 */

const countries = map.selectAll("path")
    .data(features)
    .enter()
    .append("path")
    .attr('class', 'map-country')
    .attr('fill', d => d3.schemeOrRd[5][1])
    .attr("d", path)

const worldOutline = svg.append("circle")
    .attr("class", "world-outline")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale());

const backLine = svg.append("path")
    .datum(graticule)
    .attr("class", "back-line")
    .attr("d", path);


/**
 * 
 *      Flow lines between locations
 * 
 */

const getLines = (lines) => {
    return lines.map(getFlowLine)
}

const getFlowLine = (line) => {
    const from = line.from
    const to = line.to
    const value = line.value
    const fromCentroid = getCentroid(from)
    const toCentroid = getCentroid(to)
    const interpolation = d3.geoInterpolate(
        [fromCentroid[0], fromCentroid[1]],
        [toCentroid[0], toCentroid[1]]
    )
    return {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: d3.range(0, 1, 0.01).map(t => interpolation(t))
        },
        properties: {
            color: color(value),
            width: scale(value),
            opacity: opacity(value)
        }
    }
}

map.selectAll('.map-line')
    .data(getLines(lines))
    .enter()
        .append('path')
        .attr('class', 'map-line')
        // .style("fill", "none")
        .attr("stroke", d => d.properties.color)
        .attr("stroke-opacity", d => d.properties.opacity)
        .attr("stroke-width", d => `${Math.round(scale(d.properties.width))}px`)
    .merge(svg.selectAll(".map-line"))
        .attr('d', d => path(d))

  
/**
 * 
 *      DOM manipulation
 * 
 */
document.getElementById('map').appendChild(svg.node())