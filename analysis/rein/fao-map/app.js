
// config
const food_color = "#EDAA51";
const feed_color = "#87C0BF";

// different country naming between the data
const nameMapping = {
  "Russia": "Russian Federation",
  "Antarctica": null,
  "French Southern and Antarctic Lands": null,
  "Burundi": "Burundi",
  "Bhutan": "Bhutan",
  "China": "China, mainland",
  "Republic of the Congo": "Congo",
  "Northern Cyprus": null,
  "Eritrea": "Eritrea",
  "Falkland Islands": null,
  "England": "United Kingdom",
  "Equatorial Guinea": "Equatorial Guinea",
  "Greenland": null,
  "Iran": "Iran (Islamic Republic of)",
  "South Korea": "Republic of Korea",
  "Kosovo": null,
  "Libya": null,
  "Moldova": "Republic of Moldova",
  "Macedonia": "The former Yugoslav Republic of Macedonia",
  "Papua New Guinea": null,
  "Puerto Rico": null,
  "North Korea": "Democratic People's Republic of Korea",
  "Qatar": null,
  "Western Sahara": null,
  "South Sudan": null,
  "Somaliland": null,
  "Somalia": "Somalia",
  "Syria": null,
  "Taiwan": "China, Taiwan Province of",
  "USA": "United States of America",
  "Venezuela": "Venezuela (Bolivarian Republic of)",
  "Vietnam": "Viet Nam",
  "West Bank": null
};

// Load GeoJSON data for the world map
d3.json(
  "./world.geojson"
).then((geoData) => {
  // Load the FAO dataset (replace with the actual file path)
  d3.csv("./datasets/FAO.csv").then((faoData) => {
    createMap(geoData, faoData);
  });
});

