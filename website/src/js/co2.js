import { ENDPOINT } from './constants'
// Import our custom CSS
import '../scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import our custom CSS
import '../scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import all of Bootstrap's JS
import * as d3 from 'd3'
import { CO2Bubbles } from './charts/co2/co2Bubbles'
import { ZoomBarChart } from './charts/co2/zoomBarChart'

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
function getEmoji(score) {
	if (score <= 0.94) { 
		return '😁';
	} else if (score < 1.77) { 
		return '🙂';
	} else if (score < 3.57) { 
		return '😐';
	} else if (score < 7.2) { 
		return '☹️';
	} else {
		return '😡';
	}
}
function getEcoScore(score) {
	if (score <= 0.94) { 
		return 'a-score';
	} else if (score < 1.77) { 
		return 'b-score';
	} else if (score < 3.57) { 
		return 'c-score';
	} else if (score < 7.2) { 
		return 'd-score';
	} else {
		return 'e-score';
	}
}
export function addToDynamicInfo(group, score) {
	const container = document.getElementById("dynamic-info");
	container.innerHTML = "";
	const newH3 = document.createElement('h3');
	newH3.className = 'police'
	newH3.appendChild(document.createTextNode(`${group}: ${score} kg CO2 / kg ${getEmoji(score)}`))
	container.appendChild(newH3)
}
export function removeDynamicInfo() {
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

export function plot_bar_chart(event, name) {
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
	if (total < 1.51) return `badge slider-item ${getEcoScore(total)}`;
	else if (total < 5.1) return `badge slider-item ${getEcoScore(total)}`;
	else return `badge slider-item ${getEcoScore(total)}`
}

function loadList(container_element, food_array) {
	container_element.innerHTML = "";
	food_array.forEach(e => {
		const newDiv = document.createElement('div');
		const newFood = document.createTextNode(e.length > 25 ? `${e.slice(0, 25)} ... ${getEmoji(JSON_RAW_CO2[e]['total'])}`: e + ' ' + getEmoji(JSON_RAW_CO2[e]['total']));
		newDiv.appendChild(newFood);
		newDiv.className = getClassName(e);
		newDiv.id = e;
		newDiv.addEventListener("click", plot_bar_chart, false);
		container_element.appendChild(newDiv)
	});
}

export const plotSubs = (subgroup) =>  {
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

export const plotProducts = (subgroup) => {
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