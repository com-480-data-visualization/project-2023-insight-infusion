
import 'bootstrap-icons/font/bootstrap-icons.css'
import * as d3 from 'd3'

import { ENDPOINT } from './../../constants'
import '../../../scss/map.scss'
import '../../../scss/styles.scss'
const assets = ressource => `${ENDPOINT}/${ressource}`

const json = async ressource => await d3.json(assets(ressource))

const worldGeo = await json('map/world.geojson')
const countryCentroid = await json('map/country_centroid.json')
const countryTransportCount = await json('map/country_count.json')

const width = 800
// const width = document.getElementById('map').parentElement.clientWidth
const height = width

const baseWorldScale = 1000 / (Math.PI)

const svg = d3.create("svg")
    .attr("width", '100vw')
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])

const projection = d3.geoOrthographic()
    .scale(baseWorldScale)
    .translate([width / 2, height / 2])
    .precision(1);

const path = d3.geoPath()
    .projection(projection)

/**
 * 
 *      Adding map elements
 * 
 */

const worldCenter = svg.append('g')
    .attr('transform', 'translate(-200, 0)');

/* world ocean */
const mapOcean = worldCenter.append("circle")
    .attr("class", "world-outline")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale());

/* countries */
const mapCountries = worldCenter.append('g');
mapCountries.selectAll("path")
    .data(worldGeo.features)
    .enter()
    .append("path")
    .attr('class', 'map-country')
    .attr('fill', d => d3.schemeOrRd[5][1])
    .attr("d", path)
    
const graticule = d3.geoGraticule()
    .extent([[-180, -90], [180 - .1, 90 - .1]])

/* flow lines */
const backLine = worldCenter.append("path")
    .datum(graticule)
    .attr("class", "back-line")
    .attr("d", path);

const handleUpdate = () => {
    mapCountries.selectAll(".map-country").attr("d", path)
    mapCountries.selectAll('.map-line').attr("d", d => path(d))
    
    backLine.datum(graticule)
        .attr("class", "back-line")
        .attr("d", path);
}

/**
 * 
 *      Zoom feature
 * 
*/
const handleZoom = (event) => {
    const factor = event.transform.k
    projection.scale(factor * baseWorldScale);
    mapOcean.attr("r", factor * baseWorldScale);
    handleUpdate();
}

const zoomBehavior = d3.zoom()
    .scaleExtent([1, 10])
    .on("zoom", handleZoom)

worldCenter.call(zoomBehavior)

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
    saveAndGetRotation(true)
}

const dragBehavior = d3.drag()
    .on('start',handleDragStart)
    .on("drag", handleDrag)

mapOcean.call(dragBehavior)
mapCountries.call(dragBehavior)

/* dropdown menu for selecting country */
let dropdownSelected = 'Canada'
var dropdownMenu = d3.select(".country-select");


dropdownMenu.selectAll("option")
.data(Object.keys(countryTransportCount))
.enter()
.append("option")
.text(d => d);

dropdownMenu.property("value", dropdownSelected)

dropdownMenu.on("change", function(d) {
    dropdownSelected = d3.select(this).property("value");
    drawLines()
});

/**
 * 
 *      Flow lines between locations
 * 
 */

const createLines = (countryTransportCount) => {
    const selectedData = countryTransportCount[dropdownSelected]

    const consumeCenter = countryCentroid[dropdownSelected]
    if (consumeCenter === undefined) return {}

    const lines_all = Object.keys(selectedData['manufacturing']).map(manufacture => {
        const manufactureData = selectedData['manufacturing'][manufacture]
        const manufactureCenter = countryCentroid[manufacture]
        if (manufactureCenter === undefined) return []

        const lines = []
        const manScore = manufactureData['score']
        const colorFunc = (x) => 'purple'
        lines.push(createFlowLine(manufactureCenter, consumeCenter, manScore, colorFunc))
        
        Object.keys(manufactureData.origin).forEach(origin => {
            const originCenter = countryCentroid[origin]
            if (originCenter === undefined) return

            const originScore = manufactureData.origin[origin]
            const score = originScore*(manScore)
            const colorFunc = (x) => 'Orange'
            lines.push(createFlowLine(originCenter, manufactureCenter, score, colorFunc))
        })
        return lines
    }).flat(1)

    return lines_all
}

const createFlowLine = (fromCenter, toCenter, score, colorFunc) => {
    const interpolation = d3.geoInterpolate(fromCenter, toCenter)

    return {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: d3.range(0, 1, 0.01).map(t => interpolation(t))
        },
        properties: {
            score: score,
            color: colorFunc(score),
        }
    }
}

const drawLines = () => {

    mapCountries.selectAll('.map-line').remove();
    mapCountries.selectAll('.map-line')
        .data(createLines(countryTransportCount).filter(d => d != undefined))
        .enter()
            .append('path')
            .attr('class', 'map-line')
            .attr("stroke", d => d.properties.color)
            .attr("stroke-width", 2)
            .attr("opacity", d => d.properties.score*10)
        .merge(svg.selectAll(".map-line"))
            .attr('d', d => path(d))
}

drawLines()
/* create dropdown menu for selecting a country */
  

/**
 * 
 *      DOM manipulation
 * 
 */
document.getElementById('map').appendChild(svg.node())