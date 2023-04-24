function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

let JSON_RAW_CO2 = {}

whenDocumentLoaded(() => {
	fetch('./raw_CO2.json')
		.then((response) => response.json())
		.then((raw_CO2) => {
			JSON_RAW_CO2 = raw_CO2;
			const foodList = Object.keys(raw_CO2).sort((a, b) => 0.5 - Math.random());
			container = document.getElementById('slider-container');
			loadList(container, foodList)
			// we plot the first chart so there is something
			plot_donut_chart(undefined, foodList[0])
		})
});

function CO2ToData(itemInfo) {
	const data = []
	Object.keys(itemInfo).forEach((key) => {
		if (key !== 'total') 
			data.push({name: key, value: itemInfo[key]})
	});
	return data;
}

function plot_donut_chart(event, name) {
	const id = event ? event.target.id: name;
	const itemInfo = JSON_RAW_CO2[id]
	data = CO2ToData(itemInfo)
	const  container = document.getElementById('pie-chart');
	container.innerHTML = "";

	title = document.createElement('h2');
	title.appendChild(document.createTextNode(`${id}`));
	container.appendChild(title);

	const BarChart = new ZoomBarChart(data, itemInfo);
	const svg = BarChart.chart();
	container.appendChild(svg) 
	/*child = DonutChart(data, {
		name: d => d.name,
		value: d => d.value,
	})
	container.appendChild(child)*/

	const facts = document.createElement('h3');
	facts.appendChild(document.createTextNode(`Total: ${itemInfo['total']} Kg CO2/Kg`));
	container.appendChild(facts);
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
		newDiv.addEventListener("click", plot_donut_chart, false);
		container_element.appendChild(newDiv)
	});
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/donut-chart
function DonutChart(data, {
	name = ([x]) => x,  // given d in data, returns the (ordinal) label
	value = ([, y]) => y, // given d in data, returns the (quantitative) value
	title, // given d in data, returns the title text
	width = 640, // outer width, in pixels
	height = 400, // outer height, in pixels
	innerRadius = Math.min(width, height) / 3, // inner radius of pie, in pixels (non-zero for donut)
	outerRadius = Math.min(width, height) / 2, // outer radius of pie, in pixels
	labelRadius = (innerRadius + outerRadius) / 2, // center radius of labels
	format = ",", // a format specifier for values (in the label)
	names, // array of names (the domain of the color scale)
	colors, // array of colors for names
	stroke = innerRadius > 0 ? "none" : "white", // stroke separating widths
	strokeWidth = 1, // width of stroke separating wedges
	strokeLinejoin = "round", // line join of stroke separating wedges
	padAngle = stroke === "none" ? 1 / outerRadius : 0, // angular separation between wedges
  } = {}) {
	// Compute values.
	const N = d3.map(data, name);
	const V = d3.map(data, value);
	const I = d3.range(N.length).filter(i => !isNaN(V[i]));
  
	// Unique the names.
	if (names === undefined) names = N;
	names = new d3.InternSet(names);
  
	// Chose a default color scheme based on cardinality.
	if (colors === undefined) colors = d3.schemeSpectral[names.size];
	if (colors === undefined) colors = d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), names.size);
  
	// Construct scales.
	const color = d3.scaleOrdinal(names, colors);
  
	// Compute titles.
	if (title === undefined) {
	  const formatValue = d3.format(format);
	  title = i => `${N[i]}\n${formatValue(V[i])}`;
	} else {
	  const O = d3.map(data, d => d);
	  const T = title;
	  title = i => T(O[i], i, data);
	}
  
	// Construct arcs.
	const arcs = d3.pie().padAngle(padAngle).sort(null).value(i => V[i])(I);
	const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
	const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);
	
	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [-width / 2, -height / 2, width, height])
		.attr("style", "max-width: 100%; height: auto; height: intrinsic;");
  
	svg.append("g")
		.attr("stroke", stroke)
		.attr("stroke-width", strokeWidth)
		.attr("stroke-linejoin", strokeLinejoin)
	  .selectAll("path")
	  .data(arcs)
	  .join("path")
		.attr("fill", d => color(N[d.data]))
		.attr("d", arc)
	  .append("title")
		.text(d => title(d.data));
  
	svg.append("g")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10)
		.attr("text-anchor", "middle")
	  .selectAll("text")
	  .data(arcs)
	  .join("text")
		.attr("transform", d => `translate(${arcLabel.centroid(d)})`)
	  .selectAll("tspan")
	  .data(d => {
		const lines = `${title(d.data)}`.split(/\n/);
		return (d.endAngle - d.startAngle) > 0.25 ? lines : lines.slice(0, 1);
	  })
	  .join("tspan")
		.attr("x", 0)
		.attr("y", (_, i) => `${i * 1.1}em`)
		.attr("font-weight", (_, i) => i ? null : "bold")
		.text(d => d);
  
	return Object.assign(svg.node(), {scales: {color}});
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
		const names = data.map(x => x.name);
		// const colors = d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), names.size);
		// const color = d3.scaleOrdinal(names, colors);
		// const N = d3.map(data, x => x.name);

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
				if (data[d.name] < 0.3) return 'green';
				else if (data[d.name] < 1) return 'orange';
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