function createMap(geoData, faoData) {
  // Set dimensions and create SVG container for the map
  const width = document.getElementById("map-container").clientWidth;
  const height = 1000;
  const svg = d3
    .select("#map-container")
    .append("svg")
    .attr("width", "100%")
    .attr("height", height);

  // Create map and gradient bar groups
  const mapGroup = svg.append("g");
  const gradientBarGroup = svg.append("g");

  // Create a path generator
  // Create a geographical projection and path generator
  const projection = d3.geoOrthographic()
    .scale((width - 1) / 2 / Math.PI)
    .translate([width / 2, height / 2])
    .precision(0.1);
  const pathGenerator = d3.geoPath().projection(projection);


  // Add the zoom behavior
  const zoomBehavior = d3.zoom()
    .scaleExtent([1, 10])
    .on("zoom", (event) => {
      projection.scale(event.transform.k * (width - 1) / 2 / Math.PI);
      mapGroup.selectAll("path").attr("d", pathGenerator);
  });

  svg.call(zoomBehavior);

  const dragBehavior = d3.drag()
    .on("start", dragStart)
    .on("drag", dragged);

  mapGroup.call(dragBehavior);

  function dragStart(event) {
    event.sourceEvent.preventDefault();
    this.startPos = [event.x, event.y];
    this.startRotation = projection.rotate();
  }

  function dragged(event) {
    const newPos = [event.x, event.y];
    const diff = [newPos[0] - this.startPos[0], newPos[1] - this.startPos[1]];
    const rotation = [this.startRotation[0] + diff[0] / 4, this.startRotation[1] - diff[1] / 4, this.startRotation[2]];
    projection.rotate(rotation);
    mapGroup.selectAll("path").attr("d", pathGenerator);
  }

  let ratioData = {}
  let selectedItem = "Wheat and products"
  
  // Render the map
  mapGroup
  .selectAll("path")
  .data(geoData.features)
  .enter()
  .append("path")
  .attr("d", pathGenerator)
  .attr("fill", "#ccc")
  .attr("stroke", "#333")
  .attr("class", "country")
  .on("mouseover", (event, d) => handleMouseOver(event, d, ratioData, selectedItem))
  .on("mouseout", handleMouseOut);


  // Populate the item select list
  const items = Array.from(new Set(faoData.map((d) => d.Item)));
  const itemSelect = d3.select("#item-select");
  itemSelect
    .selectAll("option")
    .data(items)
    .enter()
    .append("option")
    .text((d) => d);

  createGradientBar()

  // Update the map when an item is selected
  itemSelect.on("change", function () {
    selectedItem = this.value
    updateMap(this.value);
  });

  updateMap(selectedItem);

  function updateMap(selectedItem) {
    // Filter the FAO data for the selected item and calculate the feed/food ratio
    const filteredData = faoData.filter((d) => d.Item === selectedItem);
    ratioData = {}; // Use an object to store the ratio data for each country
    filteredData.forEach((d) => {
      const key = d.Area;
      if (!(key in ratioData)) {
        ratioData[key] = { food: 0, feed: 0 };
      }
      if (d.Element === "Food") {
        ratioData[key].food += +d.Y2013;
      } else if (d.Element === "Feed") {
        ratioData[key].feed += +d.Y2013;
      }
    });
  
    // Define the color scale for the intensity and gradient
    const colorIntensity = d3
      .scaleLinear()
      .domain([0, d3.max(Object.values(ratioData), (d) => d.food + d.feed)])
      .range([0.4, 1]);
    const colorGradient = d3
      .scaleLinear()
      .domain([0, 1])
      .range([food_color, feed_color]);
  
    // Update the map colors
    svg
      .selectAll(".country")
      .transition()
      .duration(1000)
      .attr("fill", (d) => {
        const country = d.properties ? d.properties.name : null;
        const mappedCountry = nameMapping[country] ? nameMapping[country] : country;

        if (country && mappedCountry in ratioData) {
          const totalProduction =
            ratioData[mappedCountry].food + ratioData[mappedCountry].feed;
          const feedRatio = ratioData[mappedCountry].feed / totalProduction;
          const intensity = colorIntensity(totalProduction);
          const baseColor = d3.color(colorGradient(feedRatio));

          if (baseColor) {
            baseColor.opacity = intensity;
            return baseColor;
          } else {
            console.log(country + " not handled");
            return "#D8CEC1";
          }
        } else {
          return "#D8CEC1";
        }
      });
  }
  function createGradientBar() {
    const gradientWidth = 300;
    const gradientHeight = 20;
    const gradientBar = gradientBarGroup
      .append("g")
      .attr(
        "transform",
        `translate(${width - gradientWidth - 50}, ${
          height - gradientHeight - 50
        })`
      );
  
    const gradient = gradientBar
      .append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")
      .attr("spreadMethod", "pad");
  
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", food_color)
      .attr("stop-opacity", 1);
  
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", feed_color)
      .attr("stop-opacity", 1);
  
    gradientBar
      .append("rect")
      .attr("width", gradientWidth)
      .attr("height", gradientHeight)
      .style("fill", "url(#gradient)");
  
    const gradientScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([0, gradientWidth]);
  
    const gradientAxis = d3
      .axisBottom(gradientScale)
      .ticks(5)
      .tickFormat((d) => d + "%");
  
    gradientBar
      .append("g")
      .attr("transform", `translate(0, ${gradientHeight})`)
      .call(gradientAxis);

    gradientBar
      .append("text")
      .attr("x", 0)
      .attr("y", gradientHeight + 35)
      .attr("text-anchor", "start")
      .text("Food");
    
    // Add "Feed" label
    gradientBar
      .append("text")
      .attr("x", gradientWidth)
      .attr("y", gradientHeight + 35)
      .attr("text-anchor", "end")
      .text("Feed");
  }

  // Add mouseover event handler function
  function handleMouseOver(event, d, ratioData, selectedItem) {
    const country = d.properties ? d.properties.name : null;
    const mappedCountry = nameMapping[country] ? nameMapping[country] : country;
    if (mappedCountry && mappedCountry in ratioData) {
      const totalProduction =
        ratioData[mappedCountry].food + ratioData[mappedCountry].feed;
      const foodRatio = ratioData[mappedCountry].food / totalProduction;
      const feedRatio = ratioData[mappedCountry].feed / totalProduction;
      const tooltipText = `${mappedCountry} uses ${(
        foodRatio * 100
      ).toFixed(2)}% of its ${selectedItem} as food and ${(
        feedRatio * 100
      ).toFixed(2)}% as feed`;
  
      const tooltip = d3.select("#tooltip");
      tooltip
        .html(tooltipText)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 25 + "px")
        .style("display", "block");
    }
  }
  
  
  // Add mouseout event handler function
  function handleMouseOut(d) {
    d3.select("#tooltip").style("display", "none");
  }
}
