import * as d3 from "d3"
import { throttle, update } from "lodash" // Import throttle from lodash

import { ENDPOINT } from "./../../constants"
import { capitalizeFirstLetter } from "./../../utilities"
import { viewCountryInfo } from "./map_info"

/* page styles */
import "../../../scss/map.scss"
import "../../../scss/styles.scss"

const jsonLoad = async (ressource) => await d3.json(`${ENDPOINT}/${ressource}`)

/* map data */
const worldGeo = await jsonLoad("map/world.geojson")
const countryCenter = await jsonLoad("map/country_center.json")
const countryTransportCount = await jsonLoad("map/country_count.json")

const initialSelectedCountry = "Switzerland"
const fps60ms = 1000 / 60
const baseWorldScale = Math.min(window.innerHeight, window.innerWidth) / 3

const countryDefaultColor = "#D6D6CE"
const countryManufactureColor = "#CD8C00"
const countryOriginColor = "#67CF00"
const seaColor = "#1D4E63"

const svg = d3.create("svg").style("width", "100%").style("height", "100%")
document.getElementById("map").appendChild(svg.node())

const { width, height } = svg.node().getBoundingClientRect()

const projection = d3
  .geoOrthographic()
  .scale(baseWorldScale)
  .translate([width / 2, height / 2])
  .rotate(
    (() => {
      const center = countryCenter[initialSelectedCountry]
      return [-center[0], -center[1]]
    })()
  )
  .precision(1)

const path = d3.geoPath().projection(projection)

/* Create globe */
const globe = svg.append("g")
    // .attr("transform", "translate(-100,0)")

/* world ocean */
const globeOcean = globe
  .append("circle")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("class", "world-outline")
  .attr("r", projection.scale())
  .attr("fill", (d) => seaColor)

window.addEventListener("resize", () => {
  const { width: newWidth, height: newHeight } = svg
    .node()
    .getBoundingClientRect()
  projection.translate([newWidth / 2, newHeight / 2])
  globeOcean.attr("cx", newWidth / 2).attr("cy", newHeight / 2)
  redrawGlobe()
})

/* countries */
const globeCountries = globe.append("g")
globeCountries
  .selectAll("path")
  .data(worldGeo.features)
  .enter()
  .append("path")
  .attr("class", "map-country")
  .attr("fill", (d) => countryDefaultColor)
  .attr("d", path)
  .on("mouseover", (e, d) => viewCountryInfo(d.properties.name))
  .on("click", (e, d) => drawHighlighting(d.properties.name))

// countries empty fill pattern
const hashPatternLineSpacing = 6
const pattern = svg
  .append("defs")
  .append("pattern")
  .attr("id", "diagonalHatch")
  .attr("patternUnits", "userSpaceOnUse")
  .attr("width", hashPatternLineSpacing)
  .attr("height", hashPatternLineSpacing)

pattern
  .append("rect")
  .attr("width", hashPatternLineSpacing)
  .attr("height", hashPatternLineSpacing)
  .attr("fill", countryDefaultColor)

pattern
  .append("path")
  .attr(
    "d",
    `M-1,-1 l${hashPatternLineSpacing + 1},${hashPatternLineSpacing + 1}`
  )
  .attr("stroke", "rgba(0,0,0,0.2)")
  .attr("stroke-width", 1)

/* flow lines */
const redrawGlobe = () => {
  globeCountries.selectAll(".map-country").attr("d", path)
  globeCountries.selectAll(".map-line").attr("d", (d) => path(d))
}

/* Zoom feature */
const onZoom = (event) => {
  const factor = event.transform.k
  projection.scale(factor * baseWorldScale)
  globeOcean.attr("r", factor * baseWorldScale)
  redrawGlobe()
}

const zoomBehavior = d3
  .zoom()
  .scaleExtent([1, 10])
  .on("zoom", throttle(onZoom, fps60ms)) // Throttle zoom handler

globe.call(zoomBehavior)

/* Dragging feature */
let initialRotation = [0, 0, 0]

const onDrag = (event) => {
  const deltaX = event.x - event.subject.x
  const deltaY = event.y - event.subject.y
  const rotation = [
    initialRotation[0] + deltaX / 4,
    initialRotation[1] - deltaY / 4,
    initialRotation[2],
  ]
  projection.rotate(rotation)
  redrawGlobe()
}

const dragBehavior = d3
  .drag()
  .on("start", () => (initialRotation = projection.rotate()))
  .on("drag", throttle(onDrag, fps60ms)) // Throttle drag handler

globeOcean.call(dragBehavior)
globeCountries.call(dragBehavior)

