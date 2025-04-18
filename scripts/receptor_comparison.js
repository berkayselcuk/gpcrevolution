// scripts/receptor_comparison.js

// Constants
const ALIGNMENT_DIR = "alignments"; // Adjust the path as necessary
const receptorsJsonPath = "receptors.json"; // Path to the JSON file

// DOM Elements
const receptor1Input = document.getElementById("receptor1");
const receptor2Input = document.getElementById("receptor2");
const resultDiv = document.getElementById("result");
const receptorForm = document.getElementById("receptor-form");

// Global variables to store data for dynamic updating
let receptorsData = [];
let currentMappedData = null;  // Will hold the latest mapped data for dynamic updates
// Global variables to hold current snake plot state for color updates.
window.currentCategorizedResidues = null;
window.currentSnakeplotReceptor = null;
window.currentSnakeplotReceptorIndex = null;

/**
 * Initializes the application by loading receptor names and setting up autocomplete.
 */
async function initializeApp() {
    await recloadReceptorNames();
    setupAutocomplete(receptor1Input, "receptor1-rec-autocomplete-list");
    setupAutocomplete(receptor2Input, "receptor2-rec-autocomplete-list");
    // Attach an event listener to the slider to update its display and results dynamically.
    const thresholdSlider = document.getElementById("threshold");
    thresholdSlider.addEventListener("input", function() {
        // Update the displayed threshold value
        document.getElementById("thresholdDisplay").innerText = this.value;
        // If results already exist, update the table and snakeplot accordingly.
        if (currentMappedData) {
            updateResults(parseFloat(this.value));
        }
    });
    // Attach event listener for the new update color button.
    const updateBtn = document.getElementById("updateCategoryColors");
    if (updateBtn) {
        updateBtn.addEventListener("click", function() {
            if (window.currentCategorizedResidues && window.currentSnakeplotReceptor && window.currentSnakeplotReceptorIndex) {
                updateSnakeplotColors(window.currentCategorizedResidues, window.currentSnakeplotReceptor, window.currentSnakeplotReceptorIndex);
            } else {
                console.warn("No snake plot available for update.");
            }
        });
    }
}

/**
 * Fetches receptor names from the JSON file and stores them.
 */
async function recloadReceptorNames() {
    try {
        const response = await fetch(receptorsJsonPath);
        if (!response.ok) throw new Error(`Failed to fetch ${receptorsJsonPath}`);
        const receptors = await response.json();
        receptorsData = receptors; // Store for later use
        console.log("Receptor names loaded successfully.");
    } catch (error) {
        console.error('Error loading receptor names:', error);
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error loading receptor names. Please try again later.</div>";
    }
}

// Updated BLOSUM80 similarity pairs
const highScorePairs = new Set([
    "R-K", "N-B", "D-B", "Q-E", "Q-Z", "E-Z", "H-Y",
    "I-V", "I-J", "L-M", "L-J", "M-J", "F-Y", "W-Y", "V-J"
]);

// Helper function to calculate similarity score
function blosum80Score(aa1, aa2) {
    if (!aa1 || !aa2 || aa1 === "-" || aa2 === "-") {
        return -1;
    }
    let processedAa1 = aa1.includes('/') ? aa1.split('/')[0] : aa1;
    let processedAa2 = aa2.includes('/') ? aa2.split('/')[0] : aa2;
    if (processedAa1 === processedAa2) return 3;
    const pair = `${processedAa1}-${processedAa2}`;
    const reversePair = `${processedAa2}-${processedAa1}`;
    if (highScorePairs.has(pair) || highScorePairs.has(reversePair)) return 2;
    return 1;
}

/**
 * Sets up autocomplete functionality for a given input field.
 */
