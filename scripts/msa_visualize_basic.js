/* msa_visualize_basic.js - Basic MSA Visualization for Combined Alignment */
(function(){
    // Parse FASTA formatted text into an array of { header, sequence } objects.
    function parseFasta(text) {
      const lines = text.split(/\r?\n/);
      const records = [];
      let currentRecord = null;
      for (let line of lines) {
        if (line.startsWith(">")) {
          if (currentRecord) records.push(currentRecord);
          currentRecord = { header: line.substring(1).trim(), sequence: "" };
        } else if (currentRecord) {
          currentRecord.sequence += line.trim();
        }
      }
      if (currentRecord) records.push(currentRecord);
      return records;
    }
  
    // Basic residue coloring: colors based on amino acid groups.
    function colorResidue(residue) {
      const char = residue.toUpperCase();
      const colorMapping = {
        'FCB315': 'WYHF',
        '7D2985': 'STQN',
        '231F20': 'PGA',
        'DD6030': 'ED',
        '7CAEC4': 'RK',
        'B4B4B4': 'VCIML'
      };
      for (const [color, acids] of Object.entries(colorMapping)) {
        if (acids.includes(char)) {
          return `<span style="color: #${color}">${char}</span>`;
        }
      }
      return char;
    }
  
    // Function to initialize the basic MSA visualization.
    // Expects FASTA text as input.
    window.initBasicMSA = function(fastaText) {
      const records = parseFasta(fastaText);
      if (!records || records.length === 0) {
        console.error("No records found in the provided FASTA text.");
        return;
      }
      // Create table element.
      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.fontFamily = "monospace";
      
      // Create a row for each sequence.
      records.forEach(record => {
        const tr = document.createElement("tr");
        // First column: sequence header (frozen).
        const headerTd = document.createElement("td");
        headerTd.innerText = record.header;
        headerTd.style.position = "sticky";
        headerTd.style.left = "0";
        headerTd.style.background = "#fff";
        headerTd.style.border = "none";
        headerTd.style.padding = "4px";
        tr.appendChild(headerTd);
        
        // Create one cell per residue in the sequence.
        for (let i = 0; i < record.sequence.length; i++) {
          const td = document.createElement("td");
          td.style.border = "none";
          td.style.padding = "1px";
          td.style.textAlign = "center";
          td.innerHTML = colorResidue(record.sequence[i]);
          tr.appendChild(td);
        }
        table.appendChild(tr);
      });
      
      // Append the table to the visualization container.
      const container = document.getElementById("msa-container-basic");
      if (container) {
        container.innerHTML = ""; // Clear previous content.
        container.appendChild(table);
      } else {
        console.error("Container with id 'msa-container-basic' not found.");
      }
    };
  })();
  