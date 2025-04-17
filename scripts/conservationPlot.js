// scripts/conservationPlot.js

function drawConservationPlot(conservationFile, containerId) {
  // Layout variables
  const CHUNK_SIZE = 60;
  const rowWidth  = 1040;
  const rowHeight = 260;
  const margin    = { top: 26, right: 26, bottom: 26, left: 104 };
  const chartAreaHeight = 130;
  const infoRowHeight   = 20;
  const gapBetweenInfoRows = 10;
  const regionBlockHeight  = 26;
  const gapBeforeRegion    = 12;
  const pastelColors = ["#FFFACD", "#E6E6FA"];
  const fontHumanAA      = 16;
  const fontGPCRdb       = 16;
  const fontRegionLabel  = 14;
  const fontYAxisLabel   = 16;
  const fontYAxisTicks   = 14;
  const yLabelOffset     = 60;
  
  // Create a scrollable container
  const parent = document.querySelector(containerId);
  if (!parent) {
    console.error(`drawConservationPlot: container '${containerId}' not found!`);
    return;
  }
  let scrollContainer = parent.querySelector("#conservation-scroll-container");
  if (!scrollContainer) {
    scrollContainer = document.createElement("div");
    scrollContainer.id = "conservation-scroll-container";
    parent.appendChild(scrollContainer);
  }
  scrollContainer.innerHTML = ""; // Clear previous content

  const svg = d3.select(scrollContainer)
    .append("svg")
    .attr("width", rowWidth + margin.left + margin.right)
    .attr("height", 1); // Temporary height

  // Create tooltip element (attached to body)
  let tooltip = d3.select("body").select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");
  }

  // Fetch and process data
  fetch(conservationFile)
    .then(response => response.text())
    .then(text => {
      // Parse the data (skipping header lines)
      const lines = text.split(/\r?\n/).filter(d => d.trim() && !d.startsWith("residue"));
      const data = lines.map(line => {
        const [resStr, consStr, conservedAA, humanAA, region, gpcrdb] = line.trim().split(/\s+/);
        return {
          residue:      +resStr,
          conservation: +consStr,
          conservedAA,
          humanAA,
          region,
          gpcrdb
        };
      });

      // Build a mapping from each unique region to a specific color
      const regionColorMapping = {};
      let colorIndex = 0;
      data.forEach(d => {
        if (!(d.region in regionColorMapping)) {
          regionColorMapping[d.region] = pastelColors[colorIndex % pastelColors.length];
          colorIndex++;
        }
      });
      console.log("Region Color Mapping:", regionColorMapping);

      // Chunk the data
      const chunks = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
      }

      // Resize the SVG based on the number of chunks
      const totalHeight = margin.top + margin.bottom + chunks.length * rowHeight;
      svg.attr("height", totalHeight);

      // Create a layout object to pass to each row
      const layout = {
        rowWidth,
        rowHeight,
        margin,
        chartAreaHeight,
        infoRowHeight,
        gapBetweenInfoRows,
        regionBlockHeight,
        gapBeforeRegion,
        fontHumanAA,
        fontGPCRdb,
        fontRegionLabel,
        fontYAxisLabel,
        fontYAxisTicks,
        yLabelOffset
      };

      // Draw each chunk using the external drawRow function
      chunks.forEach((chunkData, idx) => {
        drawRow({
          chunkData,
          rowIndex: idx,
          svgSelection: svg,
          layout,
          tooltip,
          regionColorMapping
        });
      });
    })
    .catch(err => {
      console.error("Error loading conservation data:", err);
    });
}

