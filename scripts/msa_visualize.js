/* msa_visualization.js */
(function(){
    // Fetch receptor data and initialize MSA using receptor.alignment and receptor.conservationFile.
    async function loadMSAData() {
      try {
        const geneName = getQueryParam('gene');
        if (!geneName) {
          document.getElementById("msa-container").innerHTML = "<p>No receptor gene specified in the URL.</p>";
          return;
        }
        const response = await fetch('receptors.json');
        if (!response.ok) {
          throw new Error('Failed to fetch receptors data.');
        }
        const receptors = await response.json();
        // Match receptor by gene name (case-insensitive)
        const receptor = receptors.find(r => 
          r.geneName.toLowerCase() === geneName.toLowerCase()
        );
        if (!receptor) {
          document.getElementById("msa-container").innerHTML = `<p>Receptor "${geneName}" not found.</p>`;
          return;
        }
        // Extract alignment and conservation file URLs.
        // (Assumes receptor.alignment holds the alignment file URL and receptor.conservationFile holds the conservation metadata.)
        const alignmentUrl = receptor.alignment;
        const conservationUrl = receptor.conservationFile;
        // Initialize the MSA visualization.
        window.initMSA(alignmentUrl, conservationUrl);
      } catch (error) {
        console.error("Error loading MSA data:", error);
        document.getElementById("msa-container").innerHTML = "<p>Error loading MSA data.</p>";
      }
    }
  
    // Helper to get a query parameter from the URL.
    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }
  
    // Expose initMSA to the global scope so it can be called after data loading.
    window.initMSA = async function(alignmentUrl, conservationUrl) {
      try {
        // Fetch both alignment and conservation (metadata) files concurrently.
        const [alignmentText, conservationText] = await Promise.all([
          fetch(alignmentUrl).then(response => response.text()),
          fetch(conservationUrl).then(response => response.text())
        ]);
        
        // Parse FASTA alignment and metadata.
        const records = parseFasta(alignmentText);
        const metadata = parseMetadata(conservationText);
        const residueMap = buildResidueMap(metadata);
        
        // Filter alignment to remove columns where the first sequence has a gap.
        const { records: filteredRecords, keepColumns } = filterAlignmentKeepColumns(records);
        
        // Render the alignment in the msa container.
        renderAlignment(filteredRecords, keepColumns, residueMap);
      } catch (error) {
        console.error("Error initializing MSA:", error);
        document.getElementById("msa-container").innerHTML = "<p>Error loading MSA data.</p>";
      }
    };
  
    // Utility: color residues based on amino acid groups.
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
    
    // Parse FASTA formatted text into an array of { header, sequence } objects.
    function parseFasta(text) {
      const lines = text.split(/\r?\n/);
      let records = [];
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
    
    // Parse TSV metadata into an array of objects.
    function parseMetadata(text) {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) return [];
      const header = lines[0].split(/\t/);
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/\t/);
        let record = {};
        header.forEach((col, idx) => {
          record[col.trim()] = row[idx] ? row[idx].trim() : "";
        });
        data.push(record);
      }
      return data;
    }
    
    // Build a residue map from metadata: residue_number -> metadata row.
    function buildResidueMap(metadata) {
      const residueMap = {};
      for (let row of metadata) {
        const rNum = parseInt(row.residue_number, 10);
        residueMap[rNum] = row;
      }
      return residueMap;
    }
    
    // Filter alignment columns where the first sequence has a gap and keep track of original column indices.
    function filterAlignmentKeepColumns(records) {
      if (records.length === 0) return { records, keepColumns: [] };
      const firstSeq = records[0].sequence;
      let newRecords = records.map(r => ({ header: r.header, sequence: "" }));
      let keepColumns = [];
      for (let i = 0; i < firstSeq.length; i++) {
        if (firstSeq[i] !== '-') {
          for (let j = 0; j < records.length; j++) {
            newRecords[j].sequence += records[j].sequence[i] || "";
          }
          keepColumns.push(i);
        }
      }
      return { records: newRecords, keepColumns };
    }
    
    // Render the alignment into the table elements.
    function renderAlignment(records, keepColumns, residueMap) {
      const tableHead = document.getElementById('tableHead');
      const tableBody = document.getElementById('tableBody');
      tableHead.innerHTML = "";
      tableBody.innerHTML = "";
      if (records.length === 0) return;
      const seqLength = records[0].sequence.length;
      
      // 1) Header row: display GPCRdb numbers (or residue numbers)
      const colNumRow = document.createElement('tr');
      colNumRow.classList.add('colnum-header');
      const gpcrdbCell = document.createElement('td');
      gpcrdbCell.classList.add('sticky-col');
      gpcrdbCell.textContent = "GPCRdb #";
      colNumRow.appendChild(gpcrdbCell);
      for (let i = 0; i < seqLength; i++) {
        const cell = document.createElement('td');
        cell.classList.add('residue-cell');
        const residueNum = i + 1;
        let label = (residueMap[residueNum] && residueMap[residueNum].gpcrdb) ? residueMap[residueNum].gpcrdb : residueNum.toString();
        cell.innerHTML = `<div class="rotate">${label}</div>`;
        colNumRow.appendChild(cell);
      }
      tableHead.appendChild(colNumRow);
      
      // 2) FASTA header row (first record)
      const fastaHeaderRow = document.createElement('tr');
      fastaHeaderRow.classList.add('fasta-header');
      const headerCell = document.createElement('td');
      headerCell.classList.add('sticky-col');
      headerCell.textContent = records[0].header;
      fastaHeaderRow.appendChild(headerCell);
      for (let i = 0; i < seqLength; i++) {
        const cell = document.createElement('td');
        cell.classList.add('residue-cell');
        cell.innerHTML = colorResidue(records[0].sequence[i]);
        fastaHeaderRow.appendChild(cell);
      }
      tableHead.appendChild(fastaHeaderRow);
      
      // 3) Render the remaining records.
      for (let i = 1; i < records.length; i++) {
        const tr = document.createElement('tr');
        const headerTd = document.createElement('td');
        headerTd.classList.add('sticky-col');
        headerTd.textContent = records[i].header;
        tr.appendChild(headerTd);
        for (let j = 0; j < seqLength; j++) {
          const cell = document.createElement('td');
          cell.classList.add('residue-cell');
          cell.innerHTML = colorResidue(records[i].sequence[j]);
          tr.appendChild(cell);
        }
        tableBody.appendChild(tr);
      }
    }
  
    // Start loading the MSA data when the DOM is fully loaded.
    document.addEventListener('DOMContentLoaded', function() {
      loadMSAData();
    });
  })();
