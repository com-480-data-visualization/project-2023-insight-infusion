// Import our custom CSS
import '../scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap'
import * as d3 from 'd3'
import * as htl from 'htl'

import { ENDPOINT } from './config.js'

const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1);


const getTextColor = color => {
    const rgbColor = d3.color(color).rgb();
    const perceivedBrightness = (0.299 * rgbColor.r + 0.587 * rgbColor.g + 0.114 * rgbColor.b) / 255;
    return perceivedBrightness > 0.5 ? "black" : "white";
}

function Swatches(color, {
    columns = null,
    format,
    unknown: formatUnknown,
    swatchSize = 15,
    swatchWidth = swatchSize,
    swatchHeight = swatchSize,
    marginLeft = 0
  } = {}) {
    const id = `-swatches-${Math.random().toString(16).slice(2)}`;
    const unknown = formatUnknown == null ? undefined : color.unknown();
    const unknowns = unknown == null || unknown === d3.scaleImplicit ? [] : [unknown];
    const domain = color.domain().concat(unknowns);
    if (format === undefined) format = x => x === unknown ? formatUnknown : x;
  
    function entity(character) {
      return `&#${character.charCodeAt(0).toString()};`;
    }
  
    if (columns !== null) return htl.html`<div style="display: flex; align-items: center; margin-left: ${+marginLeft}px; min-height: 33px; font: 10px sans-serif;">
    <style>
  
  .${id}-item {
    break-inside: avoid;
    display: flex;
    align-items: center;
    padding-bottom: 1px;
  }
  
  .${id}-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - ${+swatchWidth}px - 0.5em);
  }
  
  .${id}-swatch {
    width: ${+swatchWidth}px;
    height: ${+swatchHeight}px;
    margin: 0 0.5em 0 0;
  }
  
    </style>
    <div style=${{width: "100%", columns}}>${domain.map(value => {
      const label = `${format(value)}`;
      return htl.html`<div class=${id}-item>
        <div class=${id}-swatch style=${{background: color(value)}}></div>
        <div class=${id}-label title=${label}>${label}</div>
      </div>`;
    })}
    </div>
  </div>`;
  
    return htl.html`<div style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;">
    <style>
  
  .${id} {
    display: inline-flex;
    align-items: center;
    margin-right: 1em;
  }
  
  .${id}::before {
    content: "";
    width: ${+swatchWidth}px;
    height: ${+swatchHeight}px;
    margin-right: 0.5em;
    background: var(--color);
  }
  
    </style>
    <div>${domain.map(value => htl.html`<span class="${id} swatches-label" style="--color: ${color(value)}">${format(value)}</span>`)}</div>`;
  }

