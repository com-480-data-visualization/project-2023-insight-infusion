import { ENDPOINT } from './constants'
import * as d3 from 'd3'

const assets = ressource => `${ENDPOINT}/${ressource}`
export const json = async ressource => await fetch(assets(ressource), {
    method: 'GET',
    mode: 'same-origin'
}).then(async response => await response.json())

export const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1);

export const getColorScale = (domain, discrete) => {
    if(discrete) return d3.scaleQuantize().domain(domain).range(d3.schemeOrRd[d3.max(domain) - d3.min(domain) + 1])
    else return d3.scaleSequential(domain, d3.interpolateOrRd)
}

export const getLegendScale = (domain, discrete) => {
   if(discrete) return d3.scaleOrdinal(domain, d3.schemeOrRd[domain.length])
   else return d3.scaleSequential(domain, d3.interpolateOrRd)
}

export const getTextColor = color => {
    const rgbColor = d3.color(color).rgb();
    const perceivedBrightness = (0.299 * rgbColor.r + 0.587 * rgbColor.g + 0.114 * rgbColor.b) / 255;
    return perceivedBrightness > 0.5 ? "black" : "white";
}

export const isElementLoaded = async selector => {
    while (document.querySelector(selector) === null)
        await new Promise(resolve => requestAnimationFrame(resolve))
    return document.querySelector(selector);
}

export const addChart = async (parentSelector, chartGenerator) => {
    const parent = await isElementLoaded(parentSelector);
    const width = parent.getBoundingClientRect().width
    const chart = await chartGenerator(width) 
    if ('legend' in chart) {
        if (chart.legendPosition === 'bottom') {
            parent.appendChild(chart.svg)
            parent.appendChild(chart.legend)
        } else {
            parent.appendChild(chart.legend)
            parent.appendChild(chart.svg)
        }
    }
    else parent.appendChild(chart.svg)
}

export const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
}
