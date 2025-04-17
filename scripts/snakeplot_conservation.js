/*
  Revised snakeplot_conservation.js

  - Fetches external conservation data and updates both circle elements (class "rcircle")
    and TEXT elements (class "rtext").
  - For circles, the gradient fill (transitioning to lavender) is applied.
  - For text elements, only the tooltip (title attribute) is updated with conservation information.
  - The residue number is extracted from the element's original_title attribute (e.g. "M377 " → "377").
  - Calls initSnakeplotTooltips, which still looks for [title], [data-original-title], or [data-snake-tooltip].
*/

function initSnakeplotTooltips(svg) {
  // Create a tooltip <div> if it doesn't exist yet.
  let tooltip = document.getElementById('snake-tooltip');
  if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'snake-tooltip';
      tooltip.classList.add('snake-tooltip'); // uses your snakeplot.css styling
      document.body.appendChild(tooltip);
  }

  // Find elements that have ANY possible tooltip attributes
  let hoverElems = svg.querySelectorAll('[data-snake-tooltip], [data-original-title], [title]');
  hoverElems.forEach(elem => {
      let text = elem.getAttribute('data-snake-tooltip') ||
                 elem.getAttribute('data-original-title') ||
                 elem.getAttribute('title') || '';
      elem.addEventListener('mouseover', e => {
          tooltip.innerHTML = text;
          tooltip.style.opacity = '1'; // Show tooltip
      });
      elem.addEventListener('mousemove', e => {
          tooltip.style.left = (e.pageX + 12) + 'px';
          tooltip.style.top = (e.pageY + 12) + 'px';
      });
      elem.addEventListener('mouseout', e => {
          tooltip.style.opacity = '0'; // Hide tooltip
      });
  });
}