function Legend(color, {
    title,
    tickSize = 6,
    width = 320, 
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    tickFormat,
    tickValues
  } = {}) {
  
    function ramp(color, n = 256) {
      const canvas = document.createElement("canvas");
      canvas.width = n;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      for (let i = 0; i < n; ++i) {
        context.fillStyle = color(i / (n - 1));
        context.fillRect(i, 0, 1, 1);
      }
      return canvas;
    }
  
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("overflow", "visible")
        .style("display", "block");
  
    let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
    let x;
  
    // Continuous
    if (color.interpolate) {
      const n = Math.min(color.domain().length, color.range().length);
  
      x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));
  
      svg.append("image")
          .attr("x", marginLeft)
          .attr("y", marginTop)
          .attr("width", width - marginLeft - marginRight)
          .attr("height", height - marginTop - marginBottom)
          .attr("preserveAspectRatio", "none")
          .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
    }
  
    // Sequential
    else if (color.interpolator) {
      x = Object.assign(color.copy()
          .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
          {range() { return [marginLeft, width - marginRight]; }});
  
      svg.append("image")
          .attr("x", marginLeft)
          .attr("y", marginTop)
          .attr("width", width - marginLeft - marginRight)
          .attr("height", height - marginTop - marginBottom)
          .attr("preserveAspectRatio", "none")
          .attr("xlink:href", ramp(color.interpolator()).toDataURL());
  
      // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
      if (!x.ticks) {
        if (tickValues === undefined) {
          const n = Math.round(ticks + 1);
          tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
        }
        if (typeof tickFormat !== "function") {
          tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
        }
      }
    }
  
    // Threshold
    else if (color.invertExtent) {
      const thresholds
          = color.thresholds ? color.thresholds() // scaleQuantize
          : color.quantiles ? color.quantiles() // scaleQuantile
          : color.domain(); // scaleThreshold
  
      const thresholdFormat
          = tickFormat === undefined ? d => d
          : typeof tickFormat === "string" ? d3.format(tickFormat)
          : tickFormat;
  
      x = d3.scaleLinear()
          .domain([-1, color.range().length - 1])
          .rangeRound([marginLeft, width - marginRight]);
  
      svg.append("g")
        .selectAll("rect")
        .data(color.range())
        .join("rect")
          .attr("x", (d, i) => x(i - 1))
          .attr("y", marginTop)
          .attr("width", (d, i) => x(i) - x(i - 1))
          .attr("height", height - marginTop - marginBottom)
          .attr("fill", d => d);
  
      tickValues = d3.range(thresholds.length);
      tickFormat = i => thresholdFormat(thresholds[i], i);
    }
  
    // Ordinal
    else {
      x = d3.scaleBand()
          .domain(color.domain())
          .rangeRound([marginLeft, width - marginRight]);
  
      svg.append("g")
        .selectAll("rect")
        .data(color.domain())
        .join("rect")
          .attr("x", x)
          .attr("y", marginTop)
          .attr("width", Math.max(0, x.bandwidth() - 1))
          .attr("height", height - marginTop - marginBottom)
          .attr("fill", color);
  
      tickAdjust = () => {};
    }
  
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x)
          .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
          .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
          .tickSize(tickSize)
          .tickValues(tickValues))
        .call(tickAdjust)
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
          .attr("x", marginLeft)
          .attr("y", marginTop + marginBottom - height - 6)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .attr("class", "title chart-label")
          .text(title));
  
    return svg.node();
}

const additivesBubbleChart = async (parentWidth) => {
    const data = await d3.json(`${ENDPOINT}/additives/bubble_chart_additives.json`);
    const marginTop = 0;
    const marginRight = 0;
    const marginBottom = 0;
    const marginLeft = 0;
    const widthReductionFactor = 1.3;
    const width = parentWidth * widthReductionFactor;
    const height = 600;

    const getLabelLong = d => d.additive
    const getLabel = d => getLabelLong(d).split('-')[0].trim()
    const getCount = d => d.count
    const getDangerosity = d => d.dangerosity

    const color = d3.scaleSequential(d3.extent(data, getDangerosity), d3.interpolateOrRd);

    const svg = d3.create('svg')
        .attr('viewBox', [0, 0, width + marginLeft + marginRight, height + marginTop + marginBottom]);

    const wrapper = svg.append('g')
        .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    const helper = wrapper.append('text')
        .attr('x', 200)
        .attr('y', 15)
        .attr('class', 'chart-label')
        .text('')

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, getCount))
        .range([20, 50])

    const t = d3.scaleSqrt()
        .domain(d3.extent(data, getCount))
        .range([10, 18])

    const force = d3.forceSimulation(data)
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(0))
        .force('collision', d3.forceCollide().radius(d => r(getCount(d))))

    const bubbles = wrapper.selectAll(".bubble")
        .data(data)
        .enter()
        .append("g")
            .attr("class", "bubble");

    bubbles.append("circle")
        .attr("r", d => r(getCount(d)))
        .attr("fill", d => color(getDangerosity(d)))

    bubbles.append("text")
        .text(getLabel)
        .style('fill', d => getTextColor(color(getDangerosity(d))))
        .attr('font-size', d => `${t(getCount(d))}px`)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "middle");

    bubbles.on('mouseover', (e, d) => helper.text(`${getLabelLong(d)}`))
    bubbles.on('mouseleave', () => helper.text(''))

    force.on('tick', () => {
        bubbles
            .transition()
            .ease(d3.easeLinear)
            .attr("transform", d => `translate(${d.x},${d.y})`);
    })

    const legend = Swatches(d3.scaleOrdinal([0, 1, 2, 3].map(d => `Dangerosity ${d}`), d3.schemeOrRd[4]), {
        marginLeft: 180
    })
    return {svg: svg.node(), legend, legendPosition: 'bottom'}
}

