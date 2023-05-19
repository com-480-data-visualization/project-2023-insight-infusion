import * as d3 from 'd3'
import Swatches from '../../components/swatches'
import { json, getLegendScale } from '../../utilities'
import { DANGEROUSNESS } from '../../constants'

/**
 * This graph is a stacked bar chart that shows the distribution of the 
 * hazard of the additives by NOVA class (how processed the product is). 
 * The total of each bar shows the average number of additives in that 
 * class.
 */
export const novaStackedBarChart = async (parentWidth) => {
    const rawData = await json('additives/nova_stacked_bar_chart.json')

    const levels = Object.keys(DANGEROUSNESS)
    const data = levels.flatMap(level => rawData.map(d => ({
        nova_group: d.nova_group,
        additives_count: d[`additives_${level}_count`],
        hazard: level,
    })))

    const getX = d => d.nova_group
    const getY = d => d.additives_count
    const getZ = d => d.hazard
    
    const width = parentWidth
    const height = 300
    const marginTop = 20
    const marginRight = 20
    const marginBottom = 20
    const marginLeft = 50

    const X = d3.map(data, getX)
    const Y = d3.map(data, getY)
    const Z = d3.map(data, getZ)

    const xDomain = new d3.InternSet(X)
    const zDomain = new d3.InternSet(Z)
    const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]))

    const series = d3.stack()
        .keys(zDomain)
        .value(([x, I], z) => Y[I.get(z)])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetDiverging)
        (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
        .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})))

    const xScale = d3.scaleBand(xDomain, [marginLeft, width - marginRight]).paddingInner(0.1)
    const yScale = d3.scaleLinear(d3.extent(series.flat(2)), [height - marginBottom, marginTop])
    const color = d3.scaleOrdinal(zDomain, d3.schemeOrRd[levels.length])
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0)
    const yAxis = d3.axisLeft(yScale).ticks(height / 60)

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;")

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .attr('class', 'chart-label')
            .text("↑ Additives count"));

    const bar = svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", ([{i}]) => color(Z[i]))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", ({i}) => xScale(X[i]))
        .attr("y", ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
        .attr("height", ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
        .attr("width", xScale.bandwidth());

    svg.on('mousemove', (e, d) => {
        const x = e.offsetX
        const y = e.offsetY
        if (y < marginTop || y > height + marginTop || x > width + marginLeft || x < marginLeft) return
        svg.select('#custom-line-chart').remove()
        svg.append("line")
        .attr('id', 'custom-line-chart')
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", width)
        .attr("y2", y)
        .style('stroke-dasharray', 10)
        .style("stroke-width", 2)
        .style("stroke", "rgba(0, 0, 0, 0.2)")
        .style("fill", "none");
    })
    svg.on('mouseleave', () => svg.select('#custom-line-chart').remove())

    svg.append("g")
        .attr("transform", `translate(0,${yScale(0)})`)
        .call(xAxis);

    const legend = Swatches(getLegendScale(Object.values(DANGEROUSNESS), true))
    return {svg: svg.node(), legend, legendPosition: 'top'}
}