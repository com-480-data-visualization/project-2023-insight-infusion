import * as d3 from 'd3'
import Swatches from '../../components/swatches'
import { json, getColorScale, getLegendScale, getTextColor } from '../../utilities'
import { DANGEROUSNESS } from '../../constants'

/**
 * Chart that presents the 50 most present additives in the form of a packing 
 * bubbles chart. The radius of the bubbles represents how much the additive 
 * is present and the color represents the danger.
 */
export const additivesBubbleChart = async (parentWidth) => {
    const data = await json('additives/bubble_chart_additives.json')
    const widthReductionFactor = 1.3;
    const width = parentWidth * widthReductionFactor;
    const height = 600;

    const getLabelLong = d => d.additive
    const getLabel = d => getLabelLong(d).split('-')[0].trim()
    const getCount = d => d.count
    const getDangerosity = d => d.dangerosity

    const color = getColorScale(d3.extent(data, getDangerosity), true)

    const svg = d3.create('svg').attr('viewBox', [0, 0, width, height])

    const wrapper = svg.append('g')

    const helper = wrapper.append('text')
        .attr('x', 200)
        .attr('y', 30)
        .attr('class', 'chart-label')
        .text('')

    const title = wrapper.append('text')
        .attr('x', 200)
        .attr('y', 15)
        .attr('class', 'chart-label')
        .style('font-size', '14px')
        .text('50 most populars additives in food products')

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, getCount))
        .range([20, 50])

    const t = d3.scaleSqrt()
        .domain(d3.extent(data, getCount))
        .range([10, 18])

    const force = d3.forceSimulation(data)
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(0))
        .force('collision', d3.forceCollide().radius(d => r(getCount(d))))

    const bubbles = wrapper.selectAll(".bubble")
        .data(data)
        .enter()
        .append("g")
            .attr("class", "bubble");

    bubbles.append("circle")
        .attr("r", d => r(getCount(d)))
        .attr("fill", d => color(getDangerosity(d)))

    bubbles.append("text")
        .text(getLabel)
        .style('fill', d => getTextColor(color(getDangerosity(d))))
        .attr('font-size', d => `${t(getCount(d))}px`)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "middle");

    bubbles.on('mouseover', (e, d) => helper.text(`${getLabelLong(d)}`))
    bubbles.on('mouseleave', () => helper.text(''))

    force.on('tick', () => {
        bubbles.transition()
            .ease(d3.easeLinear)
            .attr("transform", d => `translate(${d.x},${d.y})`);
    })

    const legend = Swatches(getLegendScale(Object.values(DANGEROUSNESS), true), {marginLeft: 180})
    return {svg: svg.node(), legend, legendPosition: 'bottom'}
}