const additivesBubbleChart2 = async (parentWidth) => {
    const data = await d3.json(`${ENDPOINT}/additives/bubble_chart_repartition.json`)

    const getDangerosity = d => d.dangerosity
    const getAdditive = d => d.additive
    const getCount = d => d.count


    const margin = ({top: 0, right: 200, left: 200, bottom: 0})
    const width = parentWidth;
    const innerWidth = width - margin.left - margin.right
    const height = 300;

    const svg = d3.create('svg')
        .attr('viewBox', [0, 0, width, height + margin.top + margin.bottom]);

    const wrapper = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, getDangerosity))
        .range([0, innerWidth])

    const y = d3.scaleBand()
        .domain(['All'])
        .range([height - margin.top - margin.bottom, 0]);

    wrapper.append('g').append('text')
        .attr('x', innerWidth)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('class', 'chart-label')
        .style('font-size', '10px')
        .text('Average dangerosity →')

    const helper = wrapper.append('text')
        .attr('x', innerWidth)
        .attr('y', 35)
        .attr('font-weight', 'bold')
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .text('')

    const color = d3.scaleSequential([-0.25, d3.extent(data, d => d.dangerosity)[1]], d3.interpolateOrRd);

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, d => getCount(d)))
        .range([5, 20])

    const force = d3.forceSimulation(data)
        .force('charge', d3.forceManyBody().strength(0))
        .force('x', d3.forceX().x(d => x(getDangerosity(d))))
        .force('y', d3.forceY(d => (height - margin.top - margin.bottom) / 2))
        .force('collision', d3.forceCollide().radius(d => r(getCount(d)) + 1))

    const circles = wrapper.append('g')
        .attr('className', 'circles')
        .selectAll('circle')
        .data(data)
        .join('circle')
            .attr('r', d => r(getCount(d)))
            .attr('fill', d => color(getDangerosity(d)))
            .attr('x', d => x(getDangerosity(d)))
            .attr('y', d => y.bandwidth() / 2)
            .on('mouseover', (e, d) => {
                helper.transition()
                    .ease(d3.easeBack)
                    .duration(1000)
                    .text(capitalize(getAdditive(d)))
            })

    force.on('tick', () => {
        circles
            .transition()
            .ease(d3.easeLinear)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    })

    const legend = Swatches(d3.scaleOrdinal([0, 1, 2, 3].map(d => `Dangerosity ${d}`), d3.schemeOrRd[4]))
    return {svg: svg.node(), legend, legendPosition: 'bottom'}
}


const additivesFoodCategoryBubbleGraph2 = async (parentWidth) => {
    const data = await d3.json(`${ENDPOINT}/additives/bubble_chart_categories.json`)

    const getDangerosity = d => d.dangerosity
    const getCategory = d => d.categories
    const getCount = d => d.count

    const margin = ({top: 0, right: 0, left: 0, bottom: 0})
    const width = parentWidth;
    const innerWidth = width - margin.left - margin.right
    const noSplitHeight = 400;
    const height = noSplitHeight;

    const svg = d3.create('svg')
        .attr('viewBox', [0, 0, width, noSplitHeight + margin.top + margin.bottom]);

    const wrapper = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, getDangerosity))
        .range([0, innerWidth])

    const y = d3.scaleBand()
        .domain(['All'])
        .range([height - margin.top - margin.bottom, 0]);

    wrapper.append('g').append('text')
        .attr('x', innerWidth)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('class', 'chart-label')
        .style('font-size', '10px')
        .text('Average dangerosity →')

    const helper = wrapper.append('text')
        .attr('x', innerWidth)
        .attr('y', 35)
        .attr('font-weight', 'bold')
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .text('')

    const color = d3.scaleSequential([-0.25, d3.extent(data, d => d.dangerosity)[1]], d3.interpolateOrRd);

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, getCount))
        .range([5, 20])

    const force = d3.forceSimulation(data)
        .force('charge', d3.forceManyBody().strength(0))
        .force('x', d3.forceX().x(d => x(getDangerosity(d))))
        .force('y', d3.forceY(d => (noSplitHeight - margin.top - margin.bottom) / 2))
        .force('collision', d3.forceCollide().radius(d => r(getCount(d)) + 1))

    const circles = wrapper.append('g')
        .attr('className', 'circles')
        .selectAll('circle')
        .data(data)
        .join('circle')
            .attr('r', d => r(getCount(d)))
            .attr('fill', d => color(getDangerosity(d)))
            .attr('x', d => x(getDangerosity(d)))
            .attr('y', d => y.bandwidth() / 2)
            .on('mouseover', (e, d) => {
                helper.transition()
                    .ease(d3.easeBack)
                    .duration(1000)
                    .text(capitalize(getCategory(d)))
            })

    force.on('tick', () => {
        circles
            .transition()
            .ease(d3.easeLinear)
            .attr('cx', d => {
                const radius = r(getCount(d))
                d.x = Math.max(radius, Math.min(width - radius, d.x))
                return d.x
            })
            .attr('cy', d => {
                const radius = r(getCount(d))
                d.y = Math.max(radius, Math.min(height - radius, d.y))
                return d.y
            })
    })

    const legend = Swatches(d3.scaleOrdinal([0, 1, 2, 3].map(d => `Dangerosity ${d}`), d3.schemeOrRd[4]))
    return {svg: svg.node(), legend, legendPosition: 'bottom'}
}

