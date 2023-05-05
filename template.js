import * as CONFIG from './js/config.js'
import * as d3 from 'd3'

const getURL = asset => `${CONFIG.ENDPOINT}/${asset}`

const isElementLoaded = async selector => {
    while (document.querySelector(selector) === null)
        await new Promise(resolve => requestAnimationFrame(resolve))
    return document.querySelector(selector);
}

const createChartExample = async (args) => {
    const data = await d3.json(getURL('subdirectory/data.json'))
    const svg = d3.create('svg')
    // Chart creation
    return svg.node()
}

const appendChartExample = async (selector, chartFunction) => {
    const parent = await isElementLoaded(selector)
    const chart = chartFunction()
    parent.appendChild(chart);
}

appendChartExample('#my-chart-div', createChartExample)