/* Flow lines between locations */
const createLines = (countryTransportCount, selectedCountry) => {
  const selectedData = countryTransportCount[selectedCountry]

  const consumeCenter = countryCenter[selectedCountry]
  if (consumeCenter === undefined) return {lines: [], weightedAverageLength: 0}

  let totalLengthTimesScore = 0;
  let totalScore = 0;

  const lines_all = Object.keys(selectedData["manufacturing"])
    .map((manufacture) => {
      const manufactureData = selectedData["manufacturing"][manufacture]
      const manufactureCenter = countryCenter[manufacture]
      if (manufactureCenter === undefined) {
        return []
      }

      const lines = []
      const manScore = manufactureData["score"]
      const manLine = createFlowLine(manufactureCenter, consumeCenter, manScore, false)
      lines.push(manLine)

      Object.keys(manufactureData.origin).forEach((origin) => {
        const originCenter = countryCenter[origin]
        if (originCenter === undefined) {
          return
        }

        const originScore = manufactureData.origin[origin]
        const score = originScore * manScore
        const originLine = createFlowLine(originCenter, manufactureCenter, score, true)
        lines.push(originLine)

        const combinedLine = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: originLine.geometry.coordinates.concat(manLine.geometry.coordinates)
          },
          properties: originLine.properties
        };

        const combinedLineLength = d3.geoLength(combinedLine) * 6371;
        totalLengthTimesScore += combinedLineLength * score;
        totalScore += score;
      })

      return lines
    })
    .flat(1)

  const weightedAverageLength = totalLengthTimesScore / totalScore;

  return [lines_all, weightedAverageLength];
}

const createFlowLine = (fromCenter, toCenter, score, isOrigin) => {
  const interpolation = d3.geoInterpolate(fromCenter, toCenter)

  const colorFunc = isOrigin ? () => 'black' : () => 'black'
  const dash = isOrigin ? '5' : '0'

  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: d3.range(0, 1, 0.01).map((t) => interpolation(t)),
    },
    properties: {
      isOrigin: isOrigin,
      score: score,
      dash: dash,
      color: colorFunc(score),
    },
  }
}

const drawHighlighting = (selectedCountry) => {
  selectedCountry = capitalizeFirstLetter(selectedCountry)
  const selectedData = countryTransportCount[selectedCountry]
  globeCountries.selectAll(".map-line").remove()
  if (selectedData != null) {
    const [lines, weightedAverageLength] = createLines(countryTransportCount, selectedCountry)
    viewCountryInfo(selectedCountry, weightedAverageLength)
    console.log(`Typical length of ${weightedAverageLength} km}`)
    globeCountries
      .selectAll(".map-line")
      .data(lines.filter(x => x != undefined))
      .enter()
      .append("path")
      .attr("class", "map-line")
      .attr("stroke", (d) => d.properties.color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", (d) => d.properties.dash)
      .attr("opacity", (d) => d.properties.score * 10)
      .merge(svg.selectAll(".map-line"))
      .attr("d", (d) => path(d))
  }

  globeCountries
    .selectAll(".map-country")
    .transition()
    .duration(200)
    .attr("fill", (d) => {
      if (selectedData == null) {
        if (
          d.properties.name.toLowerCase() === selectedCountry.toLowerCase() ||
          !(capitalizeFirstLetter(d.properties.name) in countryTransportCount)
        ) {
          return "url(#diagonalHatch)"
        } else {
          return countryDefaultColor
        }
      }

      const manufactureCountries = selectedData["manufacturing"]
      const name = capitalizeFirstLetter(d.properties.name)

      const manufactureScore =
        name in manufactureCountries
          ? Math.sqrt(manufactureCountries[name]["score"])
          : 0

      let originScore = 0
      Object.keys(manufactureCountries).forEach((manufacture) => {
        const manufactureData = manufactureCountries[manufacture]
        if (name in manufactureData["origin"]) {
          originScore +=
            Math.sqrt(manufactureData["origin"][name]) *
            manufactureData["score"]
        }
      })

      if (originScore == 0 && manufactureScore == 0) {
        if (name.toLowerCase() === selectedCountry.toLowerCase()) {
          return "#ccc"
        } else if (
          !(capitalizeFirstLetter(d.properties.name) in countryTransportCount)
        ) {
          return "url(#diagonalHatch)"
        } else {
          return countryDefaultColor
        }
      }

      const interpolateManufacturingColor = d3.interpolate(
        countryDefaultColor,
        countryManufactureColor
      )
      const interpolateOriginColor = d3.interpolate(
        countryDefaultColor,
        countryOriginColor
      )

      const manufacturingColor = interpolateManufacturingColor(manufactureScore)
      const originColor = interpolateOriginColor(originScore)

      return d3.interpolateRgb(
        manufacturingColor,
        originColor
      )(originScore / (originScore + manufactureScore))
    })
    .attr("stroke", (d) => {
      if (d.properties.name.toLowerCase() === selectedCountry.toLowerCase()) {
        return "black"
      } else {
        return "rgba(0,0,0,0.2)"
      }
    })
}

drawHighlighting(initialSelectedCountry)