const vegetarianVeganAdditivesCountBarChart = async () => {
    const marginTop = 40
    const marginRight = 30
    const marginBottom = 30
    const marginLeft = 110
    const width = 600
    const height = 250
    const xPadding = 0.1
    const xLabel = "Average number of additives per product →"

    const data = await d3.json(`${ENDPOINT}/additives/vegetarian_vegan_additives_count.json`)

    const xRange = [marginLeft, width - marginRight]

    const X = d3.map(data, d => d.average_additives_count)
    const Y = d3.map(data, d => d.label)

    const color = d3.scaleSequential([-0.5, d3.max(X)], d3.interpolateOrRd);

    const xDomain = [0, d3.max(X)];
    const yDomain = new d3.InternSet(Y)

    const I = d3.range(X.length).filter(i => yDomain.has(Y[i]));

    const yRange = [marginTop, height - marginBottom];

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleBand(yDomain, yRange).padding(xPadding);

    const xAxis = d3.axisTop(xScale).ticks(width / 80);
    const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", height - marginTop - marginBottom)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", -22)
            .attr("fill", "black")
            .attr("text-anchor", "end")
            .attr('class', 'chart-label')
            .text(xLabel));

    svg.append("g")
        .selectAll("rect")
        .data(I)
        .join("rect")
        .attr("fill", (d, i) => color(X[i]))
        .attr("x", xScale(0))
        .attr("y", i => yScale(Y[i]))
        .attr("width", i => xScale(X[i]) - xScale(0))
        .attr("height", yScale.bandwidth());

    svg.append("g")
        .attr("fill", 'white')
        .attr("text-anchor", "end")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll("text")
        .data(I)
        .join("text")
        .attr("x", i => xScale(X[i]))
        .attr("y", i => yScale(Y[i]) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .text(i => `${Math.round((X[i] + Number.EPSILON) * 100) / 100}`)
        .call(text => text.filter(i => xScale(X[i]) - xScale(0) < 20) // short bars
            .attr("dx", +4)
            .attr("fill", 'blue')
            .attr("text-anchor", "start"));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").remove())

    const legend = Legend(d3.scaleSequential(d3.extent(data, d => d.average_additives_count), d3.interpolateOrRd), {
        title: "Count →",
    })

    return {svg: svg.node(), legend, legendPosition: 'bottom'}

}

