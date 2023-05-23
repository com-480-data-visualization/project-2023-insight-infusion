
import 'bootstrap-icons/font/bootstrap-icons.css'
import * as d3 from 'd3'

import { ENDPOINT } from './../../constants'
import {capitalizeFirstLetter} from './../../utilities'
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


const countryDefaultColor = "#D6D6CE"
const countryManufactureColor = "#CD8C00"
const countryOriginColor = "#67CF00"
const seaColor = "#9DCAC6"

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
    // .attr('transform', 'translate(-200, 0)')

/* world ocean */
const mapOcean = worldCenter.append("circle")
    .attr("class", "world-outline")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale())
    .attr("fill", d => seaColor)

/* countries */
const mapCountries = worldCenter.append('g');
mapCountries.selectAll("path")
    .data(worldGeo.features)
    .enter()
    .append("path")
    .attr('class', 'map-country')
    .attr('fill', d => countryDefaultColor)
    .attr("d", path)
    .on("click", (e, d) => {
        console.log(d.properties.name)
        drawHighlighting(d.properties.name)
    })
    
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

const createLines = (countryTransportCount, selectedCountry) => {
    const selectedData = countryTransportCount[selectedCountry]

    const consumeCenter = countryCentroid[selectedCountry]
    if (consumeCenter === undefined) return []

    const lines_all = Object.keys(selectedData['manufacturing']).map(manufacture => {
        const manufactureData = selectedData['manufacturing'][manufacture]
        const manufactureCenter = countryCentroid[manufacture]
        if (manufactureCenter === undefined) {
            console.log(manufacture)
            return []
        }

        const lines = []
        const manScore = manufactureData['score']
        const colorFunc = (x) => 'black'
        lines.push(createFlowLine(manufactureCenter, consumeCenter, manScore, colorFunc, 0))
        
        Object.keys(manufactureData.origin).forEach(origin => {
            const originCenter = countryCentroid[origin]
            if (originCenter === undefined) {
                console.log(origin)
                return
            }

            const originScore = manufactureData.origin[origin]
            const score = originScore*(manScore)
            const colorFunc = (x) => 'black'
            lines.push(createFlowLine(originCenter, manufactureCenter, score, colorFunc, 5))
        })
        return lines
    }).flat(1)

    return lines_all
}

const createFlowLine = (fromCenter, toCenter, score, colorFunc, dash) => {
    const interpolation = d3.geoInterpolate(fromCenter, toCenter)

    return {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: d3.range(0, 1, 0.01).map(t => interpolation(t))
        },
        properties: {
            score: score,
            dash: dash,
            color: colorFunc(score),
        }
    }
}

const drawHighlighting = (selectedCountry) => {
    selectedCountry = capitalizeFirstLetter(selectedCountry)
    const selectedData = countryTransportCount[selectedCountry]
    mapCountries.selectAll('.map-line').remove();
    console.log(selectedData)
    if (selectedData != null) {
        mapCountries.selectAll('.map-line')
        .data(createLines(countryTransportCount, selectedCountry).filter(d => d != undefined))
        .enter()
        .append('path')
        .attr('class', 'map-line')
        .attr("stroke", d => d.properties.color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", d => d.properties.dash)
        .attr("opacity", d => d.properties.score*10)
        .merge(svg.selectAll(".map-line"))
        .attr('d', d => path(d))
    }
    
    mapCountries.selectAll('.map-country')
    .transition()
    .duration(200)
    .attr("fill", (d) => {
            if (selectedData == null) {
                if (d.properties.name.toLowerCase() === selectedCountry.toLowerCase()) {
                    return '#aaa'
                } else {
                    return countryDefaultColor
                }
            }
        
            const manufactureCountries = selectedData['manufacturing']
            const name = capitalizeFirstLetter(d.properties.name)

            const manufactureScore = name in manufactureCountries ? Math.sqrt(manufactureCountries[name]['score']) : 0

            let originScore = 0
            Object.keys(manufactureCountries).forEach(manufacture => {
                const manufactureData = manufactureCountries[manufacture]
                if (name in manufactureData['origin']) {
                    originScore += Math.sqrt(manufactureData['origin'][name])*manufactureData['score']
                }    
            })

            if (originScore == 0 && manufactureScore == 0) {
                if (name.toLowerCase() === selectedCountry.toLowerCase()) {
                    return '#aaa'
                } else {
                    return countryDefaultColor
                }
            }

            const interpolateManufacturingColor = d3.interpolate(countryDefaultColor, countryManufactureColor);
            const interpolateOriginColor = d3.interpolate(countryDefaultColor, countryOriginColor);

            const manufacturingColor = interpolateManufacturingColor(manufactureScore);
            const originColor = interpolateOriginColor(originScore);

            return d3.interpolateRgb(manufacturingColor, originColor)(originScore/(originScore+manufactureScore))
        })
        .attr("stroke", (d) => {
            if (d.properties.name.toLowerCase() === selectedCountry.toLowerCase()) {
                return 'black'
            } else {
                return 'rgba(0,0,0,0.2)'
            }
        })

}

drawHighlighting('Switzerland')
/* create dropdown menu for selecting a country */
  

/**
 * 
 *      DOM manipulation
 * 
 */
document.getElementById('map').appendChild(svg.node())