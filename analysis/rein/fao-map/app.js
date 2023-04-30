// Load GeoJSON data for the world map
d3.json(
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
).then((geoData) => {
  // Load the FAO dataset (replace with the actual file path)
  d3.csv("./datasets/FAO.csv").then((faoData) => {
    createMap(geoData, faoData);
  });
});

function createMap(geoData, faoData) {
  // Set dimensions and create SVG container for the map
  const width = document.getElementById("map-container").clientWidth;
  const height = 800;
  const svg = d3
    .select("#map-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  let ratioData = {}
  let selectedItem = "Wheat and products"

  // Create a geographical projection and path generator
  const projection = d3.geoNaturalEarth1().fitSize([width, height], geoData);
  const pathGenerator = d3.geoPath().projection(projection);

  // Render the map
  svg
    .selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", pathGenerator)
    .attr("fill", "#ccc")
    .attr("stroke", "#333")
    .attr("class", "country")
    .on("mouseover", (d) => handleMouseOver(d, ratioData, selectedItem)) // Pass ratioData and selectedItem as arguments
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
      // console.log(d)
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
      .range(["#66bb6a", "#1e88e5"]);
  
    // Update the map colors
    svg
      .selectAll(".country") // Change this line to select only paths with the 'country' class
      .transition()
      .duration(1000)
      .attr("fill", (d) => {
        const country = d.properties ? d.properties.name : null;
        if (country && country in ratioData) {
          const totalProduction =
            ratioData[country].food + ratioData[country].feed;
          const feedRatio = ratioData[country].feed / totalProduction;
          const intensity = colorIntensity(totalProduction);
          const baseColor = d3.color(colorGradient(feedRatio));
          if (baseColor) {
            const r = Math.min(Math.floor(baseColor.r * intensity), 255);
            const g = Math.min(Math.floor(baseColor.g * intensity), 255);
            const b = Math.min(Math.floor(baseColor.b * intensity), 255);
            return d3.rgb(r, g, b);
          } else {
            return "#ccc";
          }
        } else {
          return "#ccc";
        }
      });
  }
  function createGradientBar() {
    const gradientWidth = 300;
    const gradientHeight = 20;
    const gradientBar = svg
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
      .attr("stop-color", "#66bb6a")
      .attr("stop-opacity", 1);
  
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#1e88e5")
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
  function handleMouseOver(d, ratioData, selectedItem) {
    const country = d.properties ? d.properties.name : null;
    console.log(d)
    if (country && country in ratioData) {
      const totalProduction =
        ratioData[country].food + ratioData[country].feed;
      const foodRatio = ratioData[country].food / totalProduction;
      const feedRatio = ratioData[country].feed / totalProduction;
      const tooltipText = `${country} uses ${(
        foodRatio * 100
      ).toFixed(2)}% of ${selectedItem} as food and ${(
        feedRatio * 100
      ).toFixed(2)}% as feed`;

      const tooltip = d3.select("#tooltip");
      tooltip
        .html(tooltipText)
        .style("left", d3.event.pageX + 10 + "px")
        .style("top", d3.event.pageY - 25 + "px")
        .style("display", "block");
    }
  }

  // Add mouseout event handler function
  function handleMouseOut(d) {
    d3.select("#tooltip").style("display", "none");
  }
}