function setupAutocomplete(input, listId) {
    let currentFocus;
    input.addEventListener("input", function(e) {
        const val = this.value;
        closeAllLists(listId);
        if (!val) return false;
        currentFocus = -1;
        const a = document.getElementById(listId);
        if (!a) return false;
        a.innerHTML = "";
        const filteredReceptors = receptorsData.filter(receptor =>
            receptor.geneName.toUpperCase().startsWith(val.toUpperCase())
        );
        if (filteredReceptors.length === 0) return false;
        filteredReceptors.forEach(receptor => {
            const b = document.createElement("div");
            const strong = document.createElement("strong");
            strong.innerText = receptor.geneName.substr(0, val.length);
            b.appendChild(strong);
            b.innerHTML += receptor.geneName.substr(val.length);
            b.innerHTML += `<input type='hidden' value='${receptor.geneName}'>`;
            b.addEventListener("click", function(e) {
                input.value = this.getElementsByTagName("input")[0].value;
                closeAllLists(listId);
            });
            a.appendChild(b);
        });
    });
    input.addEventListener("keydown", function(e) {
        const a = document.getElementById(listId);
        if (a) var x = a.getElementsByTagName("div");
        if (e.keyCode === 40) {
            currentFocus++;
            addActive(x, listId);
        } else if (e.keyCode === 38) {
            currentFocus--;
            addActive(x, listId);
        } else if (e.keyCode === 13) {
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });
    function addActive(x, listId) {
        if (!x) return false;
        removeActive(x, listId);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = x.length - 1;
        x[currentFocus].classList.add("rec-autocomplete-active");
    }
    function removeActive(x, listId) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("rec-autocomplete-active");
        }
    }
    function closeAllLists(listId) {
        const items = document.getElementsByClassName("rec-autocomplete-items");
        for (let i = 0; i < items.length; i++) {
            if (items[i].id !== listId) {
                items[i].innerHTML = "";
            }
        }
    }
    document.addEventListener("click", function (e) {
        closeAllLists();
    });
}

/**
 * Updates the results (table and snakeplot) using the current mapped data and a new threshold.
 */
function updateResults(threshold) {
    const categorizedResidues = categorizeResidues(
        currentMappedData.resNums1,
        currentMappedData.resNums2,
        currentMappedData.percList1,
        currentMappedData.percList2,
        currentMappedData.aaList1,
        currentMappedData.aaList2,
        threshold
    );
    if (categorizedResidues.length === 0) {
        resultDiv.innerHTML = "<div class='alert alert-info'>No residues meet the specified criteria.</div>";
        return;
    }
    printCategories(categorizedResidues, window.currentReceptor1.geneName, window.currentReceptor2.geneName);
}

/**
 * Event listener for the form submission.
 */
receptorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const gene1 = receptor1Input.value.trim();
    const gene2 = receptor2Input.value.trim();
    const thresholdSlider = document.getElementById("threshold");
    const threshold = parseFloat(thresholdSlider.value);
    if (!gene1 || !gene2) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please select both receptors.</div>";
        return;
    }
    if (gene1.toLowerCase() === gene2.toLowerCase()) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please select two different receptors.</div>";
        return;
    }
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please select a valid conservation threshold (0-100).</div>";
        return;
    }
    const receptor1 = receptorsData.find(r => r.geneName.toLowerCase() === gene1.toLowerCase());
    const receptor2 = receptorsData.find(r => r.geneName.toLowerCase() === gene2.toLowerCase());
    window.currentReceptor1 = receptor1;
    window.currentReceptor2 = receptor2;
    if (!receptor1 || !receptor2) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: One or both receptors not found.</div>";
        console.error("Receptor data not found for:", gene1, gene2);
        return;
    }
    if (receptor1.class !== receptor2.class) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: Both receptors must belong to the same class.</div>";
        console.error("Mismatched classes:", receptor1.class, receptor2.class);
        return;
    }
    const receptorClass = receptor1.class;
    const fastaFilePath = `${ALIGNMENT_DIR}/class${receptorClass}_humans_MSA.fasta`;
    const conservationFilePath1 = receptor1.conservationFile;
    const conservationFilePath2 = receptor2.conservationFile;
    try {
        resultDiv.innerHTML = "<div class='alert alert-info'>Analyzing...</div>";
        const [sequences, geneData1, geneData2] = await Promise.all([
            readFastaFile(fastaFilePath),
            readConservationData(conservationFilePath1),
            readConservationData(conservationFilePath2)
        ]);
        const seq1 = sequences[receptor1.geneName];
        const seq2 = sequences[receptor2.geneName];
        if (!seq1 || !seq2) {
            throw new Error("Gene sequences not found in the FASTA file.");
        }
        const mappedData = mapAllData(geneData1, geneData2, seq1, seq2);
        currentMappedData = mappedData;
        updateResults(threshold);
    } catch (error) {
        resultDiv.innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
        console.error(error);
    }
});