// Draw a single row (chunk) of the plot
function drawRow({ chunkData, rowIndex, svgSelection, layout, tooltip, regionColorMapping }) {
  const { rowWidth, rowHeight, margin, chartAreaHeight, infoRowHeight, gapBetweenInfoRows,
          regionBlockHeight, gapBeforeRegion, fontHumanAA, fontGPCRdb, fontRegionLabel,
          fontYAxisLabel, fontYAxisTicks, yLabelOffset } = layout;

  const offsetY = margin.top + rowIndex * rowHeight;
  const gRow = svgSelection.append("g")
    .attr("transform", `translate(0,${offsetY})`);

  // X-scale for residues
  const x = d3.scaleBand()
    .domain(chunkData.map(d => d.residue))
    .rangeRound([margin.left, rowWidth - margin.right])
    .paddingInner(0.05)
    .paddingOuter(0);

  // Y-scale for conservation values (0 to 100)
  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([chartAreaHeight, margin.top]);

  // (A) Draw Bars for Conservation
  gRow.selectAll(".bar")
    .data(chunkData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.residue))
    .attr("y", d => y(d.conservation))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.conservation))
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`
          <strong>Residue #:</strong> ${d.residue}<br/>
          <strong>Conservation %:</strong> ${d.conservation}%<br/>
          <strong>Conserved AA:</strong> ${d.conservedAA}<br/>
          <strong>Human AA:</strong> ${d.humanAA}<br/>
          <strong>Region:</strong> ${d.region}<br/>
          <strong>GPCRdb #:</strong> ${d.gpcrdb}
        `);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 40) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // (B) Y-Axis and its label
  const yAxis = d3.axisLeft(y).ticks(5);
  const yAxisG = gRow.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  yAxisG.selectAll("text")
    .style("font-size", fontYAxisTicks + "px");

  const yLabel = gRow.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${margin.left - yLabelOffset}, ${(margin.top + chartAreaHeight) / 2}) rotate(-90)`)
    .style("font-size", fontYAxisLabel + "px");

  yLabel.append("tspan")
    .attr("x", 0)
    .text("Orthologous");
  yLabel.append("tspan")
    .attr("x", 0)
    .attr("dy", "1.2em")
    .text("Conservation");

  // (C) Bottom rows: HumanAA and GPCRdb labels
  const firstRowY = chartAreaHeight + 10;
  gRow.selectAll(".human-text")
    .data(chunkData)
    .enter()
    .append("text")
    .attr("class", "human-text")
    .attr("x", d => x(d.residue) + x.bandwidth() / 2)
    .attr("y", firstRowY + infoRowHeight / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("font-size", fontHumanAA + "px")
    .text(d => d.humanAA);

  const secondRowY = firstRowY + infoRowHeight + gapBetweenInfoRows;
  gRow.selectAll(".gpcr-text")
    .data(chunkData)
    .enter()
    .append("text")
    .attr("class", "gpcr-text")
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle")
    .style("font-size", fontGPCRdb + "px")
    .text(d => d.gpcrdb)
    .attr("x", d => x(d.residue) + x.bandwidth() / 2)
    .attr("y", secondRowY + infoRowHeight / 2)
    .attr("transform", d => {
      const cx = x(d.residue) + x.bandwidth() / 2;
      const cy = secondRowY + infoRowHeight / 2;
      return `rotate(-90,${cx},${cy})`;
    });

  // (D) Region Blocks
  const regionGroups = [];
  let startRes = chunkData[0].residue;
  let currentRegion = chunkData[0].region;
  for (let i = 1; i < chunkData.length; i++) {
    const prev = chunkData[i - 1];
    const cur  = chunkData[i];
    if (cur.region !== prev.region) {
      regionGroups.push({
        region: prev.region,
        startResidue: startRes,
        endResidue: prev.residue
      });
      startRes = cur.residue;
      currentRegion = cur.region;
    }
  }
  // Push the final group
  regionGroups.push({
    region: currentRegion,
    startResidue: startRes,
    endResidue: chunkData[chunkData.length - 1].residue
  });

  const regionRowY = secondRowY + infoRowHeight + gapBeforeRegion;
  gRow.selectAll(".region-block")
    .data(regionGroups)
    .enter()
    .append("rect")
    .attr("class", "region-block")
    .attr("x", d => x(d.startResidue))
    .attr("y", regionRowY)
    .attr("width", d => (x(d.endResidue) + x.bandwidth()) - x(d.startResidue))
    .attr("height", regionBlockHeight)
    .attr("fill", d => regionColorMapping[d.region])
    .on("mouseover", function(event, d) {
      d3.select(this).style("stroke", "#000").style("stroke-width", 1);
      tooltip.style("opacity", 1)
        .html(`
          <strong>Region:</strong> ${d.region}<br/>
          Residues ${d.startResidue} - ${d.endResidue}
        `);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 40) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).style("stroke", "none");
      tooltip.style("opacity", 0);
    });

  // Region label
  gRow.selectAll(".region-name")
    .data(regionGroups)
    .enter()
    .append("text")
    .attr("class", "region-label")
    .attr("text-anchor", "middle")
    .style("font-size", fontRegionLabel + "px")
    .attr("x", d => {
      const leftX  = x(d.startResidue);
      const rightX = x(d.endResidue) + x.bandwidth();
      return (leftX + rightX) / 2;
    })
    .attr("y", regionRowY + regionBlockHeight / 2)
    .attr("dy", "0.35em")
    .text(d => d.region);
}
