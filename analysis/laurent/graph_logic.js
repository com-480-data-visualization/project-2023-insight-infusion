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

		node.append("text")
			.attr("dx", d => -(d.count/this.placementNumber))
			.text(d => d.group.length > 12? d.group.slice(0, 12) + '...': d.group)
			.style("font-size", d => `${d.count * this.policeNumber > 5? d.count * d.policeNumber:5}`)
			// .style("font-size", d => `${d.count * 0.04 > 5? d.count * 0.04:5}`)
			// .attr("dx", d => -(d.count/10))
			

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

// https://observablehq.com/@tiffylou/topics-by-gender-in-the-smithsonian-api
class TopicBubbles {
	constructor() {}
	
	//////////////////////////////////////////////////////////////////////////
	chart = () => {
		const W = ['mary', 'elizabeth', 'anna', 'helen', 'margaret', 'sarah', 'emma', 'susan', 'clara', 'florence']
		const M = ['james', 'john', 'william', 'george', 'joseph', 'charles', 'robert', 'henry', 'edward', 'thomas']
		const totals = [{totals: {
			"mary": 1538,
			"elizabeth": 557,
			"anna": 229,
			"helen": 344,
			"margaret": 288,
			"sarah": 335,
			"emma": 212,
			"susan": 272,
			"clara": 200,
			"florence": 187,
			"james": 4833,
			"john": 9501,
			"william": 7194,
			"george": 6004,
			"joseph": 2448,
			"charles": 3923,
			"robert": 2079,
			"henry": 4909,
			"edward": 2084,
			"thomas": 3197
		  }}]
		const data = [
			{
			  "topic": "Women",
			  "count": 460,
			  "mary": 105,
			  "elizabeth": 47,
			  "anna": 19,
			  "helen": 30,
			  "margaret": 19,
			  "sarah": 36,
			  "emma": 15,
			  "susan": 28,
			  "clara": 14,
			  "florence": 3,
			  "james": 8,
			  "john": 25,
			  "william": 32,
			  "george": 25,
			  "joseph": 6,
			  "charles": 16,
			  "robert": 8,
			  "henry": 8,
			  "edward": 5,
			  "thomas": 11
			},
			{
			  "topic": "Portraits",
			  "count": 3319,
			  "mary": 91,
			  "elizabeth": 43,
			  "anna": 16,
			  "helen": 18,
			  "margaret": 15,
			  "sarah": 35,
			  "emma": 15,
			  "susan": 10,
			  "clara": 14,
			  "florence": 2,
			  "james": 303,
			  "john": 604,
			  "william": 546,
			  "george": 333,
			  "joseph": 206,
			  "charles": 254,
			  "robert": 151,
			  "henry": 318,
			  "edward": 114,
			  "thomas": 231
			},
			{
			  "topic": "Textiles",
			  "count": 261,
			  "mary": 54,
			  "elizabeth": 25,
			  "anna": 3,
			  "helen": 0,
			  "margaret": 10,
			  "sarah": 12,
			  "emma": 3,
			  "susan": 13,
			  "clara": 2,
			  "florence": 1,
			  "james": 7,
			  "john": 16,
			  "william": 64,
			  "george": 25,
			  "joseph": 4,
			  "charles": 4,
			  "robert": 1,
			  "henry": 14,
			  "edward": 1,
			  "thomas": 2
			},
			{
			  "topic": "Photography",
			  "count": 898,
			  "mary": 46,
			  "elizabeth": 14,
			  "anna": 8,
			  "helen": 19,
			  "margaret": 13,
			  "sarah": 8,
			  "emma": 3,
			  "susan": 5,
			  "clara": 2,
			  "florence": 15,
			  "james": 51,
			  "john": 151,
			  "william": 156,
			  "george": 106,
			  "joseph": 49,
			  "charles": 78,
			  "robert": 46,
			  "henry": 61,
			  "edward": 36,
			  "thomas": 31
			},
			{
			  "topic": "Furnishings",
			  "count": 331,
			  "mary": 43,
			  "elizabeth": 19,
			  "anna": 2,
			  "helen": 1,
			  "margaret": 10,
			  "sarah": 7,
			  "emma": 4,
			  "susan": 9,
			  "clara": 6,
			  "florence": 1,
			  "james": 28,
			  "john": 39,
			  "william": 46,
			  "george": 16,
			  "joseph": 12,
			  "charles": 22,
			  "robert": 6,
			  "henry": 41,
			  "edward": 5,
			  "thomas": 14
			},
			{
			  "topic": "Costume",
			  "count": 1123,
			  "mary": 32,
			  "elizabeth": 9,
			  "anna": 7,
			  "helen": 6,
			  "margaret": 5,
			  "sarah": 10,
			  "emma": 13,
			  "susan": 3,
			  "clara": 11,
			  "florence": 1,
			  "james": 109,
			  "john": 186,
			  "william": 166,
			  "george": 127,
			  "joseph": 56,
			  "charles": 108,
			  "robert": 43,
			  "henry": 133,
			  "edward": 42,
			  "thomas": 56
			},
			{
			  "topic": "Quilts",
			  "count": 87,
			  "mary": 36,
			  "elizabeth": 10,
			  "anna": 2,
			  "helen": 0,
			  "margaret": 7,
			  "sarah": 6,
			  "emma": 3,
			  "susan": 7,
			  "clara": 2,
			  "florence": 1,
			  "james": 3,
			  "john": 2,
			  "william": 4,
			  "george": 0,
			  "joseph": 1,
			  "charles": 1,
			  "robert": 0,
			  "henry": 1,
			  "edward": 0,
			  "thomas": 1
			},
			{
			  "topic": "Politics",
			  "count": 1377,
			  "mary": 31,
			  "elizabeth": 6,
			  "anna": 3,
			  "helen": 1,
			  "margaret": 4,
			  "sarah": 2,
			  "emma": 1,
			  "susan": 6,
			  "clara": 0,
			  "florence": 0,
			  "james": 142,
			  "john": 326,
			  "william": 189,
			  "george": 202,
			  "joseph": 46,
			  "charles": 85,
			  "robert": 42,
			  "henry": 117,
			  "edward": 73,
			  "thomas": 101
			},
			{
			  "topic": "Government",
			  "count": 1255,
			  "mary": 31,
			  "elizabeth": 4,
			  "anna": 3,
			  "helen": 1,
			  "margaret": 3,
			  "sarah": 3,
			  "emma": 1,
			  "susan": 6,
			  "clara": 0,
			  "florence": 1,
			  "james": 144,
			  "john": 261,
			  "william": 193,
			  "george": 178,
			  "joseph": 44,
			  "charles": 82,
			  "robert": 47,
			  "henry": 117,
			  "edward": 33,
			  "thomas": 103
			},
			{
			  "topic": "Art",
			  "count": 618,
			  "mary": 23,
			  "elizabeth": 12,
			  "anna": 3,
			  "helen": 7,
			  "margaret": 0,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 4,
			  "clara": 1,
			  "florence": 2,
			  "james": 43,
			  "john": 110,
			  "william": 108,
			  "george": 67,
			  "joseph": 33,
			  "charles": 47,
			  "robert": 26,
			  "henry": 49,
			  "edward": 21,
			  "thomas": 60
			},
			{
			  "topic": "Dress accessories",
			  "count": 868,
			  "mary": 26,
			  "elizabeth": 7,
			  "anna": 3,
			  "helen": 3,
			  "margaret": 4,
			  "sarah": 8,
			  "emma": 4,
			  "susan": 2,
			  "clara": 3,
			  "florence": 0,
			  "james": 84,
			  "john": 147,
			  "william": 119,
			  "george": 116,
			  "joseph": 41,
			  "charles": 82,
			  "robert": 36,
			  "henry": 108,
			  "edward": 32,
			  "thomas": 43
			},
			{
			  "topic": "Health & Medicine",
			  "count": 109,
			  "mary": 14,
			  "elizabeth": 19,
			  "anna": 2,
			  "helen": 1,
			  "margaret": 1,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 5,
			  "john": 16,
			  "william": 10,
			  "george": 5,
			  "joseph": 6,
			  "charles": 3,
			  "robert": 5,
			  "henry": 2,
			  "edward": 17,
			  "thomas": 3
			},
			{
			  "topic": "First ladies",
			  "count": 56,
			  "mary": 29,
			  "elizabeth": 2,
			  "anna": 3,
			  "helen": 3,
			  "margaret": 0,
			  "sarah": 4,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 4,
			  "james": 2,
			  "john": 1,
			  "william": 0,
			  "george": 5,
			  "joseph": 0,
			  "charles": 1,
			  "robert": 0,
			  "henry": 1,
			  "edward": 0,
			  "thomas": 1
			},
			{
			  "topic": "Presidents' spouses",
			  "count": 56,
			  "mary": 29,
			  "elizabeth": 2,
			  "anna": 3,
			  "helen": 3,
			  "margaret": 0,
			  "sarah": 4,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 4,
			  "james": 2,
			  "john": 1,
			  "william": 0,
			  "george": 5,
			  "joseph": 0,
			  "charles": 1,
			  "robert": 0,
			  "henry": 1,
			  "edward": 0,
			  "thomas": 1
			},
			{
			  "topic": "Actors and actresses",
			  "count": 179,
			  "mary": 27,
			  "elizabeth": 3,
			  "anna": 1,
			  "helen": 7,
			  "margaret": 7,
			  "sarah": 0,
			  "emma": 1,
			  "susan": 2,
			  "clara": 7,
			  "florence": 9,
			  "james": 8,
			  "john": 24,
			  "william": 23,
			  "george": 13,
			  "joseph": 5,
			  "charles": 15,
			  "robert": 5,
			  "henry": 9,
			  "edward": 7,
			  "thomas": 6
			},
			{
			  "topic": "Beauty and Health",
			  "count": 43,
			  "mary": 11,
			  "elizabeth": 18,
			  "anna": 2,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 1,
			  "john": 1,
			  "william": 4,
			  "george": 1,
			  "joseph": 0,
			  "charles": 1,
			  "robert": 1,
			  "henry": 1,
			  "edward": 0,
			  "thomas": 2
			},
			{
			  "topic": "Jewelry",
			  "count": 224,
			  "mary": 22,
			  "elizabeth": 7,
			  "anna": 2,
			  "helen": 1,
			  "margaret": 4,
			  "sarah": 5,
			  "emma": 6,
			  "susan": 1,
			  "clara": 11,
			  "florence": 0,
			  "james": 21,
			  "john": 23,
			  "william": 22,
			  "george": 16,
			  "joseph": 8,
			  "charles": 24,
			  "robert": 2,
			  "henry": 39,
			  "edward": 6,
			  "thomas": 4
			},
			{
			  "topic": "Interior decoration",
			  "count": 827,
			  "mary": 18,
			  "elizabeth": 6,
			  "anna": 6,
			  "helen": 2,
			  "margaret": 2,
			  "sarah": 9,
			  "emma": 11,
			  "susan": 2,
			  "clara": 11,
			  "florence": 0,
			  "james": 84,
			  "john": 159,
			  "william": 109,
			  "george": 72,
			  "joseph": 50,
			  "charles": 71,
			  "robert": 30,
			  "henry": 98,
			  "edward": 39,
			  "thomas": 48
			},
			{
			  "topic": "Design",
			  "count": 828,
			  "mary": 18,
			  "elizabeth": 6,
			  "anna": 6,
			  "helen": 2,
			  "margaret": 2,
			  "sarah": 9,
			  "emma": 11,
			  "susan": 2,
			  "clara": 11,
			  "florence": 0,
			  "james": 84,
			  "john": 160,
			  "william": 109,
			  "george": 72,
			  "joseph": 50,
			  "charles": 71,
			  "robert": 30,
			  "henry": 98,
			  "edward": 39,
			  "thomas": 48
			},
			{
			  "topic": "Society and social change",
			  "count": 213,
			  "mary": 15,
			  "elizabeth": 11,
			  "anna": 3,
			  "helen": 3,
			  "margaret": 5,
			  "sarah": 0,
			  "emma": 3,
			  "susan": 2,
			  "clara": 1,
			  "florence": 0,
			  "james": 7,
			  "john": 34,
			  "william": 18,
			  "george": 14,
			  "joseph": 10,
			  "charles": 11,
			  "robert": 5,
			  "henry": 54,
			  "edward": 4,
			  "thomas": 13
			},
			{
			  "topic": "Amusements",
			  "count": 187,
			  "mary": 25,
			  "elizabeth": 3,
			  "anna": 0,
			  "helen": 9,
			  "margaret": 2,
			  "sarah": 2,
			  "emma": 0,
			  "susan": 1,
			  "clara": 1,
			  "florence": 1,
			  "james": 8,
			  "john": 53,
			  "william": 27,
			  "george": 20,
			  "joseph": 3,
			  "charles": 8,
			  "robert": 5,
			  "henry": 15,
			  "edward": 2,
			  "thomas": 2
			},
			{
			  "topic": "Children",
			  "count": 87,
			  "mary": 22,
			  "elizabeth": 6,
			  "anna": 0,
			  "helen": 2,
			  "margaret": 2,
			  "sarah": 2,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 6,
			  "john": 8,
			  "william": 12,
			  "george": 2,
			  "joseph": 2,
			  "charles": 6,
			  "robert": 5,
			  "henry": 7,
			  "edward": 1,
			  "thomas": 4
			},
			{
			  "topic": "Music",
			  "count": 217,
			  "mary": 22,
			  "elizabeth": 3,
			  "anna": 2,
			  "helen": 7,
			  "margaret": 1,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 1,
			  "clara": 0,
			  "florence": 1,
			  "james": 3,
			  "john": 34,
			  "william": 39,
			  "george": 19,
			  "joseph": 4,
			  "charles": 13,
			  "robert": 26,
			  "henry": 26,
			  "edward": 4,
			  "thomas": 10
			},
			{
			  "topic": "Religion",
			  "count": 161,
			  "mary": 21,
			  "elizabeth": 2,
			  "anna": 1,
			  "helen": 2,
			  "margaret": 1,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 3,
			  "clara": 1,
			  "florence": 3,
			  "james": 10,
			  "john": 41,
			  "william": 15,
			  "george": 10,
			  "joseph": 16,
			  "charles": 8,
			  "robert": 5,
			  "henry": 7,
			  "edward": 1,
			  "thomas": 12
			},
			{
			  "topic": "Social reformers",
			  "count": 241,
			  "mary": 20,
			  "elizabeth": 4,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 2,
			  "sarah": 0,
			  "emma": 1,
			  "susan": 6,
			  "clara": 0,
			  "florence": 0,
			  "james": 11,
			  "john": 52,
			  "william": 54,
			  "george": 44,
			  "joseph": 4,
			  "charles": 7,
			  "robert": 4,
			  "henry": 16,
			  "edward": 4,
			  "thomas": 12
			},
			{
			  "topic": "Education",
			  "count": 397,
			  "mary": 12,
			  "elizabeth": 6,
			  "anna": 3,
			  "helen": 6,
			  "margaret": 5,
			  "sarah": 1,
			  "emma": 3,
			  "susan": 3,
			  "clara": 2,
			  "florence": 0,
			  "james": 60,
			  "john": 53,
			  "william": 47,
			  "george": 18,
			  "joseph": 18,
			  "charles": 38,
			  "robert": 26,
			  "henry": 32,
			  "edward": 27,
			  "thomas": 37
			},
			{
			  "topic": "Clothing and dress",
			  "count": 130,
			  "mary": 14,
			  "elizabeth": 5,
			  "anna": 2,
			  "helen": 2,
			  "margaret": 1,
			  "sarah": 6,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 1,
			  "james": 2,
			  "john": 24,
			  "william": 15,
			  "george": 17,
			  "joseph": 6,
			  "charles": 4,
			  "robert": 10,
			  "henry": 8,
			  "edward": 2,
			  "thomas": 11
			},
			{
			  "topic": "Communications",
			  "count": 268,
			  "mary": 15,
			  "elizabeth": 4,
			  "anna": 1,
			  "helen": 1,
			  "margaret": 4,
			  "sarah": 1,
			  "emma": 2,
			  "susan": 2,
			  "clara": 3,
			  "florence": 2,
			  "james": 28,
			  "john": 40,
			  "william": 36,
			  "george": 28,
			  "joseph": 15,
			  "charles": 20,
			  "robert": 8,
			  "henry": 37,
			  "edward": 6,
			  "thomas": 15
			},
			{
			  "topic": "Roman Catholicism",
			  "count": 32,
			  "mary": 19,
			  "elizabeth": 0,
			  "anna": 1,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 1,
			  "florence": 0,
			  "james": 1,
			  "john": 2,
			  "william": 1,
			  "george": 0,
			  "joseph": 6,
			  "charles": 1,
			  "robert": 0,
			  "henry": 0,
			  "edward": 0,
			  "thomas": 0
			},
			{
			  "topic": "Literature",
			  "count": 433,
			  "mary": 6,
			  "elizabeth": 9,
			  "anna": 4,
			  "helen": 5,
			  "margaret": 4,
			  "sarah": 0,
			  "emma": 3,
			  "susan": 3,
			  "clara": 0,
			  "florence": 1,
			  "james": 56,
			  "john": 86,
			  "william": 62,
			  "george": 30,
			  "joseph": 22,
			  "charles": 32,
			  "robert": 18,
			  "henry": 69,
			  "edward": 6,
			  "thomas": 17
			},
			{
			  "topic": "Embroidery",
			  "count": 29,
			  "mary": 11,
			  "elizabeth": 7,
			  "anna": 1,
			  "helen": 0,
			  "margaret": 2,
			  "sarah": 6,
			  "emma": 0,
			  "susan": 1,
			  "clara": 0,
			  "florence": 0,
			  "james": 0,
			  "john": 0,
			  "william": 1,
			  "george": 0,
			  "joseph": 0,
			  "charles": 0,
			  "robert": 0,
			  "henry": 0,
			  "edward": 0,
			  "thomas": 0
			},
			{
			  "topic": "Headgear",
			  "count": 373,
			  "mary": 15,
			  "elizabeth": 1,
			  "anna": 1,
			  "helen": 6,
			  "margaret": 1,
			  "sarah": 5,
			  "emma": 10,
			  "susan": 1,
			  "clara": 6,
			  "florence": 0,
			  "james": 25,
			  "john": 61,
			  "william": 58,
			  "george": 41,
			  "joseph": 16,
			  "charles": 35,
			  "robert": 22,
			  "henry": 32,
			  "edward": 20,
			  "thomas": 17
			},
			{
			  "topic": "Necklace",
			  "count": 38,
			  "mary": 13,
			  "elizabeth": 3,
			  "anna": 1,
			  "helen": 1,
			  "margaret": 2,
			  "sarah": 2,
			  "emma": 4,
			  "susan": 1,
			  "clara": 1,
			  "florence": 0,
			  "james": 1,
			  "john": 0,
			  "william": 1,
			  "george": 1,
			  "joseph": 4,
			  "charles": 1,
			  "robert": 0,
			  "henry": 2,
			  "edward": 0,
			  "thomas": 0
			},
			{
			  "topic": "Sports",
			  "count": 532,
			  "mary": 14,
			  "elizabeth": 2,
			  "anna": 0,
			  "helen": 7,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 37,
			  "john": 150,
			  "william": 94,
			  "george": 89,
			  "joseph": 11,
			  "charles": 38,
			  "robert": 23,
			  "henry": 32,
			  "edward": 18,
			  "thomas": 17
			},
			{
			  "topic": "Reformers",
			  "count": 141,
			  "mary": 6,
			  "elizabeth": 8,
			  "anna": 2,
			  "helen": 3,
			  "margaret": 4,
			  "sarah": 0,
			  "emma": 1,
			  "susan": 2,
			  "clara": 0,
			  "florence": 0,
			  "james": 4,
			  "john": 24,
			  "william": 11,
			  "george": 7,
			  "joseph": 4,
			  "charles": 7,
			  "robert": 1,
			  "henry": 46,
			  "edward": 3,
			  "thomas": 8
			},
			{
			  "topic": "Writers",
			  "count": 431,
			  "mary": 5,
			  "elizabeth": 8,
			  "anna": 3,
			  "helen": 5,
			  "margaret": 4,
			  "sarah": 0,
			  "emma": 3,
			  "susan": 2,
			  "clara": 0,
			  "florence": 0,
			  "james": 50,
			  "john": 85,
			  "william": 61,
			  "george": 33,
			  "joseph": 23,
			  "charles": 34,
			  "robert": 22,
			  "henry": 70,
			  "edward": 6,
			  "thomas": 17
			},
			{
			  "topic": "Flowers",
			  "count": 31,
			  "mary": 12,
			  "elizabeth": 2,
			  "anna": 1,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 1,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 2,
			  "john": 2,
			  "william": 2,
			  "george": 2,
			  "joseph": 1,
			  "charles": 2,
			  "robert": 0,
			  "henry": 0,
			  "edward": 2,
			  "thomas": 1
			},
			{
			  "topic": "Civil War, 1861-1865",
			  "count": 394,
			  "mary": 8,
			  "elizabeth": 1,
			  "anna": 5,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 1,
			  "clara": 0,
			  "florence": 0,
			  "james": 39,
			  "john": 98,
			  "william": 70,
			  "george": 37,
			  "joseph": 34,
			  "charles": 22,
			  "robert": 24,
			  "henry": 20,
			  "edward": 10,
			  "thomas": 23
			},
			{
			  "topic": "Theater",
			  "count": 100,
			  "mary": 12,
			  "elizabeth": 0,
			  "anna": 2,
			  "helen": 2,
			  "margaret": 3,
			  "sarah": 0,
			  "emma": 1,
			  "susan": 3,
			  "clara": 6,
			  "florence": 4,
			  "james": 2,
			  "john": 13,
			  "william": 6,
			  "george": 11,
			  "joseph": 4,
			  "charles": 7,
			  "robert": 0,
			  "henry": 16,
			  "edward": 6,
			  "thomas": 2
			},
			{
			  "topic": "First Lady of US",
			  "count": 20,
			  "mary": 11,
			  "elizabeth": 0,
			  "anna": 3,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 2,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 2,
			  "john": 0,
			  "william": 0,
			  "george": 0,
			  "joseph": 0,
			  "charles": 0,
			  "robert": 0,
			  "henry": 1,
			  "edward": 0,
			  "thomas": 0
			},
			{
			  "topic": "American Civil War (1861-1865)",
			  "count": 394,
			  "mary": 8,
			  "elizabeth": 1,
			  "anna": 5,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 1,
			  "clara": 0,
			  "florence": 0,
			  "james": 39,
			  "john": 98,
			  "william": 70,
			  "george": 37,
			  "joseph": 34,
			  "charles": 22,
			  "robert": 24,
			  "henry": 20,
			  "edward": 10,
			  "thomas": 23
			},
			{
			  "topic": "Entertainers",
			  "count": 168,
			  "mary": 10,
			  "elizabeth": 0,
			  "anna": 3,
			  "helen": 1,
			  "margaret": 2,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 1,
			  "clara": 11,
			  "florence": 0,
			  "james": 10,
			  "john": 18,
			  "william": 25,
			  "george": 27,
			  "joseph": 8,
			  "charles": 25,
			  "robert": 4,
			  "henry": 8,
			  "edward": 9,
			  "thomas": 6
			},
			{
			  "topic": "Musical instruments",
			  "count": 129,
			  "mary": 9,
			  "elizabeth": 3,
			  "anna": 1,
			  "helen": 5,
			  "margaret": 1,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 3,
			  "john": 18,
			  "william": 25,
			  "george": 14,
			  "joseph": 3,
			  "charles": 8,
			  "robert": 3,
			  "henry": 24,
			  "edward": 4,
			  "thomas": 8
			},
			{
			  "topic": "Hats",
			  "count": 336,
			  "mary": 10,
			  "elizabeth": 1,
			  "anna": 1,
			  "helen": 4,
			  "margaret": 1,
			  "sarah": 8,
			  "emma": 7,
			  "susan": 1,
			  "clara": 6,
			  "florence": 0,
			  "james": 22,
			  "john": 52,
			  "william": 56,
			  "george": 38,
			  "joseph": 14,
			  "charles": 30,
			  "robert": 22,
			  "henry": 30,
			  "edward": 18,
			  "thomas": 15
			},
			{
			  "topic": "Mourning",
			  "count": 45,
			  "mary": 2,
			  "elizabeth": 0,
			  "anna": 9,
			  "helen": 0,
			  "margaret": 1,
			  "sarah": 7,
			  "emma": 0,
			  "susan": 0,
			  "clara": 1,
			  "florence": 0,
			  "james": 0,
			  "john": 1,
			  "william": 3,
			  "george": 0,
			  "joseph": 7,
			  "charles": 6,
			  "robert": 4,
			  "henry": 2,
			  "edward": 2,
			  "thomas": 0
			},
			{
			  "topic": "Photographic format",
			  "count": 206,
			  "mary": 5,
			  "elizabeth": 4,
			  "anna": 1,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 8,
			  "emma": 0,
			  "susan": 1,
			  "clara": 0,
			  "florence": 0,
			  "james": 24,
			  "john": 35,
			  "william": 36,
			  "george": 19,
			  "joseph": 7,
			  "charles": 16,
			  "robert": 11,
			  "henry": 17,
			  "edward": 9,
			  "thomas": 13
			},
			{
			  "topic": "Judaism",
			  "count": 41,
			  "mary": 2,
			  "elizabeth": 0,
			  "anna": 8,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 7,
			  "emma": 0,
			  "susan": 0,
			  "clara": 1,
			  "florence": 0,
			  "james": 0,
			  "john": 0,
			  "william": 2,
			  "george": 0,
			  "joseph": 7,
			  "charles": 6,
			  "robert": 4,
			  "henry": 2,
			  "edward": 2,
			  "thomas": 0
			},
			{
			  "topic": "Brooch",
			  "count": 15,
			  "mary": 6,
			  "elizabeth": 3,
			  "anna": 1,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 1,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 0,
			  "john": 0,
			  "william": 1,
			  "george": 2,
			  "joseph": 0,
			  "charles": 1,
			  "robert": 0,
			  "henry": 0,
			  "edward": 0,
			  "thomas": 0
			},
			{
			  "topic": "Beauty and Hygiene Products: Make-up",
			  "count": 12,
			  "mary": 2,
			  "elizabeth": 7,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 0,
			  "john": 0,
			  "william": 1,
			  "george": 0,
			  "joseph": 0,
			  "charles": 1,
			  "robert": 0,
			  "henry": 1,
			  "edward": 0,
			  "thomas": 0
			},
			{
			  "topic": "Family",
			  "count": 62,
			  "mary": 9,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 2,
			  "margaret": 1,
			  "sarah": 10,
			  "emma": 0,
			  "susan": 1,
			  "clara": 0,
			  "florence": 0,
			  "james": 2,
			  "john": 8,
			  "william": 5,
			  "george": 3,
			  "joseph": 1,
			  "charles": 0,
			  "robert": 2,
			  "henry": 14,
			  "edward": 1,
			  "thomas": 3
			},
			{
			  "topic": "Men",
			  "count": 2703,
			  "mary": 5,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 2,
			  "margaret": 0,
			  "sarah": 1,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 289,
			  "john": 571,
			  "william": 413,
			  "george": 292,
			  "joseph": 171,
			  "charles": 228,
			  "robert": 138,
			  "henry": 285,
			  "edward": 105,
			  "thomas": 203
			},
			{
			  "topic": "Military",
			  "count": 1047,
			  "mary": 4,
			  "elizabeth": 2,
			  "anna": 1,
			  "helen": 5,
			  "margaret": 2,
			  "sarah": 1,
			  "emma": 0,
			  "susan": 2,
			  "clara": 0,
			  "florence": 0,
			  "james": 108,
			  "john": 189,
			  "william": 160,
			  "george": 212,
			  "joseph": 65,
			  "charles": 81,
			  "robert": 55,
			  "henry": 90,
			  "edward": 21,
			  "thomas": 49
			},
			{
			  "topic": "Facial Hair",
			  "count": 677,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 84,
			  "john": 142,
			  "william": 108,
			  "george": 80,
			  "joseph": 43,
			  "charles": 63,
			  "robert": 23,
			  "henry": 69,
			  "edward": 26,
			  "thomas": 38
			},
			{
			  "topic": "Law and Law Enforcement",
			  "count": 549,
			  "mary": 1,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 107,
			  "john": 124,
			  "william": 92,
			  "george": 16,
			  "joseph": 33,
			  "charles": 41,
			  "robert": 19,
			  "henry": 55,
			  "edward": 11,
			  "thomas": 50
			},
			{
			  "topic": "Legislators",
			  "count": 598,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 87,
			  "john": 137,
			  "william": 91,
			  "george": 17,
			  "joseph": 31,
			  "charles": 50,
			  "robert": 20,
			  "henry": 84,
			  "edward": 24,
			  "thomas": 57
			},
			{
			  "topic": "Lawyers",
			  "count": 477,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 96,
			  "john": 107,
			  "william": 83,
			  "george": 13,
			  "joseph": 23,
			  "charles": 36,
			  "robert": 17,
			  "henry": 51,
			  "edward": 10,
			  "thomas": 41
			},
			{
			  "topic": "Officer",
			  "count": 612,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 74,
			  "john": 103,
			  "william": 86,
			  "george": 126,
			  "joseph": 49,
			  "charles": 42,
			  "robert": 27,
			  "henry": 62,
			  "edward": 9,
			  "thomas": 33
			},
			{
			  "topic": "Mustaches",
			  "count": 469,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 54,
			  "john": 109,
			  "william": 73,
			  "george": 67,
			  "joseph": 21,
			  "charles": 32,
			  "robert": 20,
			  "henry": 45,
			  "edward": 18,
			  "thomas": 30
			},
			{
			  "topic": "Neckties",
			  "count": 508,
			  "mary": 1,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 3,
			  "florence": 0,
			  "james": 66,
			  "john": 85,
			  "william": 76,
			  "george": 39,
			  "joseph": 28,
			  "charles": 64,
			  "robert": 16,
			  "henry": 77,
			  "edward": 19,
			  "thomas": 33
			},
			{
			  "topic": "Congressmen",
			  "count": 426,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 65,
			  "john": 100,
			  "william": 58,
			  "george": 14,
			  "joseph": 28,
			  "charles": 14,
			  "robert": 11,
			  "henry": 68,
			  "edward": 22,
			  "thomas": 46
			},
			{
			  "topic": "Professional",
			  "count": 401,
			  "mary": 2,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 23,
			  "john": 124,
			  "william": 69,
			  "george": 71,
			  "joseph": 7,
			  "charles": 30,
			  "robert": 17,
			  "henry": 30,
			  "edward": 14,
			  "thomas": 14
			},
			{
			  "topic": "Beards",
			  "count": 382,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 65,
			  "john": 77,
			  "william": 67,
			  "george": 35,
			  "joseph": 20,
			  "charles": 39,
			  "robert": 14,
			  "henry": 43,
			  "edward": 9,
			  "thomas": 12
			},
			{
			  "topic": "Presidents",
			  "count": 436,
			  "mary": 2,
			  "elizabeth": 3,
			  "anna": 0,
			  "helen": 1,
			  "margaret": 3,
			  "sarah": 1,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 58,
			  "john": 88,
			  "william": 48,
			  "george": 137,
			  "joseph": 1,
			  "charles": 5,
			  "robert": 10,
			  "henry": 16,
			  "edward": 32,
			  "thomas": 31
			},
			{
			  "topic": "Senators",
			  "count": 338,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 49,
			  "john": 79,
			  "william": 49,
			  "george": 11,
			  "joseph": 2,
			  "charles": 37,
			  "robert": 14,
			  "henry": 61,
			  "edward": 19,
			  "thomas": 17
			},
			{
			  "topic": "Baseball",
			  "count": 308,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 17,
			  "john": 83,
			  "william": 52,
			  "george": 63,
			  "joseph": 10,
			  "charles": 17,
			  "robert": 17,
			  "henry": 20,
			  "edward": 17,
			  "thomas": 12
			},
			{
			  "topic": "Business and Finance",
			  "count": 277,
			  "mary": 3,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 2,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 30,
			  "john": 63,
			  "william": 43,
			  "george": 20,
			  "joseph": 15,
			  "charles": 23,
			  "robert": 13,
			  "henry": 43,
			  "edward": 9,
			  "thomas": 13
			},
			{
			  "topic": "Businessperson",
			  "count": 264,
			  "mary": 2,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 2,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 30,
			  "john": 59,
			  "william": 43,
			  "george": 19,
			  "joseph": 11,
			  "charles": 22,
			  "robert": 13,
			  "henry": 41,
			  "edward": 9,
			  "thomas": 13
			},
			{
			  "topic": "Ecology",
			  "count": 361,
			  "mary": 3,
			  "elizabeth": 0,
			  "anna": 1,
			  "helen": 1,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 1,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 33,
			  "john": 53,
			  "william": 45,
			  "george": 99,
			  "joseph": 21,
			  "charles": 17,
			  "robert": 16,
			  "henry": 33,
			  "edward": 7,
			  "thomas": 31
			},
			{
			  "topic": "Governors",
			  "count": 279,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 27,
			  "john": 55,
			  "william": 44,
			  "george": 40,
			  "joseph": 4,
			  "charles": 21,
			  "robert": 5,
			  "henry": 29,
			  "edward": 18,
			  "thomas": 36
			},
			{
			  "topic": "Diplomacy",
			  "count": 214,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 34,
			  "john": 54,
			  "william": 32,
			  "george": 6,
			  "joseph": 3,
			  "charles": 9,
			  "robert": 6,
			  "henry": 17,
			  "edward": 18,
			  "thomas": 35
			},
			{
			  "topic": "Diplomats",
			  "count": 213,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 34,
			  "john": 53,
			  "william": 32,
			  "george": 6,
			  "joseph": 3,
			  "charles": 9,
			  "robert": 6,
			  "henry": 17,
			  "edward": 18,
			  "thomas": 35
			},
			{
			  "topic": "Educators",
			  "count": 245,
			  "mary": 4,
			  "elizabeth": 2,
			  "anna": 0,
			  "helen": 3,
			  "margaret": 4,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 2,
			  "clara": 0,
			  "florence": 0,
			  "james": 50,
			  "john": 26,
			  "william": 38,
			  "george": 7,
			  "joseph": 9,
			  "charles": 31,
			  "robert": 9,
			  "henry": 28,
			  "edward": 20,
			  "thomas": 10
			},
			{
			  "topic": "Cabinet Member",
			  "count": 190,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 23,
			  "john": 58,
			  "william": 22,
			  "george": 3,
			  "joseph": 2,
			  "charles": 5,
			  "robert": 12,
			  "henry": 25,
			  "edward": 17,
			  "thomas": 23
			},
			{
			  "topic": "Union",
			  "count": 156,
			  "mary": 0,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 9,
			  "john": 47,
			  "william": 42,
			  "george": 9,
			  "joseph": 3,
			  "charles": 10,
			  "robert": 9,
			  "henry": 11,
			  "edward": 5,
			  "thomas": 11
			},
			{
			  "topic": "Occupations",
			  "count": 223,
			  "mary": 2,
			  "elizabeth": 0,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 1,
			  "james": 17,
			  "john": 43,
			  "william": 36,
			  "george": 30,
			  "joseph": 20,
			  "charles": 16,
			  "robert": 17,
			  "henry": 23,
			  "edward": 3,
			  "thomas": 15
			},
			{
			  "topic": "Home Furnishings",
			  "count": 205,
			  "mary": 5,
			  "elizabeth": 2,
			  "anna": 0,
			  "helen": 0,
			  "margaret": 3,
			  "sarah": 1,
			  "emma": 1,
			  "susan": 2,
			  "clara": 5,
			  "florence": 0,
			  "james": 24,
			  "john": 32,
			  "william": 35,
			  "george": 12,
			  "joseph": 12,
			  "charles": 15,
			  "robert": 4,
			  "henry": 38,
			  "edward": 5,
			  "thomas": 9
			},
			{
			  "topic": "Artists",
			  "count": 183,
			  "mary": 4,
			  "elizabeth": 0,
			  "anna": 1,
			  "helen": 2,
			  "margaret": 0,
			  "sarah": 0,
			  "emma": 0,
			  "susan": 0,
			  "clara": 0,
			  "florence": 0,
			  "james": 18,
			  "john": 42,
			  "william": 28,
			  "george": 16,
			  "joseph": 6,
			  "charles": 16,
			  "robert": 6,
			  "henry": 21,
			  "edward": 7,
			  "thomas": 16
			}
		  ]
		const width = 900
		const height = 300
		const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
		const spacing = 4
		const xRange = [margin.left, width - margin.right]
		const x = d3.scaleLinear().domain([0, 1]).range(xRange)
		const centerY = (height - margin.bottom + margin.top) / 2

		const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  
		const tooltip = d3.select('body').append('div').attr('class', 'tooltip');
		let topics = data;
	
		for (let d of topics) {
			let womenCount = 0;
			let womenTotal = 0;
			for (let w of W) {
				womenCount += d[w];
				womenTotal += totals[0].totals[w];
			}
			d.womenPercent = womenCount / womenTotal;
			let menCount = 0;
			let menTotal = 0;
			for (let m of M) {
				menCount += d[m];
				menTotal += totals[0].totals[m];
			}
			d.menPercent = menCount / menTotal;
			d.ratio = d.menPercent / (d.womenPercent + d.menPercent);
			d.selectedCount = womenCount + menCount;
			d.x = x(d.ratio);
			d.y = centerY;
		}

		topics.sort((a, b) => a.ratio - b.ratio);
	
		topics.sort((a, b) => a.ratio - b.ratio);
		let r = d3.scaleLinear().domain(d3.extent(data, d => d.selectedCount)).range([13, 50]);

		let node = svg.selectAll('.node')
			.data(topics, d => d.id)
			.enter()
			.append('g')
			.attr('class', 'node')
			.on('mouseover', function (e, d) {
				//console.log(d.topic, d.count);
				d3.select(this)
					.append('circle')
					.attr('class', 'hover-circle')
					.attr('r', d => r(d.selectedCount) + 3)
					.style('fill', 'none')
					.style('stroke', '#999')
					.style('stroke-width', 0.5)
					.attr('stroke-dasharray', 2);
				tooltip.transition()
					.duration(200)
					.style("opacity", 0.9);

				tooltip.html(`<div>${d.topic.toLowerCase()}</div>`)
					.style("left", (e.pageX) + "px")
					.style("top", (e.pageY + 8) + "px");
			})
			.on("mouseout", function (d) {
				d3.select('.hover-circle').remove();
				tooltip.transition()
					.duration(500)
					.style("opacity", 0);
			});
		
		// !!!!! très important
		let circle = node.append('circle')
			.attr('stroke', 'none')
			.attr('fill', d => {
			if (d.ratio < (1 / 3)) { // > 67% female, exclusively or nearly exclusively by females
				return '#5F2756';
			} else if (d.ratio < (1 / 3) + (1 / 9)) { // maj female, 56%-66% female
				return '#A83A55';
			} else if (d.ratio < (1 / 3) + (2 / 9)) { // equal 44-55%
				return '#E14B56';
			} else if (d.ratio < (2 / 3)) { // maj male 56%
				return '#F76F55';
			} else { // > 67% male, exclusively or nearly exclusively by males
				return '#F8A255';
			}
			})
			.attr('r', d => r(d.selectedCount))
			.style('opacity', 1);

		node.append("text")
			.attr("dx", -10)
			.text(d => d.topic)
			.style("font-size", d => `${d.count * 0.003 > 5? d.count * 0.003:5}`)
			.style("font-color", d => {
				return 'white';
			});

		let text = node.append('foreignObject')
			.html(d => `<div>${(d.topic).toLowerCase()}</div>`)
			.attr('class', 'topic')
			.attr('text-anchor', 'start')
			.style('font-size', d => (0.35 * r(d.selectedCount)) + 'px')
			.style('width', d => r(d.selectedCount) + 20)
			.style('-webkit-text-stroke-color', d => {
				if (d.ratio < (1 / 3)) {
					return '#5F2756';
				} else if (d.ratio < (1 / 3) + (1 / 9)) {
					return '#A83A55';
				} else if (d.ratio < (1 / 3) + (2 / 9)) {
					return '#E14B56';
				} else if (d.ratio < (2 / 3)) {
					return '#F76F55';
				} else {
					return '#F8A255';
				}
			})
		let simulation = d3.forceSimulation(data)
			.force('x', d3.forceX(d => x(d.ratio)))
			.force('y', d3.forceY(centerY))
			.force('collide', d3.forceCollide().radius(d => r(d.selectedCount) + spacing))
			.on('tick', tickActions)
			.stop();

		for (let i = 0; i < 100; ++i) simulation.tick();

		simulation.restart();
	
		function tickActions() {
			node.attr('transform', d => {
			let radius = r(d.selectedCount) + spacing;
			d.x = Math.max(xRange[0] + radius, Math.min(xRange[1] - radius, d.x));
			return `translate(${d.x}, ${d.y})`;
			})
		}
	
		return svg.node();
	}
	/////////////////////////////////////////////////
}