function readFastaFile(fastaFilePath) {
    return fetch(fastaFilePath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch ${fastaFilePath}`);
            return response.text();
        })
        .then(fastaData => {
            const sequences = {};
            let currentHeader = null;
            fastaData.split("\n").forEach(line => {
                if (line.startsWith(">")) {
                    const parts = line.slice(1).trim().split("|");
                    if (parts.length >= 3) {
                        const genePart = parts[2].split("_")[0];
                        currentHeader = genePart;
                        sequences[currentHeader] = "";
                    } else {
                        console.warn(`Unexpected FASTA header format: ${line}`);
                        currentHeader = null;
                    }
                } else if (currentHeader) {
                    sequences[currentHeader] += line.trim();
                }
            });
            return sequences;
        });
}

function readConservationData(conservationFilePath) {
    return fetch(conservationFilePath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch ${conservationFilePath}`);
            return response.text();
        })
        .then(data => {
            const conservationData = {};
            data.split("\n").forEach(line => {
                const [resNum, conservation, aa] = line.split("\t");
                if (resNum && conservation && aa) {
                    conservationData[resNum.trim()] = {
                        conservation: parseFloat(conservation.trim()),
                        aa: aa.trim()
                    };
                }
            });
            return conservationData;
        })
        .catch(error => {
            console.error(`Error reading conservation data: ${error.message}`);
            throw error;
        });
}

function mapResidues(seq1, seq2) {
    const mappedResidues = [];
    let resNum1 = 0;
    let resNum2 = 0;
    for (let i = 0; i < seq1.length; i++) {
        const aa1 = seq1[i];
        const aa2 = seq2[i];
        let currentResNum1 = 'gap';
        let currentResNum2 = 'gap';
        if (aa1 !== '-') {
            resNum1 += 1;
            currentResNum1 = resNum1.toString();
        }
        if (aa2 !== '-') {
            resNum2 += 1;
            currentResNum2 = resNum2.toString();
        }
        if (aa1 !== '-' || aa2 !== '-') {
            mappedResidues.push({
                resNum1: currentResNum1,
                resNum2: currentResNum2
            });
        }
    }
    return mappedResidues;
}

function mapAllData(gene1Data, gene2Data, seq1, seq2) {
    const mappedResidues = mapResidues(seq1, seq2);
    const resNums1 = [];
    const resNums2 = [];
    const percList1 = [];
    const percList2 = [];
    const aaList1 = [];
    const aaList2 = [];
    mappedResidues.forEach(({ resNum1, resNum2 }) => {
        let perc1 = 0;
        let perc2 = 0;
        let aa1 = '-';
        let aa2 = '-';
        if (resNum1 !== 'gap') {
            const data1 = gene1Data[resNum1];
            if (data1) {
                perc1 = data1.conservation;
                aa1 = data1.aa;
            }
        }
        if (resNum2 !== 'gap') {
            const data2 = gene2Data[resNum2];
            if (data2) {
                perc2 = data2.conservation;
                aa2 = data2.aa;
            }
        }
        resNums1.push(resNum1);
        resNums2.push(resNum2);
        percList1.push(perc1);
        percList2.push(perc2);
        aaList1.push(aa1);
        aaList2.push(aa2);
    });
    return { resNums1, resNums2, percList1, percList2, aaList1, aaList2 };
}

