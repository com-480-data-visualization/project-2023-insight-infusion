import { ENDPOINT } from './constants'
// Import our custom CSS
import '../scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import our custom CSS
import '../scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap'
import * as d3 from 'd3'

import 'default-passive-events'

function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

let JSON_RAW_CO2 = {}
let JSON_HIERARCHY = {}
let GROUP_DATA = {}
let SUBGROUP_DATA = {}
let SCORE = 1
whenDocumentLoaded(() => {
	fetch(`${ENDPOINT}/co2/hierarchy_CO2.json`)
		.then((response) => response.json())
		.then((hierarchy_CO2) => {
			JSON_HIERARCHY = hierarchy_CO2;
			GROUP_DATA = hierarchy_to_group_data(hierarchy_CO2);
			SUBGROUP_DATA = hierarchy_to_subgroup_data(hierarchy_CO2)
			subgroupButtonAction()
			const groupButton = document.getElementById("group-button");
			const subgroupButton = document.getElementById("subgroup-button");
			groupButton.addEventListener("click", groupButtonAction, false);
			subgroupButton.addEventListener("click", subgroupButtonAction, false);
		});
	
	fetch(`${ENDPOINT}/co2/raw_CO2.json`)
		.then((response) => response.json())
		.then((raw_CO2) => {
			JSON_RAW_CO2 = raw_CO2;
			console.log(raw_CO2)
			const foodList = Object.keys(raw_CO2).sort((a, b) => 0.5 - Math.random());
			let container = document.getElementById('slider-container');
			loadList(container, foodList)
			plot_bar_chart(undefined, foodList[0])
			const input = document.getElementById('kg-input')
			input.addEventListener('input', (e) => updateProgressBars(SCORE, e.target.value))
		})
});
function updateProgressBars(co2PerKg, numKg) {
	const firstPB = document.getElementById("first-PB");
	const secondPB = document.getElementById("second-PB");
	const thirdPB = document.getElementById("third-PB");
	const product = co2PerKg * numKg
	const ratio = (product / 946) * 100
	firstPB.innerHTML = `<div class="progress-bar bg-warning" role="progressbar" style="width: ${ratio}%;" aria-valuenow="${ratio}" aria-valuemin="0" aria-valuemax="100">${Math.round(product)} kg</div>`
	secondPB.innerHTML = '<div class="progress-bar bg-success" role="progressbar" style="width: 60%;" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">600 kg</div>'
	thirdPB.innerHTML = '<div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">946 kg</div>'
	if (product > 946) {
		firstPB.innerHTML = `<div class="progress-bar bg-danger" role="progressbar" style="width: ${100}%;" aria-valuenow="${100}" aria-valuemin="0" aria-valuemax="100">${Math.round(product)} kg</div>`
		secondPB.innerHTML = `<div class="progress-bar bg-success" role="progressbar" style="width: ${(600 / product) * 100}%;" aria-valuenow="${(600 / product) * 100}" aria-valuemin="0" aria-valuemax="100">600 kg</div>`
		thirdPB.innerHTML = `<div class="progress-bar bg-danger" role="progressbar" style="width: ${(946 / product) * 100}%;" aria-valuenow="${(946 / product) * 100}" aria-valuemin="0" aria-valuemax="100">946 kg</div>`
	}
}

function addToDynamicInfo(group, score) {
	const container = document.getElementById("dynamic-info");
	container.innerHTML = "";
	const newH3 = document.createElement('h3');
	newH3.className = 'police'
	newH3.appendChild(document.createTextNode(`${group}: ${score} kg CO2 / kg`))
	container.appendChild(newH3)
}
function removeDynamicInfo() {
	const container = document.getElementById("dynamic-info");
	container.innerHTML = "";
	const newH3 = document.createElement('h3');
	newH3.className = 'police'
	newH3.appendChild(document.createTextNode(`Hover on a CO2 bubble to get info`));
	container.appendChild(newH3);
}

function hierarchy_to_group_data(d) {
	const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
	const xRange = [margin.left, 900 - margin.right]
	const x = d3.scaleLinear().domain([0, 13]).range(xRange)
	const centerY = (375 - margin.bottom + margin.top) / 2
	const data = Object.keys(d).map((group) => {
		return {
			"group": group,
			"count": d[group]["count"],
			"score": d[group]["score"],
			"x": x(d[group]["score"]),
			"y": centerY
		}
	})
	return data.sort((a, b) =>  a.score - b.score);
}

function hierarchy_to_subgroup_data (d) {
	const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
	const xRange = [margin.left, 900 - margin.right]
	const x = d3.scaleLinear().domain([0, 25]).range(xRange)
	const centerY = (375 - margin.bottom + margin.top) / 2
	const data = []
	Object.keys(d).forEach((group) => {
		Object.keys(d[group]['subgroups']).forEach((subgroup) => {
			data.push({
				"group": subgroup,
				"count": d[group]['subgroups'][subgroup].count,
				"score": d[group]['subgroups'][subgroup].score,
				"x": x(d[group]["subgroups"][subgroup].score),
				"y": centerY
			})
		});
	});
	return data.sort((a, b) => a.score - b.score)
}

