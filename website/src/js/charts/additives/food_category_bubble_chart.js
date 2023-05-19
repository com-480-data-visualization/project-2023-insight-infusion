import * as d3 from 'd3'
import Swatches from '../../components/swatches'
import { json, getColorScale, getLegendScale, capitalize } from '../../utilities'
import { DANGEROUSNESS } from '../../constants'

/**
 * Bubble packing chart showing the distribution of additives by product 
 * category. This graph shows the presence (radius) and the danger (color).
 */
export const additivesFoodCategoryBubbleGraph = async (parentWidth) => {
    const data = await json('additives/bubble_chart_categories.json')

    const getDangerosity = d => d.dangerosity
    const getCategory = d => d.categories
    const getCount = d => d.count

    const margin = ({top: 0, right: 0, left: 0, bottom: 0})
    const width = parentWidth
    const innerWidth = width - margin.left - margin.right
    const height = 400

    const svg = d3.create('svg')
        .attr('viewBox', [0, 0, width, height + margin.top + margin.bottom])

    const wrapper = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

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

    const color = getColorScale(d3.extent(data, getDangerosity), false)

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, getCount))
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
                    .text(capitalize(getCategory(d)))
            })

    force.on('tick', () => {
        circles
            .transition()
            .ease(d3.easeLinear)
            .attr('cx', d => {
                const radius = r(getCount(d))
                d.x = Math.max(radius, Math.min(width - radius, d.x))
                return d.x
            })
            .attr('cy', d => {
                const radius = r(getCount(d))
                d.y = Math.max(radius, Math.min(height - radius, d.y))
                return d.y
            })
    })

    const legend = Swatches(getLegendScale(Object.values(DANGEROUSNESS), true))
    return {svg: svg.node(), legend, legendPosition: 'bottom'}
}