function categorizeResidues(resNums1, resNums2, percList1, percList2, aaList1, aaList2, threshold) {
    const categorizedResidues = [];
    for (let i = 0; i < percList1.length; i++) {
        const isGap1 = resNums1[i] === 'gap';
        const isGap2 = resNums2[i] === 'gap';
        if (isGap1 && isGap2) continue;
        if (!isGap1 && !isGap2) {
            const conserved1 = percList1[i] >= threshold;
            const conserved2 = percList2[i] >= threshold;
            if (conserved1 && conserved2) {
                const similarity = blosum80Score(aaList1[i], aaList2[i]);
                if (similarity > 1) {
                    categorizedResidues.push({
                        category: "common",
                        resNum1: resNums1[i],
                        aa1: aaList1[i],
                        perc1: percList1[i],
                        resNum2: resNums2[i],
                        aa2: aaList2[i],
                        perc2: percList2[i]
                    });
                } else {
                    categorizedResidues.push({
                        category: "specific_both",
                        resNum1: resNums1[i],
                        aa1: aaList1[i],
                        perc1: percList1[i],
                        resNum2: resNums2[i],
                        aa2: aaList2[i],
                        perc2: percList2[i]
                    });
                }
            } else if (conserved1 && !conserved2) {
                categorizedResidues.push({
                    category: "specific1",
                    resNum1: resNums1[i],
                    aa1: aaList1[i],
                    perc1: percList1[i],
                    resNum2: resNums2[i],
                    aa2: aaList2[i],
                    perc2: percList2[i]
                });
            } else if (!conserved1 && conserved2) {
                categorizedResidues.push({
                    category: "specific2",
                    resNum1: resNums1[i],
                    aa1: aaList1[i],
                    perc1: percList1[i],
                    resNum2: resNums2[i],
                    aa2: aaList2[i],
                    perc2: percList2[i]
                });
            }
        } else if (!isGap1 && isGap2) {
            if (percList1[i] >= threshold) {
                categorizedResidues.push({
                    category: "specific1",
                    resNum1: resNums1[i],
                    aa1: aaList1[i],
                    perc1: percList1[i],
                    resNum2: 'gap',
                    aa2: '-',
                    perc2: 0
                });
            }
        } else if (isGap1 && !isGap2) {
            if (percList2[i] >= threshold) {
                categorizedResidues.push({
                    category: "specific2",
                    resNum1: 'gap',
                    aa1: '-',
                    perc1: 0,
                    resNum2: resNums2[i],
                    aa2: aaList2[i],
                    perc2: percList2[i]
                });
            }
        }
    }
    return categorizedResidues;
}

