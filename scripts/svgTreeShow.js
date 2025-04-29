document.addEventListener('DOMContentLoaded', function() {
    // Helper: Retrieve the gene name from URL parameters.
    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }
  
    const currentGeneName = getQueryParam('gene');
    if (!currentGeneName) {
      console.error('No receptor gene specified in the URL.');
      return;
    }
  
    // Fetch the receptor data from receptors.json.
    fetch('receptors.json')
      .then(response => response.json())
      .then(receptors => {
        // Find the receptor matching the gene name (case-insensitive).
        const receptor = receptors.find(r =>
          r.geneName.toLowerCase() === currentGeneName.toLowerCase()
        );
        
        if (!receptor) {
          console.error(`Receptor "${currentGeneName}" not found.`);
          document.getElementById('svgTreeContainer').innerHTML = `<p>Receptor "${currentGeneName}" not found.</p>`;
          return;
        }
        
        // Update the section header to include the gene name.
        const treeHeader = document.querySelector('.tree-of-orthologs h2');
  
        // If receptor.svgTree is provided as a file path, fetch its content.
        if (receptor.svgTree) {
          fetch(receptor.svgTree)
            .then(response => response.text())
            .then(svgContent => {
              document.getElementById('svgTreeContainer').innerHTML = svgContent;
            })
            .catch(error => {
              console.error("Error loading SVG file:", error);
              document.getElementById('svgTreeContainer').innerHTML = "<p>Error loading SVG tree.</p>";
            });
        } else {
          console.warn("No svgTree available for this receptor.");
          document.getElementById('svgTreeContainer').innerHTML = "<p>No tree available.</p>";
        }
      })
      .catch(error => {
        console.error("Error loading receptor data:", error);
        document.getElementById('svgTreeContainer').innerHTML = "<p>Error loading tree data.</p>";
      });
  });
  