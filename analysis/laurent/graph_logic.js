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
whenDocumentLoaded(() => {
	fetch("./hierarchy_CO2.json")
		.then((response) => response.json())
		.then((hierarchy_CO2) => {
			JSON_HIERARCHY = hierarchy_CO2;
			GROUP_DATA = hierarchy_to_group_data(hierarchy_CO2);
			SUBGROUP_DATA = hierarchy_to_subgroup_data(hierarchy_CO2)
			subgroupButtonAction()
			//newDiv.addEventListener("click", plot_bar_chart, false);
			const groupButton = document.getElementById("group-button");
			const subgroupButton = document.getElementById("subgroup-button");
			groupButton.addEventListener("click", groupButtonAction, false);
			subgroupButton.addEventListener("click", subgroupButtonAction, false);
		});
	
	fetch('./raw_CO2.json')
		.then((response) => response.json())
		.then((raw_CO2) => {
			JSON_RAW_CO2 = raw_CO2;
			const foodList = Object.keys(raw_CO2).sort((a, b) => 0.5 - Math.random());
			
			container = document.getElementById('slider-container');
			loadList(container, foodList)
			// we plot the first chart so there is something
			plot_bar_chart(undefined, foodList[0])
		})
});

function addToDynamicInfo(group, score) {
	const container = document.getElementById("dynamic-info");
	container.innerHTML = "";
	const newH3 = document.createElement('h3');
	newH3.appendChild(document.createTextNode(`${group}: ${score} kg CO2 / kg`))
	container.appendChild(newH3)
}
function removeDynamicInfo() {
	const container = document.getElementById("dynamic-info");
	container.innerHTML = "";
	const newH3 = document.createElement('h3');
	newH3.appendChild(document.createTextNode(`Hover on a CO2 bubble to get info`));
	container.appendChild(newH3);
}

function hierarchy_to_group_data(d) {
	const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
	const xRange = [margin.left, 900 - margin.right]
	const x = d3.scaleLinear().domain([0, 13]).range(xRange)
	const centerY = (300 - margin.bottom + margin.top) / 2
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
	const centerY = (300 - margin.bottom + margin.top) / 2
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
		if (key !== 'total') 
			data.push({name: key, value: itemInfo[key]})
	});
	return data;
}

function plot_bar_chart(event, name) {
	const id = event ? event.target.id: name;
	const itemInfo = JSON_RAW_CO2[id]
	data = CO2ToData(itemInfo)
	const  container = document.getElementById('pie-chart');
	container.innerHTML = "";

	title = document.createElement('h2');
	title.appendChild(document.createTextNode(`${id}`));
	container.appendChild(title);

	const facts = document.createElement('h3');
	facts.appendChild(document.createTextNode(`Total: ${itemInfo['total']} Kg CO2/Kg`));
	container.appendChild(facts);

	const BarChart = new ZoomBarChart(data, itemInfo);
	const plot = BarChart.chart();
	plot.className = "bar-chart";
	container.appendChild(plot) 
}
function groupButtonAction() {
	container = document.getElementById("bubbles-2");
	container.innerHTML= "";
	const bubbles_CO2 = new CO2Bubbles(GROUP_DATA, 20, 90, 10, 0.05)
	const chart_CO2 = bubbles_CO2.chart() 
	container.appendChild(chart_CO2)
}
function subgroupButtonAction() {
	container = document.getElementById("bubbles-2");
	container.innerHTML= "";
	const bubbles_CO2 = new CO2Bubbles(SUBGROUP_DATA, 5, 59, 4, 0.1)
	const chart_CO2 = bubbles_CO2.chart() 
	container.appendChild(chart_CO2)
}

function getClassName(id) {
	const total = JSON_RAW_CO2[id]['total']
	if (total < 1.51) return 'label label-success slider-item';
	else if (total < 5.1) return 'label label-warning slider-item';
	else return 'label label-danger slider-item'
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

class ZoomBarChart {
	constructor (data, itemInfo) {
		this.data = data;
		this.margin = ({top: 20, right: 0, bottom: 30, left: 40})
		this.itemInfo = itemInfo
	}
	data = this.data;

	// function for the chart
	chart = () => {
		const height = 200
		const width = 430
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
	constructor(data, rx, ry, placementNumber, policeNumber) {
		this.data = data
		this.rx = rx
		this.ry = ry
		this.placementNumber = placementNumber
		this.policeNumber = policeNumber
	}
	
	chart = () => {
		const data = this.data
		const width = 900
		const height = 300
		const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
		const spacing = 4
		const xRange = [margin.left, width - margin.right]
		const x = d3.scaleLinear().domain([0, 13]).range(xRange)
		const centerY = (height - margin.bottom + margin.top) / 2

		const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  
		const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

		let foodGroups = data;
		console.log(foodGroups)
		
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
					.attr('r', d => r(d.count) + 3) // qqchose a faire avec https://stackoverflow.com/questions/20913869/wrap-text-within-circle
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
				
			});
		
		let circle = node.append('circle')
			.attr('stroke', 'none')
			.attr('fill', d => {
			if (d.score <= 1.39) { 
				return 'rgb(2, 211, 37)';
			} else if (d.score < 1.77) { 
				return 'rgb(123, 255, 0)';
			} else if (d.score < 3.57) { 
				return 'rgb(255, 238, 0)';
			} else if (d.score < 7.2) { 
				return 'rgb(255, 153, 0)';
			} else {
				return 'rgb(255, 51, 0)';
			}
			})
			.attr('r', d => r(d.count))
			.style('opacity', 1);

		for (let circle of foodGroups) {
			circle.r = r(circle.count) + 3
			circle.side = 2 * circle.r * Math.cos(Math.PI / 4)
		}

		node.append("foreignObject")
			.attr('x', d => -d.side/2)
			.attr('y', d => -d.side/2)
			.attr('width', d => d.side)
			.attr('height', d => d.side)
			.append('xhtml:p')
				.text(d => `${d.group}: \n ${d.count}`)
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