function printCategories(categorizedResidues, geneName1, geneName2) {
    const readableCategoryNames = {
        "common": "Common Residues",
        "specific_both": "Specifically Conserved for Both",
        "specific1": "Specifically Conserved for Receptor 1",
        "specific2": "Specifically Conserved for Receptor 2"
    };

    const tableData = [];
    const groupedResidues = {
        "common": { res1: [], res2: [] },
        "specific_both": { res1: [], res2: [] },
        "specific1": { res1: [], res2: [] },
        "specific2": { res1: [], res2: [] }
    };

    categorizedResidues.forEach(item => {
        const { category, resNum1, resNum2, aa1, aa2, perc1, perc2 } = item;
        if (groupedResidues[category]) {
            groupedResidues[category].res1.push({ resNum: resNum1, aa: aa1, perc: perc1 });
            groupedResidues[category].res2.push({ resNum: resNum2, aa: aa2, perc: perc2 });
        }
    });

    Object.keys(readableCategoryNames).forEach(category => {
        const res1List = groupedResidues[category].res1;
        const res2List = groupedResidues[category].res2;
        res1List.forEach((res1, index) => {
            const res2 = res2List[index];
            tableData.push({
                [geneName1 + "<br>Residue #"]: res1.resNum !== 'gap' ? res1.resNum : '-',
                [geneName1 + "<br>Conserved AA"]: res1.aa || '-',
                [geneName1 + "<br>Conservation %"]: res1.perc !== 0 ? Number(res1.perc).toFixed(2) : '-',
                [geneName2 + "<br>Residue #"]: res2.resNum !== 'gap' ? res2.resNum : '-',
                [geneName2 + "<br>Conserved AA"]: res2.aa || '-',
                [geneName2 + "<br>Conservation %"]: res2.perc !== 0 ? Number(res2.perc).toFixed(2) : '-',
                "Category": readableCategoryNames[category]
            });
        });
    });

    if (tableData.length === 0) {
        resultDiv.innerHTML = "<div class='alert alert-info'>No residues meet the specified conservation criteria.</div>";
        return;
    }

    displayResultsTable(tableData);
    // Show the customization section now that results are displayed.
    document.getElementById("color-customization").style.display = "block";
    // Store categorized residues globally for later updates.
    window.currentCategorizedResidues = categorizedResidues;

    // Update snakeplot with receptor 1’s data by default.
    updateSnakeplotColors(categorizedResidues, window.currentReceptor1, 1);
    // Set current snakeplot globals
    window.currentSnakeplotReceptor = window.currentReceptor1;
    window.currentSnakeplotReceptorIndex = 1;

    // Create toggle buttons for snakeplot.
    const toggleContainer = document.createElement("div");
    toggleContainer.id = "snakeplot-toggle-container";
    toggleContainer.style.marginTop = "20px";

    let toggleBtn1 = document.createElement("button");
    toggleBtn1.innerText = "Show Receptor 1 Snake Plot";
    toggleBtn1.className = "btn btn-primary";
    toggleBtn1.style.marginRight = "10px";
    toggleBtn1.addEventListener("click", function() {
        updateSnakeplotColors(categorizedResidues, window.currentReceptor1, 1);
        window.currentSnakeplotReceptor = window.currentReceptor1;
        window.currentSnakeplotReceptorIndex = 1;
    });

    let toggleBtn2 = document.createElement("button");
    toggleBtn2.innerText = "Show Receptor 2 Snake Plot";
    toggleBtn2.className = "btn btn-primary";
    toggleBtn2.addEventListener("click", function() {
        updateSnakeplotColors(categorizedResidues, window.currentReceptor2, 2);
        window.currentSnakeplotReceptor = window.currentReceptor2;
        window.currentSnakeplotReceptorIndex = 2;
    });

    toggleContainer.appendChild(toggleBtn1);
    toggleContainer.appendChild(toggleBtn2);
    resultDiv.appendChild(toggleContainer);
}

function displayResultsTable(data) {
    resultDiv.innerHTML = "<div id='results-table'></div>";
    const columns = Object.keys(data[0]).map(key => {
        if (key === "Category") {
            return {
                title: key,
                field: key,
                headerFilter: "select",
                headerFilterParams: {
                    values: {
                        "": "All",
                        "Common Residues": "Common Residues",
                        "Specifically Conserved for Both": "Specifically Conserved for Both",
                        "Specifically Conserved for Receptor 1": "Specifically Conserved for Receptor 1",
                        "Specifically Conserved for Receptor 2": "Specifically Conserved for Receptor 2"
                    }
                }
            };
        } else {
            return {
                title: key,
                field: key,
                headerFilter: "input"
            };
        }
    });

    let table = new Tabulator("#results-table", {
        data: data,
        columns: columns,
        layout: "fitDataStretch",
        height: "50vh",
    });

    let downloadBtn = document.createElement("button");
    downloadBtn.innerText = "Download Results as CSV";
    downloadBtn.className = "btn btn-download";
    downloadBtn.addEventListener("click", function() {
        table.download("csv", "results.csv");
    });
    resultDiv.appendChild(downloadBtn);
}