const vegetarianVeganAverageHazardsBarChart = async () => {
    const marginTop = 40
    const marginRight = 30
    const marginBottom = 30
    const marginLeft = 110
    const width = 600
    const height = 250
    const xPadding = 0.1
    const xLabel = "Average dangerosity per product →"

    const data = await d3.json(`${ENDPOINT}/additives/vegetarian_vegan_average_hazards.json`)

    const xRange = [marginLeft, width - marginRight]

    const X = d3.map(data, d => d.average_hazard)
    const Y = d3.map(data, d => d.label)

    const color = d3.scaleSequential([-0.5, d3.max(X)], d3.interpolateOrRd);

    const xDomain = [0, d3.max(X)];
    const yDomain = new d3.InternSet(Y)

    const I = d3.range(X.length).filter(i => yDomain.has(Y[i]));

    const yRange = [marginTop, height - marginBottom];

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleBand(yDomain, yRange).padding(xPadding);

    const xAxis = d3.axisTop(xScale).ticks(width / 80);
    const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", height - marginTop - marginBottom)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", -22)
            .attr("fill", "black")
            .attr("text-anchor", "end")
            .attr('class', 'chart-label')
            .text(xLabel));

    svg.append("g")
        .selectAll("rect")
        .data(I)
        .join("rect")
        .attr("fill", (d, i) => color(X[i]))
        .attr("x", xScale(0))
        .attr("y", i => yScale(Y[i]))
        .attr("width", i => xScale(X[i]) - xScale(0))
        .attr("height", yScale.bandwidth());

    svg.append("g")
        .attr("fill", 'white')
        .attr("text-anchor", "end")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll("text")
        .data(I)
        .join("text")
        .attr("x", i => xScale(X[i]))
        .attr("y", i => yScale(Y[i]) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .text(i => `${Math.round((X[i] + Number.EPSILON) * 100) / 100}`)
        .call(text => text.filter(i => xScale(X[i]) - xScale(0) < 20) // short bars
            .attr("dx", +4)
            .attr("fill", 'blue')
            .attr("text-anchor", "start"));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").remove())

    const legend = Legend(d3.scaleSequential(d3.extent(data, d => d.average_hazard), d3.interpolateOrRd), {
        title: "Dangerosity →",
    })
    return {svg: svg.node(), legend, legendPosition: 'bottom'}

}

