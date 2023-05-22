
import 'bootstrap-icons/font/bootstrap-icons.css'
import * as d3 from 'd3'

import { ENDPOINT } from './../../constants'
import '../../../scss/map.scss'
import '../../../scss/styles.scss'
const assets = ressource => `${ENDPOINT}/${ressource}`

const json = async ressource => await d3.json(assets(ressource))

const geojson = await json('map/world.geojson')
const data = await json('test.json')

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
    .data(features)
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

mapCountries.selectAll('.map-line')
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