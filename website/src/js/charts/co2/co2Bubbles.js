// Import our custom CSS
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import our custom CSS
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import all of Bootstrap's JS
import * as d3 from 'd3'
import { getColorScale } from '../../utilities'
import { addToDynamicInfo, removeDynamicInfo, plotSubs, plotProducts, plot_bar_chart } from '../../co2'

import 'default-passive-events'

// inspired by: https://observablehq.com/@tiffylou/topics-by-gender-in-the-smithsonian-api
export class CO2Bubbles {
	constructor(data, rx, ry, isBySubgroup, isByProduct) {
		this.data = data
		this.rx = rx
		this.ry = ry
		this.isBySubgroup = isBySubgroup
		this.isByProduct = isByProduct
	}
	
	chart = () => {
		const data = this.data
		const width = 900
		const scores =  data.map(d => d.score)
		const max = Math.max(...scores)
		const min = Math.min(...scores)
		const height = 375
		const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
		const spacing = 4
		const xRange = [margin.left, width - margin.right]
		const x = d3.scaleLinear().domain([0, 25]).range(xRange)
		const centerY = (height - margin.bottom + margin.top) / 2

		const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  
		const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

		let foodGroups = data;
		
		foodGroups.sort((a, b) => a.score - b.score);
	
		foodGroups.sort((a, b) => a.score - b.score);

		let r = d3.scaleLinear().domain(d3.extent(foodGroups, d => d.count)).range([this.rx, this.ry]);


		let node = svg.selectAll('.node')
			.data(foodGroups, d => d.id)
			.enter()
			.append('g')
			.attr('class', 'node')
			.on('mouseover', function (e, d) {
				d3.select(this)
					.append('circle')
					.attr('class', 'hover-circle')
					.attr('r', d => r(d.count) + 3)
					.style('fill', 'none')
					.style('stroke', '#999')
					.style('stroke-width', 0.5)
					.attr('stroke-dasharray', 2);
				tooltip.transition()
					.duration(200)
					.style("opacity", 0.9);
				addToDynamicInfo(d.group, d.score.toFixed(2));
			})
			.on("mouseout", function (d) {
				removeDynamicInfo()
				d3.select('.hover-circle').remove();
				tooltip.transition()
					.duration(500)
					.style("opacity", 0);
				
			})
			.on("click", (e, d) => {
				if (!this.isBySubgroup && !this.isByProduct) plotSubs(d.group);
				if (this.isBySubgroup && !this.isByProduct) plotProducts(d.group);
				if (this.isByProduct) {
					plot_bar_chart(undefined, d.group)
					window.scrollTo(0, 1200)
				}
			});
		const color = getColorScale([min, max], false)
		let circle = node.append('circle')
			.attr('stroke', 'none')
			.attr('fill', d => {
				// return color(d.score)
				if (d.score <= 0.94) { 
					return '#1e8f4e';
				} else if (d.score < 1.77) { 
					return '#60ac0e';
				} else if (d.score < 3.57) { 
					return '#eeae0e';
				} else if (d.score < 7.2) { 
					return '#ff6f1e';
				} else {
					return '#df1f1f';
				}
			})
			.attr('r', d => r(d.count))
			.style('opacity', 1);

		for (let circle of foodGroups) {
			circle.r = r(circle.count) + 3
			circle.side = 2 * circle.r * Math.cos(Math.PI / 4)
		}

		node.attr('class', 'circles')

		node.append("foreignObject")
			.attr('x', d => -d.side/2)
			.attr('y', d => -d.side/2)
			.attr('width', d => d.side)
			.attr('height', d => d.side)
			.append('xhtml:p')
				.text(d => `${d.group}: \n ${this.isByProduct ? '' : d.count}`)
				.attr('style', d => `text-align:center;padding:2px;margin:2px;font-size:${d.r/3.5}px;`);
			

		let simulation = d3.forceSimulation(data)
			.force('x', d3.forceX(d => x(d.score)))
			.force('y', d3.forceY(centerY))
			.force('collide', d3.forceCollide().radius(d => r(d.count) + spacing))
			.on('tick', tickActions)
			.stop();

		for (let i = 0; i < 100; ++i) simulation.tick();

		simulation.restart();
	
		function tickActions() {
			node.attr('transform', d => {
				let radius = r(d.count) + spacing;
				d.x = Math.max(xRange[0] + radius, Math.min(xRange[1] - radius, d.x));
				return `translate(${d.x}, ${d.y})`;
			})
		}
		return svg.node();
	}
}