/**
 * Updates the snake plot with custom colors based on the category.
 * Reads user-selected colors from the new input fields.
 */
function updateSnakeplotColors(categorizedResidues, receptor, receptorIndex) {
    fetch(receptor.snakePlot)
      .then(response => response.text())
      .then(html => {
        let existingWrapper = document.getElementById("snakeplot-wrapper");
        if (existingWrapper) {
           existingWrapper.remove();
        }
        const snakeplotContainer = document.createElement("div");
        snakeplotContainer.id = "snakeplot-wrapper";
        snakeplotContainer.innerHTML = html;
        resultDiv.appendChild(snakeplotContainer);

        // Read user-defined colors from inputs (fallback to defaults if not provided)
        const categoryColors = {
           "Common Residues": document.getElementById('color-common').value || "#E6E6FA",
           "Specifically Conserved for Both": document.getElementById('color-specific-both').value || "#A85638",
           "Specifically Conserved for Receptor 1": document.getElementById('color-specific1').value || "#FFF9C2",
           "Specifically Conserved for Receptor 2": document.getElementById('color-specific2').value || "#8F9871"
        };
        
        categorizedResidues.forEach(item => {
            let resNum = (receptorIndex === 1) ? item.resNum1 : item.resNum2;
            if (resNum !== 'gap') {
              let circle = snakeplotContainer.querySelector(`circle[id="${resNum}"]`);
              if (circle) {
                let categoryReadable = "";
                switch(item.category) {
                   case "common":
                      categoryReadable = "Common Residues";
                      break;
                   case "specific_both":
                      categoryReadable = "Specifically Conserved for Both";
                      break;
                   case "specific1":
                      categoryReadable = "Specifically Conserved for Receptor 1";
                      break;
                   case "specific2":
                      categoryReadable = "Specifically Conserved for Receptor 2";
                      break;
                   default:
                      break;
                }
                if (categoryColors[categoryReadable]) {
                   circle.setAttribute("fill", categoryColors[categoryReadable]);
                }
                circle.setAttribute("data-snake-category", categoryReadable);
                let textElem = snakeplotContainer.querySelector(`text[id="${resNum}t"]`);
                if (textElem) {
                   textElem.setAttribute("data-snake-category", categoryReadable);
                }
              }
            }
        });
        
        let newSvg = snakeplotContainer.querySelector("svg");
        if (newSvg) {
            initSnakeplotTooltips(newSvg);
        }
        
        addDownloadSVGButton(snakeplotContainer);
      })
      .catch(error => {
        console.error("Error loading snakeplot:", error);
      });
}

function addDownloadSVGButton(snakeplotContainer) {
    let existingBtn = document.getElementById("download-svg-btn");
    if (existingBtn) {
        existingBtn.remove();
    }
    let downloadBtn = document.createElement("button");
    downloadBtn.id = "download-svg-btn";
    downloadBtn.innerText = "Download SVG";
    downloadBtn.className = "btn btn-download";
    downloadBtn.addEventListener("click", function(){
      let svgElement = snakeplotContainer.querySelector("svg");
      if (svgElement) {
         let svgData = new Blob([svgElement.outerHTML], { type: "image/svg+xml;charset=utf-8" });
         let url = URL.createObjectURL(svgData);
         let a = document.createElement("a");
         a.href = url;
         a.download = "conservation_analysis_snakeplot.svg";
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      }
    });
    snakeplotContainer.appendChild(downloadBtn);
}

document.addEventListener("DOMContentLoaded", initializeApp);
