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
import { getTextColor } from './utilities'

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

const A_THRESHOLD = 0.94
const B_THRESHOLD = 1.77
const C_THRESHOLD = 3.57
const D_THRESHOLD = 7.2

const margin = ({ top: 25, right: 40, bottom: 35, left: 40 });
const xRange = [margin.left, 900 - margin.right]
const centerY = (375 - margin.bottom + margin.top) / 2

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
	const flightKg = 946
	const personKg = 600
	const ratio = (product / flightKg) * 100

	const color = d3.scaleSequential([800, 300], d3.interpolateRdYlGn)


	firstPB.innerHTML = `<div class="progress-bar" role="progressbar" style="color:${getTextColor(color(product))};background-color: ${color(product)};width: ${ratio}%;" aria-valuenow="${ratio}" aria-valuemin="0" aria-valuemax="100">${Math.round(product)} kg</div>`
	secondPB.innerHTML = `<div class="progress-bar" role="progressbar" style="color:${getTextColor(color(personKg))};background-color: ${color(personKg)};width: 60%;" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">600 kg</div>`
	thirdPB.innerHTML = `<div class="progress-bar" role="progressbar" style="background-color: ${color(flightKg)};width: 100%;" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">946 kg</div>`
	if (product > flightKg) {
		firstPB.innerHTML = `<div class="progress-bar" role="progressbar" style="color:${getTextColor(color(product))};background-color: ${color(product)};width: ${100}%;" aria-valuenow="${100}" aria-valuemin="0" aria-valuemax="100">${Math.round(product)} kg</div>`
		secondPB.innerHTML = `<div class="progress-bar" role="progressbar" style="color:${getTextColor(color(personKg))};background-color: ${color(personKg)};width: ${(personKg / product) * 100}%;" aria-valuenow="${(personKg / product) * 100}" aria-valuemin="0" aria-valuemax="100">600 kg</div>`
		thirdPB.innerHTML = `<div class="progress-bar" role="progressbar" style="background-color: ${color(flightKg)};width: ${(flightKg / product) * 100}%;" aria-valuenow="${(flightKg / product) * 100}" aria-valuemin="0" aria-valuemax="100">946 kg</div>`
	}
}
function getEmoji(score) {
	if (score <= A_THRESHOLD) { 
		return '😁';
	} else if (score < B_THRESHOLD) { 
		return '🙂';
	} else if (score < C_THRESHOLD) { 
		return '😐';
	} else if (score < D_THRESHOLD) { 
		return '☹️';
	} else {
		return '😡';
	}
}
function getEcoScore(score) {
	if (score <= A_THRESHOLD) { 
		return 'a-score';
	} else if (score < B_THRESHOLD) { 
		return 'b-score';
	} else if (score < C_THRESHOLD) { 
		return 'c-score';
	} else if (score < D_THRESHOLD) { 
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
	const x = d3.scaleLinear().domain([0, 13]).range(xRange)
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
	const x = d3.scaleLinear().domain([0, 25]).range(xRange)
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
	updateProgressBars(itemInfo['total'], 35.4)
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
	const green_limit = 1.51
	const yellow_limit = 5.1
	if (total < green_limit) return `badge slider-item ${getEcoScore(total)}`;
	else if (total < yellow_limit) return `badge slider-item ${getEcoScore(total)}`;
	else return `badge slider-item ${getEcoScore(total)}`
}

function loadList(container_element, food_array) {
	container_element.innerHTML = "";
	food_array.forEach(e => {
		const newDiv = document.createElement('div');
		const score = JSON_RAW_CO2[e]['total']
		const newFood = document.createTextNode(e.length > 25 ? `${e.slice(0, 25)} ... ${getEmoji(score)}`: e + ' ' + getEmoji(score));
		newDiv.appendChild(newFood);
		newDiv.className = getClassName(e);
		const color = d3.scaleSequential([7, 0], d3.interpolateRdYlGn)
		newDiv.style = `background-color:${color(score)};color:${getTextColor(color(score))}`
		newDiv.id = e;
		newDiv.addEventListener("click", plot_bar_chart, false);
		container_element.appendChild(newDiv)
	});
}

export const plotSubs = (subgroup) =>  {
	const x = d3.scaleLinear().domain([0, 25]).range(xRange)
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
	const x = d3.scaleLinear().domain([0, 53]).range(xRange)
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