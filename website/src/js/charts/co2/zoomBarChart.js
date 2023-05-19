// Import our custom CSS
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import our custom CSS
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import all of Bootstrap's JS
import * as d3 from 'd3'

import 'default-passive-events'
export class ZoomBarChart {
	constructor (data, itemInfo) {
		this.data = data;
		this.margin = ({top: 20, right: 0, bottom: 30, left: 40})
		this.itemInfo = itemInfo
	}
	data = this.data;

	// function for the chart
	chart = () => {
		const data = this.data;
		const height = 250
		const width = 500
		const margin = ({top: 20, right: 0, bottom: 30, left: 40})
		const x = d3.scaleBand().domain(data.map(d => d.name)).range([margin.left, width - margin.right]).padding(0.1);
		const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice().range([height - margin.bottom, margin.top])
		const xAxis = g => g.attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0))

		const yAxis = g => g.attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y)).call(g => g.select(".domain").remove())
		function zoom(svg) {
			const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];
	
			svg.call(d3.zoom()
				.scaleExtent([1, 8])
				.translateExtent(extent)
				.extent(extent)
				.on("zoom", zoomed));
	
			function zoomed(event) {
				x.range([margin.left, width - margin.right].map(d => event.transform.applyX(d)));
				svg.selectAll(".bars rect").attr("x", d => x(d.name)).attr("width", x.bandwidth());
				svg.selectAll(".x-axis").call(xAxis);
			}
		}
		const svg = d3.create("svg")
			.attr("viewBox", [0, 0, width, height])
			.call(zoom);
			
		const color = d3.scaleSequential([1, 0], d3.interpolateRdYlGn)

		svg.append("g")
			.attr("class", "bars")
		  .selectAll("rect")
		  .data(data)
		  .join("rect")
		    .attr("fill", d => {
				/*if (this.itemInfo[d.name] < ok_limit) return 'green';
				else if (this.itemInfo[d.name] < danger_limit) return 'orange';
				else return 'red'*/
				return color(this.itemInfo[d.name])
			})
			.attr("x", d => x(d.name))
			.attr("y", d => y(d.value))
			.attr("height", d => y(0) - y(d.value))
			.attr("width", x.bandwidth());
		
		svg.append("g")
			.attr("class", "x-axis")
			.call(xAxis);
	  
		svg.append("g")
			.attr("class", "y-axis")
			.call(yAxis);
	  
		return svg.node();
	}
}