function updateSnakeplotConservation() {
    // Retrieve the conservation file path
    let conservationFileAnchor = document.getElementById('conservationFile');
    if (!conservationFileAnchor) {
        console.error("Conservation file anchor not found.");
        return;
    }
    let conservationFilePath = conservationFileAnchor.getAttribute('href');
    if (!conservationFilePath || conservationFilePath === "#") {
        console.warn("No conservation file specified.");
        return;
    }
  
    // Fetch and process the conservation data
    fetch(conservationFilePath)
        .then(response => response.text())
        .then(text => {
            // Build the conservationMap from the file data
            let lines = text.split(/\r?\n/).filter(line => line.trim() !== "" && !line.toLowerCase().startsWith("residue"));
            let conservationMap = {};
            lines.forEach(line => {
                let parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    let residue = parts[0];
                    let consValue = parseFloat(parts[1]);
                    let conservedAA = parts[2] || "";
                    let humanAA = parts[3] || "";
                    let region = parts[4] || "";
                    let gpcrdb = parts[5] || "";
                    conservationMap[residue] = {
                        conservation: consValue,
                        conservedAA: conservedAA,
                        humanAA: humanAA,
                        region: region,
                        gpcrdb: gpcrdb
                    };
                }
            });
            console.log("Conservation Map:", conservationMap);
  
            // Get the snakeplot SVG
            let svg = document.getElementById('snakeplot');
            if (!svg) {
                console.error("Snakeplot SVG not found.");
                return;
            }
  
            // Ensure <defs> exists and clear out old gradients
            let defs = svg.querySelector("defs");
            if (!defs) {
                defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                svg.insertBefore(defs, svg.firstChild);
            } else {
                while (defs.firstChild) {
                    defs.removeChild(defs.firstChild);
                }
                console.log("Cleared existing gradients.");
            }
  
            // Get user-specified colors from inputs
            let userFillColor = document.getElementById('fillColor').value || "#B7B7EB";
            let userTextColor = document.getElementById('textColor').value || "#000000";
            console.log("Updating snakeplot with fill color:", userFillColor, "and text color:", userTextColor);
  
            // Non-linear mapping: Compute gradient boundary so that equal increments in conservation yield equal filled area.
            // For a unit circle (diameter = 2, total height 2, total area π),
            // we want to find h (from the bottom) such that the area of the segment equals (consValue/100)*π.
            function getGradientOffset(consValue) {
                let p = consValue / 100;          // Fraction to fill
                let A_target = p * Math.PI;         // Target area (total area of unit circle is π)
  
                // Compute area of circular segment of height h (from the bottom) in a unit circle.
                // Formula: A_segment = arccos(1 - h) - (1 - h) * sqrt(2h - h^2)
                function segmentArea(h) {
                    return Math.acos(1 - h) - (1 - h) * Math.sqrt(2 * h - h * h);
                }
  
                // Binary search for h in [0, 2] such that segmentArea(h) ≈ A_target.
                let low = 0, high = 2, mid, A_mid;
                for (let i = 0; i < 20; i++) {
                    mid = (low + high) / 2;
                    A_mid = segmentArea(mid);
                    if (A_mid < A_target) {
                        low = mid;
                    } else {
                        high = mid;
                    }
                }
                // Convert the segment height into a gradient offset.
                // The fill starts from the bottom, so the offset from the top is ((2 - h)/2)*100%
                let offset = ((2 - mid) / 2) * 100;
                return offset + "%";
            }
  
            // Use the non-linear mapping to get the boundary offset
            let consData, consValue, boundary;
            // --- Update Circle Elements (gradient fill) ---
            let circles = svg.querySelectorAll("circle.rcircle");
            circles.forEach(circle => {
                let residueId = circle.getAttribute('id');
                if (!residueId) return;
  
                consData = conservationMap[residueId];
                if (!consData) return;
  
                consValue = consData.conservation;
                boundary = getGradientOffset(consValue); // Non-linear offset
                let gradId = "grad-" + residueId;
  
                // Create vertical linear gradient using userFillColor for lower portion
                let linearGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
                linearGradient.setAttribute("id", gradId);
                linearGradient.setAttribute("x1", "0%");
                linearGradient.setAttribute("y1", "0%");
                linearGradient.setAttribute("x2", "0%");
                linearGradient.setAttribute("y2", "100%");
  
                let stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                stop1.setAttribute("offset", "0%");
                stop1.setAttribute("stop-color", "white");
                linearGradient.appendChild(stop1);
  
                let stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                stop2.setAttribute("offset", boundary);
                stop2.setAttribute("stop-color", "white");
                linearGradient.appendChild(stop2);
  
                let stop3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                stop3.setAttribute("offset", boundary);
                stop3.setAttribute("stop-color", userFillColor);
                linearGradient.appendChild(stop3);
  
                let stop4 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                stop4.setAttribute("offset", "100%");
                stop4.setAttribute("stop-color", userFillColor);
                linearGradient.appendChild(stop4);
  
                defs.appendChild(linearGradient);
  
                // Update circle attributes
                circle.setAttribute("fill", "url(#" + gradId + ")");
                circle.setAttribute("data-conservation", consValue);
                let tooltipHTML =
                    "<strong>Residue #:</strong> " + residueId + "<br/>" +
                    "<strong>Conservation %:</strong> " + consValue + "%<br/>" +
                    "<strong>Conserved AA:</strong> " + consData.conservedAA + "<br/>" +
                    "<strong>Human AA:</strong> " + consData.humanAA + "<br/>" +
                    "<strong>Region:</strong> " + consData.region + "<br/>" +
                    "<strong>GPCRdb #:</strong> " + consData.gpcrdb;
                circle.removeAttribute("original_title");
                circle.removeAttribute("data-original-title");
                circle.removeAttribute("data-snake-tooltip");
                circle.setAttribute("title", tooltipHTML);
  
            });
  
            // --- Update Text Elements (tooltip remains, but text color changes) ---
            let textElements = svg.querySelectorAll("text.rtext");
            textElements.forEach(txt => {
                let originalTitle = txt.getAttribute('original_title');
                if (!originalTitle) return;
                let residueMatch = originalTitle.match(/\d+/);
                if (!residueMatch) return;
                let residueId = residueMatch[0];
  
                let consData = conservationMap[residueId];
                if (!consData) return;
  
                let consValue = consData.conservation;
                let tooltipHTML =
                    "<strong>Residue #:</strong> " + residueId + "<br/>" +
                    "<strong>Conservation %:</strong> " + consValue + "%<br/>" +
                    "<strong>Conserved AA:</strong> " + consData.conservedAA + "<br/>" +
                    "<strong>Human AA:</strong> " + consData.humanAA + "<br/>" +
                    "<strong>Region:</strong> " + consData.region + "<br/>" +
                    "<strong>GPCRdb #:</strong> " + consData.gpcrdb;
  
                txt.setAttribute("title", tooltipHTML);
                txt.setAttribute("data-conservation", consValue);
                txt.setAttribute("style", "fill: " + userTextColor + ";");
                txt.style.fill = userTextColor;
                console.log(`Updated text for residue ${residueId} with text color ${userTextColor}`);
            });
  
            // Reinitialize tooltips
            initSnakeplotTooltips(svg);
        })
        .catch(error => {
            console.error("Error fetching or processing conservation file:", error);
        });
  }
  

// Attach updateColors listener once DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  let svg = document.getElementById('snakeplot');
  if (svg) {
      updateSnakeplotConservation();
  }
  let updateBtn = document.getElementById('updateColors');
  if (updateBtn) {
      updateBtn.addEventListener('click', function() {
          let userFillColor = document.getElementById('fillColor').value || "#B7B7EB";
          let userTextColor = document.getElementById('textColor').value || "#000000";
          console.log("New Circle Fill Color:", userFillColor);
          console.log("New Text Color:", userTextColor);
          updateSnakeplotConservation();
      });
  } else {
      console.error("Update Colors button not found.");
  }
});
