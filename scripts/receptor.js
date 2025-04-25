// /*************************************************
//  * receptor.js
//  * 
//  * Contains the logic for:
//  *  - Loading receptor data from receptors.json
//  *  - Initializing the bar chart and snakeplot
//  *  - Handling UI toggles (Bar Plot vs. Snake Plot)
//  **************************************************/

// Show the bar plot view.
function showBarPlot() {
    document.getElementById('conservation-chart-container').style.display = "block";
    document.getElementById('snakeplot-container').style.display = "none";
    document.getElementById('download-button-container').style.display = 'none';
}

// Show the snake plot view.
function showSnakePlot() {
    const barContainer      = document.getElementById('conservation-chart-container');
    const downloadContainer = document.getElementById('download-button-container');
    const snakeContainer    = document.getElementById('snakeplot-container');
  
    // Hide the bar chart, show snake + download UI
    barContainer.style.display      = 'none';
    downloadContainer.style.display = 'block';
    snakeContainer.style.display    = 'block';
  
    // Fetch the actual snakePlot URL stored in window.snakeplotFile
    fetch(window.snakeplotFile)
      .then(response => {
        if (!response.ok) throw new Error('Snakeplot not found');
        return response.text();
      })
      .then(html => {
        snakeContainer.innerHTML = html;
        updateSnakeplotConservation();
      })
      .catch(err => {
        console.warn('No snakeplot available, falling back to bar chart.', err);
        showBarPlot();
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
    document.getElementById('tree').href = receptor.treeDownload;
    document.getElementById('alignment').href = receptor.alignmentDownload;
    document.getElementById('conservationFile').href = receptor.conservationFile;

    // External links
    document.getElementById('gpcrdb-link').href = `https://gpcrdb.org/protein/${receptor.gpcrdbId}/`;
    document.getElementById('uniprot-link').href = `https://www.uniprot.org/uniprotkb/${receptor.gpcrdbId}`;

    // Store snakeplot file path and choose initial view
    if (receptor.snakePlot) {
        window.snakeplotFile = receptor.snakePlot;
        showSnakePlot();
    } else {
        console.warn("No snakePlot file specified for this receptor.");
        showBarPlot();
    }

    // Draw the conservation plot (bar plot)
    if (receptor.conservationFile) {
        drawConservationPlot(receptor.conservationFile, "#conservation-chart-container");
    } else {
        console.warn("No conservationFile specified for this receptor.");
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

// Download the currently displayed snakeplot SVG
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
