import * as d3 from 'd3'
import Swatches from '../../components/swatches'
import { json, getColorScale, getLegendScale, capitalize } from '../../utilities'
import { DANGEROUSNESS } from '../../constants'

/**
 * Chart that shows all additives in the form of a packing bubbles chart. Each 
 * group maps to a danger level. The radius of the bubbles represents how 
 * much the additive is present.
 */
export const additivesBubbleChartAlt = async (parentWidth) => {
    const data = await json('additives/bubble_chart_repartition.json')

    const getDangerosity = d => d.dangerosity
    const getAdditive = d => d.additive
    const getCount = d => d.count

    const margin = ({top: 0, right: 200, left: 200, bottom: 0})
    const width = parentWidth
    const innerWidth = width - margin.left - margin.right
    const height = 300

    const color = getColorScale(d3.extent(data, getDangerosity), false)

    const svg = d3.create('svg')
        .attr('viewBox', [0, 0, width, height + margin.top + margin.bottom])

    const wrapper = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

    const x = d3.scaleLinear()
        .domain(d3.extent(data, getDangerosity))
        .range([0, innerWidth])

    const y = d3.scaleBand()
        .domain(['All'])
        .range([height - margin.top - margin.bottom, 0]);

    wrapper.append('g').append('text')
        .attr('x', innerWidth)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('class', 'chart-label')
        .style('font-size', '10px')
        .text('Average dangerosity →')

    const helper = wrapper.append('text')
        .attr('x', innerWidth)
        .attr('y', 35)
        .attr('font-weight', 'bold')
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .text('')

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, d => getCount(d)))
        .range([5, 20])

    const force = d3.forceSimulation(data)
        .force('charge', d3.forceManyBody().strength(0))
        .force('x', d3.forceX().x(d => x(getDangerosity(d))))
        .force('y', d3.forceY(d => (height - margin.top - margin.bottom) / 2))
        .force('collision', d3.forceCollide().radius(d => r(getCount(d)) + 1))

    const circles = wrapper.append('g')
        .attr('className', 'circles')
        .selectAll('circle')
        .data(data)
        .join('circle')
            .attr('r', d => r(getCount(d)))
            .attr('fill', d => color(getDangerosity(d)))
            .attr('x', d => x(getDangerosity(d)))
            .attr('y', d => y.bandwidth() / 2)
            .on('mouseover', (e, d) => {
                helper.transition()
                    .ease(d3.easeBack)
                    .duration(1000)
                    .text(capitalize(getAdditive(d)))
            })

    force.on('tick', () => {
        circles
            .transition()
            .ease(d3.easeLinear)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    })

    const legend = Swatches(getLegendScale(Object.values(DANGEROUSNESS), true))
    return {svg: svg.node(), legend, legendPosition: 'bottom'}
}