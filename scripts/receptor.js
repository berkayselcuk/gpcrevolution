/*************************************************
 * receptor.js
 * 
 * Contains the logic for:
 *  - Loading receptor data from receptors.json
 *  - Initializing the bar chart and snakeplot
 *  - Handling UI toggles (Bar Plot vs. Snake Plot)
 **************************************************/

// Show the bar plot view.
function showBarPlot() {
     document.getElementById('conservation-chart-container').style.display = "block";
     document.getElementById('snakeplot-container').style.display = "none";
     document.getElementById('download-button-container').style.display = 'none';
 }
 
 // Show the snake plot view.
 function showSnakePlot() {
     document.getElementById('conservation-chart-container').style.display = "none";
     document.getElementById('download-button-container').style.display = 'block';
     const snakeContainer = document.getElementById('snakeplot-container');
     snakeContainer.style.display = "block";
 
     // Use the snakePlot file from receptor JSON (stored in window.snakeplotFile)
     if (!window.snakeplotFile) {
         console.error("No snakePlot file specified in receptor data.");
         snakeContainer.innerHTML = "<p>No snakeplot available.</p>";
         return;
     }
 
     // Always re-fetch the snakeplot file to reinitialize the visualization
     fetch(window.snakeplotFile)
         .then(response => response.text())
         .then(html => {
             snakeContainer.innerHTML = html;
             console.log("Snakeplot reloaded.");
             // Now update the snakeplot with conservation colors
             updateSnakeplotConservation();
         })
         .catch(error => {
             console.error("Error loading snakeplot:", error);
             snakeContainer.innerHTML = "<p>Error loading snakeplot.</p>";
         });
 }
 
 // Helper to get a query parameter
 function getQueryParam(param) {
     const urlParams = new URLSearchParams(window.location.search);
     return urlParams.get(param);
 }
 
 // Display the receptor details in the HTML
 function displayReceptorDetails(receptor) {
     // Update header/banner
     document.getElementById('banner').textContent = `Receptor Name: ${receptor.geneName}`;
     document.title = `Receptor Details - ${receptor.geneName}`;
 
     // Basic info
     document.getElementById('class').textContent = receptor.class;
     document.getElementById('num-orthologs').textContent = receptor.numOrthologs;
     document.getElementById('lca').textContent = receptor.lca;
 
     // Downloads
     document.getElementById('tree').href = receptor.tree;
     document.getElementById('alignment').href = receptor.alignment;
     document.getElementById('conservationFile').href = receptor.conservationFile;
 
     // External links
     document.getElementById('gpcrdb-link').href = `https://gpcrdb.org/protein/${receptor.gpcrdbId}/`;
     document.getElementById('uniprot-link').href = `https://www.uniprot.org/uniprotkb/${receptor.gpcrdbId}`;
 
     // Store snakeplot file path from receptor data
     if (receptor.snakePlot) {
         window.snakeplotFile = receptor.snakePlot;
     } else {
         console.warn("No snakePlot file specified for this receptor.");
     }
 
    // Draw the conservation plot (bar plot) into its container.
    // The container is hidden by default in your HTML.
    if (receptor.conservationFile) {
        drawConservationPlot(receptor.conservationFile, "#conservation-chart-container");
    } else {
        console.warn("No conservationFile specified for this receptor.");
    }

    // Load and display the snakeplot by default (this will hide the conservation plot container).
    if (receptor.snakePlot) {
        showSnakePlot();
    } else {
        console.warn("No snakePlot file specified for this receptor.");
        showBarPlot(); 
    }
 }
 
 // Display an error message in the HTML
 function displayError(message) {
     document.body.innerHTML = `
         <div id="header-placeholder"></div>
         <main>
             <h1>Error</h1>
             <p>${message}</p>
         </main>
     `;
     loadHeader();
 }
 
 // Define a global variable so other functions can see it.
 let currentGeneName = null;
 
 // Fetch the receptor data from receptors.json
 async function loadReceptorData() {
     try {
         currentGeneName = getQueryParam('gene');
         if (!currentGeneName) {
             displayError('No receptor gene specified in the URL.');
             return;
         }
         const response = await fetch('receptors.json');
         if (!response.ok) {
             throw new Error('Failed to fetch receptors data.');
         }
         const receptors = await response.json();
         // Compare lowercased strings so they match even if case differs
         const receptor = receptors.find(r =>
             r.geneName.toLowerCase() === currentGeneName.toLowerCase()
         );
         if (receptor) {
             displayReceptorDetails(receptor);
         } else {
             displayError(`Receptor "${currentGeneName}" not found.`);
         }
     } catch (error) {
         console.error('Error loading receptor data:', error);
         displayError('An error occurred while loading receptor data.');
     }
 }
 
 function downloadSnakeplotSVG() {
     const svgElement = document.getElementById('snakeplot');
     if (!svgElement) {
         console.warn("No snakeplot SVG found to download.");
         return;
     }
     const serializer = new XMLSerializer();
     let svgString = serializer.serializeToString(svgElement);
     svgString = '<?xml version="1.0" standalone="yes"?>\r\n' + svgString;
     const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `${currentGeneName}_conservation_snakeplot.svg`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
 }
 
 // Initialize everything on DOMContentLoaded
 document.addEventListener('DOMContentLoaded', function() {
     loadHeader();       // from header.js
     loadReceptorData(); // fetch receptor data
 });
 