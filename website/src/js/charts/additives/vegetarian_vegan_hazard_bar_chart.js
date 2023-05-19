import * as d3 from 'd3'
import Legend from '../../components/legend'
import { json, getColorScale, getLegendScale, getTextColor } from '../../utilities'

/**
 * Bar chart of the dangerousness of additives for classic, vegan, vegetarian 
 * and meat products. 
 */
export const vegetarianVeganAverageHazardsBarChart = async () => {
    const data = await json('additives/vegetarian_vegan_average_hazards.json')

    const marginTop = 40
    const marginRight = 30
    const marginBottom = 30
    const marginLeft = 110
    const width = 600
    const height = 250

    const X = d3.map(data, d => d.average_hazard)
    const Y = d3.map(data, d => d.label)

    const color = getColorScale(d3.extent(X), false)

    const yDomain = new d3.InternSet(Y)
    const I = d3.range(X.length).filter(i => yDomain.has(Y[i]))

    const xScale = d3.scaleLinear([0, d3.max(X)], [marginLeft, width - marginRight])
    const yScale = d3.scaleBand(yDomain, [marginTop, height - marginBottom]).padding(0.1)
    const xAxis = d3.axisTop(xScale).ticks(width / 80)
    const yAxis = d3.axisLeft(yScale).tickSizeOuter(0)

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", height - marginTop - marginBottom)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", -22)
            .attr("fill", "black")
            .attr("text-anchor", "end")
            .attr('class', 'chart-label')
            .text("Average dangerosity per product →"));

    svg.append("g")
        .selectAll("rect")
        .data(I)
        .join("rect")
        .attr("fill", (d, i) => color(X[i]))
        .attr("x", xScale(0))
        .attr("y", i => yScale(Y[i]))
        .attr("width", i => xScale(X[i]) - xScale(0))
        .attr("height", yScale.bandwidth());

    svg.append("g")
        .attr("fill", 'white')
        .attr("text-anchor", "end")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll("text")
        .data(I)
        .join("text")
        .attr('fill', i => getTextColor(color(X[i])))
        .attr("x", i => xScale(X[i]))
        .attr("y", i => yScale(Y[i]) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .text(i => `${Math.round((X[i] + Number.EPSILON) * 100) / 100}`)
        .call(text => text.filter(i => xScale(X[i]) - xScale(0) < 20) // short bars
            .attr("dx", +4)
            .attr("fill", 'blue')
            .attr("text-anchor", "start"));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").remove())

    const legend = Legend(getLegendScale(d3.extent(data, d => d.average_hazard), false), {
        title: "Dangerosity →",
    })
    return {svg: svg.node(), legend, legendPosition: 'bottom'}

}