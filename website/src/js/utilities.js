import { ENDPOINT } from './constants'
import * as d3 from 'd3'

const assets = ressource => `${ENDPOINT}/${ressource}`
export const json = async ressource => await d3.json(assets(ressource))

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

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export const mixColor = (a, b, amountA, amountB) => {
    const hexComponents = (hex) => /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

    const ah = hexComponents(a)
    const bh = hexComponents(b)

    // combine color values and saturate
    const ar = parseInt(ah[1], 16) * amountA + parseInt(bh[1], 16) * (1 - amountB)
    const ag = parseInt(ah[2], 16) * amountA + parseInt(bh[2], 16) * (1 - amountB)
    const ab = parseInt(ah[3], 16) * amountA + parseInt(bh[3], 16) * (1 - amountB)

    // saturate to FF
    const rr = Math.min(Math.round(ar), 255)
    const rg = Math.min(Math.round(ag), 255)
    const rb = Math.min(Math.round(ab), 255)

    // combina again to hex string
    return rgbToHex(rr, rg, rb)
}

export const lerpColor = (a, b, amount) => { 

    var ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);

    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}