const nutriscoreStackedBarChart = async (parentWidth) => {
    const rawData = await d3.json(`${ENDPOINT}/additives/nutriscore_stacked_bar_chart.json`);

    const levels = [0, 1, 2, 3]
    const data = levels.flatMap(level => rawData.map(d => ({
        nutriscore_fr: d.nutriscore_fr,
        additives_count: d[`additives_${level}_count`],
        hazard: level,
    })));

    const colors = d3.schemeOrRd[levels.length]

    const width = parentWidth;
    const height = 300;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 20;
    const marginLeft= 50;

    const getX = d => d.nutriscore_fr
    const getY = d => d.additives_count
    const getZ = d => d.hazard

    const X = d3.map(data, getX)
    const Y = d3.map(data, getY)
    const Z = d3.map(data, getZ)

    const xDomain = new d3.InternSet(X);
    const zDomain = new d3.InternSet(Z);

    const xRange = [marginLeft, width - marginRight];

    const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]));

    const series = d3.stack()
        .keys(zDomain)
        .value(([x, I], z) => Y[I.get(z)])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetDiverging)
        (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
        .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})));

    const yDomain = d3.extent(series.flat(2));

    const xPadding = 0.1;
    
    const yRange = [height - marginBottom, marginTop];

    const xScale = d3.scaleBand(xDomain, xRange).paddingInner(xPadding);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const color = d3.scaleOrdinal(zDomain, colors);
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 60);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .attr('class', 'chart-label')
            .text("↑ Additives count"));

    const bar = svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", ([{i}]) => color(Z[i]))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", ({i}) => xScale(X[i]))
        .attr("y", ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
        .attr("height", ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
        .attr("width", xScale.bandwidth());

    svg.on('mousemove', (e, d) => {
        const x = e.offsetX
        const y = e.offsetY
        console.log(x,y)
        if (y < marginTop || y > height + marginTop || x > width + marginLeft || x < marginLeft) return
        console.log(x, y)

        svg.select('#custom-line-test').remove()

        svg.append("line")
        .attr('id', 'custom-line-test')
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", width)
        .attr("y2", y)
        .style('stroke-dasharray', 10)
        .style("stroke-width", 2)
        .style("stroke", "rgba(0, 0, 0, 0.2)")
        .style("fill", "none");
    })

    svg.on('mouseleave', () => svg.select('#custom-line-test').remove())

    svg.append("g")
        .attr("transform", `translate(0,${yScale(0)})`)
        .call(xAxis);

    const legend = Swatches(d3.scaleOrdinal(Z.map(d => `Dangerosity ${d}`), colors))

    return {svg: svg.node(), legend, legendPosition: 'top'}
}

const novaStackedBarChart = async (parentWidth) => {
    const rawData = await d3.json(`${ENDPOINT}/additives/nova_stacked_bar_chart.json`);

    const levels = [0, 1, 2, 3]
    const data = levels.flatMap(level => rawData.map(d => ({
        nova_group: d.nova_group,
        additives_count: d[`additives_${level}_count`],
        hazard: level,
    })));

    const colors = d3.schemeOrRd[levels.length]

    const width = parentWidth;
    const height = 400;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 20;
    const marginLeft= 50;

    const getX = d => d.nova_group
    const getY = d => d.additives_count
    const getZ = d => d.hazard

    const X = d3.map(data, getX)
    const Y = d3.map(data, getY)
    const Z = d3.map(data, getZ)

    const xDomain = new d3.InternSet(X);
    const zDomain = new d3.InternSet(Z);

    const xRange = [marginLeft, width - marginRight];

    const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]));

    const series = d3.stack()
        .keys(zDomain)
        .value(([x, I], z) => Y[I.get(z)])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetDiverging)
        (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
        .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})));

    const yDomain = d3.extent(series.flat(2));

    const xPadding = 0.1;
    
    const yRange = [height - marginBottom, marginTop];

    const xScale = d3.scaleBand(xDomain, xRange).paddingInner(xPadding);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const color = d3.scaleOrdinal(zDomain, colors);
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 60);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .attr('class', 'chart-label')
            .text("↑ Additives count"));

    const bar = svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", ([{i}]) => color(Z[i]))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", ({i}) => xScale(X[i]))
        .attr("y", ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
        .attr("height", ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
        .attr("width", xScale.bandwidth());

    svg.on('mousemove', (e, d) => {
        const x = e.offsetX
        const y = e.offsetY
        console.log(x,y)
        if (y < marginTop || y > height + marginTop || x > width + marginLeft || x < marginLeft) return
        console.log(x, y)

        svg.select('#custom-line-test').remove()

        svg.append("line")
        .attr('id', 'custom-line-test')
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", width)
        .attr("y2", y)
        .style('stroke-dasharray', 10)
        .style("stroke-width", 2)
        .style("stroke", "rgba(0, 0, 0, 0.2)")
        .style("fill", "none");
    })

    svg.on('mouseleave', () => svg.select('#custom-line-test').remove())

    svg.append("g")
        .attr("transform", `translate(0,${yScale(0)})`)
        .call(xAxis);

    const legend = Swatches(d3.scaleOrdinal(Z.map(d => `Dangerosity ${d}`), colors))

    return {svg: svg.node(), legend, legendPosition: 'top'}
}

const addChart = async (parentSelector, chartGenerator) => {
    const parent = document.querySelector(parentSelector);
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    const chart = await chartGenerator(width);
    if ('legend' in chart) {
        if (chart.legendPosition === 'bottom') {
            parent.appendChild(chart.svg)
            parent.appendChild(chart.legend)
        } else {
            parent.appendChild(chart.legend)
            parent.appendChild(chart.svg)
        }
    }
    else {
        parent.appendChild(chart.svg)
    }
}

addChart('#g-additives-bubble-chart', additivesBubbleChart)
addChart('#g-additives-bubble-chart-2', additivesBubbleChart2)
addChart('#g-additives-food-category-bubble-chart', additivesFoodCategoryBubbleGraph2)
addChart('#g-nutriscore-stacked-bar-chart', nutriscoreStackedBarChart)
addChart('#g-vegetarian-vegan-additives-count-bar-chart', vegetarianVeganAdditivesCountBarChart)
addChart('#g-vegetarian-vegan-average-hazards-bar-chart', vegetarianVeganAverageHazardsBarChart)
addChart('#g-nova-stacked-bar-chart', novaStackedBarChart)