function CO2ToData(itemInfo) {
	const data = []
	Object.keys(itemInfo).forEach((key) => {
		if (key !== 'total' && key !== 'subgroup') 
			data.push({name: key, value: itemInfo[key]})
	});
	return data;
}

function plot_bar_chart(event, name) {
	const id = event ? event.target.id: name;
	const itemInfo = JSON_RAW_CO2[id]
	let data = CO2ToData(itemInfo)
	const container = document.getElementById('pie-chart');
	container.innerHTML = "";

	const title = document.createElement('h2');
	title.appendChild(document.createTextNode(`${id}`));
	container.appendChild(title);
	SCORE = itemInfo['total']
	const facts = document.createElement('h3');
	facts.appendChild(document.createTextNode(`Total: ${itemInfo['total']} kg CO2/kg`));
	container.appendChild(facts);
	updateProgressBars(itemInfo['total'], 43.6)
	const BarChart = new ZoomBarChart(data, itemInfo);
	const plot = BarChart.chart();
	plot.className.baseVal = "bar-chart";
	container.appendChild(plot)
}

function groupButtonAction() {
	let container = document.getElementById("bubbles-2");
	container.innerHTML= "";
	const bubbles_CO2 = new CO2Bubbles(GROUP_DATA, 20, 90, false)
	const chart_CO2 = bubbles_CO2.chart() 
	container.appendChild(chart_CO2)
}

function subgroupButtonAction() {
	let container = document.getElementById("bubbles-2");
	container.innerHTML= "";
	const bubbles_CO2 = new CO2Bubbles(SUBGROUP_DATA, 5, 55, true)
	const chart_CO2 = bubbles_CO2.chart() 
	container.appendChild(chart_CO2)
}

function getClassName(id) {
	const total = JSON_RAW_CO2[id]['total']
	if (total < 1.51) return 'badge text-bg-success slider-item';
	else if (total < 5.1) return 'badge text-bg-warning slider-item';
	else return 'badge text-bg-danger slider-item'
}

function loadList(container_element, food_array) {
	container_element.innerHTML = "";
	food_array.forEach(e => {
		const newDiv = document.createElement('div');
		const newFood = document.createTextNode(e.length > 25 ? `${e.slice(0, 25)} ...`: e);
		newDiv.appendChild(newFood);
		newDiv.className = getClassName(e);
		newDiv.id = e;
		newDiv.addEventListener("click", plot_bar_chart, false);
		container_element.appendChild(newDiv)
	});
}

const plotSubs = (subgroup) =>  {
	const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
	const xRange = [margin.left, 900 - margin.right]
	const x = d3.scaleLinear().domain([0, 25]).range(xRange)
	const centerY = (375 - margin.bottom + margin.top) / 2
	let dict = JSON_HIERARCHY[subgroup].subgroups;
	const data = Object.keys(dict).map((subgroup) => {
		return {
			group: subgroup,
			score: dict[subgroup].score,
			count: dict[subgroup].count,
			x: x(dict[subgroup].score),
			y: centerY
		}
	});
	let container = document.getElementById("bubbles-2");
	container.innerHTML= "";
	const bubbles_CO2 = new CO2Bubbles(data, 20, 50, true)
	const chart_CO2 = bubbles_CO2.chart() 
	container.appendChild(chart_CO2)
}

const plotProducts = (subgroup) => {
	const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
	const xRange = [margin.left, 900 - margin.right]
	const x = d3.scaleLinear().domain([0, 53]).range(xRange)
	const centerY = (375 - margin.bottom + margin.top) / 2
	let data = []
	Object.keys(JSON_RAW_CO2).forEach((product) => {
		if (JSON_RAW_CO2[product].subgroup === subgroup)
			data.push({
				group: product,
				count: 1,
				score: JSON_RAW_CO2[product].total,
				x: x(JSON_RAW_CO2[product].total),
				y: centerY
			});
	});
	data = data.sort((a, b) => a.score - b.score)
	let container = document.getElementById("bubbles-2");
	container.innerHTML= "";
	const offset = (1/data.length) * 400 
	const bubbles_CO2 = new CO2Bubbles(data, 2, 20 + offset, false, true)
	const chart_CO2 = bubbles_CO2.chart() 
	container.appendChild(chart_CO2)
}

class ZoomBarChart {
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
	  
		svg.append("g")
			.attr("class", "bars")
		  .selectAll("rect")
		  .data(data)
		  .join("rect")
		    .attr("fill", d => {
				if (this.itemInfo[d.name] < 0.3) return 'green';
				else if (this.itemInfo[d.name] < 1) return 'orange';
				else return 'red'
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

// inspired by: https://observablehq.com/@tiffylou/topics-by-gender-in-the-smithsonian-api
class CO2Bubbles {
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
		const height = 375
		const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
		const spacing = 4
		const xRange = [margin.left, width - margin.right]
		const domainMax = this.isByProduct ? 53: data.slice(-1)[0].score
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

		let circle = node.append('circle')
			.attr('stroke', 'none')
			.attr('fill', d => {
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