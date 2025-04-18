// scripts/receptor_table.js

// Constants
const ALIGNMENT_DIR = "alignments"; // Adjust the path as necessary
const receptorsJsonPath = "receptors.json"; // Path to the JSON file

// DOM Elements
const referenceInput = document.getElementById("referenceReceptor"); // Input for reference receptor
const targetInput = document.getElementById("targetReceptors"); // Input for target receptors
const residueInput = document.getElementById("residueNumbers"); // Input for residue numbers
const conservationCheckbox = document.getElementById("includeConservation"); // Checkbox for conservation data
const resultDiv = document.getElementById("result");
const mappingForm = document.getElementById("mapping-form");

// Variable to store receptors data
let receptorsData = [];

/**
 * Initializes the application by loading receptor names and setting up autocomplete.
 */
async function residueMap_initializeApp() {
    await residueMap_loadReceptorNames();
    residueMap_setupAutocomplete(referenceInput, "reference-autocomplete-list", false); // Single selection
    residueMap_setupAutocomplete(targetInput, "target-autocomplete-list", true); // Multiple selections
}

/**
 * Fetches receptor names from the JSON file and stores them.
 */
async function residueMap_loadReceptorNames() {
    try {
        const response = await fetch(receptorsJsonPath);
        if (!response.ok) throw new Error(`Failed to fetch ${receptorsJsonPath}`);
        const receptors = await response.json();
        receptorsData = receptors; // Store for later use
        console.log("Receptor names loaded successfully.");
    } catch (error) {
        console.error("Error loading receptor names:", error);
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error loading receptor names. Please try again later.</div>";
    }
}

/**
 * Sets up autocomplete functionality for a given input field.
 * @param {HTMLElement} input - The input element to apply autocomplete.
 * @param {string} listId - The ID of the autocomplete list container.
 * @param {boolean} allowMultiple - Whether to allow multiple selections.
 */
function residueMap_setupAutocomplete(input, listId, allowMultiple = false) {
    let currentFocus = -1;

    input.addEventListener("input", function (e) {
        const val = allowMultiple ? this.value.split(",").pop().trim() : this.value;
        residueMap_closeAllLists(listId);
        if (!val) return false;
        currentFocus = -1;

        const a = document.getElementById(listId);
        if (!a) return false;

        // Clear any existing suggestions
        a.innerHTML = "";

        // Filter receptors based on the input value (case-insensitive)
        const filteredReceptors = receptorsData.filter(receptor =>
            receptor.geneName.toUpperCase().startsWith(val.toUpperCase())
        );

        if (filteredReceptors.length === 0) return false;

        // Create suggestion items
        filteredReceptors.forEach(receptor => {
            const b = document.createElement("div");
            const strong = document.createElement("strong");
            strong.innerText = receptor.geneName.substr(0, val.length);
            b.appendChild(strong);
            b.innerHTML += receptor.geneName.substr(val.length);
            b.setAttribute("data-value", receptor.geneName);
            b.classList.add("autocomplete-item");

            a.appendChild(b);
        });
    });

    input.addEventListener("keydown", function (e) {
        const a = document.getElementById(listId);
        if (a) var x = a.getElementsByTagName("div");
        if (e.keyCode === 40) { // Down key
            currentFocus++;
            residueMap_addActive(x, currentFocus);
        } else if (e.keyCode === 38) { // Up key
            currentFocus--;
            residueMap_addActive(x, currentFocus);
        } else if (e.keyCode === 13) { // Enter key
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        }
    });

    // Handle click events on suggestion items using event delegation
    const a = document.getElementById(listId);
    a.addEventListener("click", function (e) {
        if (e.target && e.target.matches("div.autocomplete-item")) {
            const selectedValue = e.target.getAttribute("data-value");
            let currentValue = input.value;

            if (allowMultiple) {
                const parts = currentValue.split(",").map(part => part.trim());
                parts.pop(); // Remove the incomplete token (e.g., "5")
                parts.push(selectedValue);
                input.value = parts.join(", ") + ", ";
            } else {
                input.value = selectedValue;
            }
            
            

            a.innerHTML = ""; // Close the dropdown by clearing the list
            currentFocus = -1; // Reset the focus index
            input.focus(); // Focus back on the input for further selections
        }
    });

    // Close the autocomplete list when clicking outside
    document.addEventListener("click", function (e) {
        if (e.target !== input) {
            residueMap_closeAllLists(listId);
        }
    });
}

/**
 * Adds the "active" class to the currently focused item.
 * @param {HTMLCollection} x - Collection of suggestion items.
 * @param {number} currentFocus - The current focus index.
 */
function residueMap_addActive(x, currentFocus) {
    if (!x) return false;
    residueMap_removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    x[currentFocus].classList.add("autocomplete-active");
}

/**
 * Removes the "active" class from all suggestion items.
 * @param {HTMLCollection} x - Collection of suggestion items.
 */
function residueMap_removeActive(x) {
    for (let i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
    }
}

/**
 * Closes all autocomplete lists except the current one.
 * @param {string} listId - The ID of the autocomplete list container to keep open.
 */
function residueMap_closeAllLists(listId) {
    const items = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < items.length; i++) {
        if (items[i].id !== listId) {
            items[i].innerHTML = "";
        }
    }
}

/**
 * Reads conservation data from a file.
 * Expects the file to have six tab-delimited columns: residue_number, conservation, conserved_aa, aa, region, gpcrdb.
 */
function readConservationData(conservationFilePath) {
    return fetch(conservationFilePath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch ${conservationFilePath}`);
            return response.text();
        })
        .then(data => {
            const conservationData = {};
            data.split("\n").forEach(line => {
                const parts = line.split("\t");
                // Skip header if present
                if (parts[0] && parts[0].trim().toLowerCase() === "residue_number") return;
                if (parts.length >= 6) {
                    const resNum = parts[0].trim();
                    const conservationVal = parts[1].trim();
                    const conservedAA = parts[2];
                    const aa = parts[3].trim();
                    const region = parts[4].trim();
                    const gpcrdb = parts[5].trim();
                    conservationData[resNum] = {
                        conservation: parseFloat(conservationVal),
                        conservedAA: conservedAA,
                        aa: aa,
                        region: region,
                        gpcrdb: gpcrdb
                    };
                }
            });
            console.log(`Parsed Conservation Data from ${conservationFilePath}:`, conservationData);
            return conservationData;
        })
        .catch(error => {
            console.error(`Error reading conservation data: ${error.message}`);
            throw error;
        });
}

/**
 * Maps residues and amino acids for all receptors based on the alignment.
 * Additionally, for the reference receptor (first in the list), includes region and gpcrdb.
 * @param {Array<Object>} receptorSequences - Array of objects with geneName and sequence (and conservationFile)
 * @param {Object} conservationDataMap - Object mapping gene names to their conservation data
 * @returns {Array<Object>} - Array of mapping objects
 */
function residueMap_mapResiduesAllReceptors(receptorSequences, conservationDataMap = {}) {
    const sequenceLength = receptorSequences[0].sequence.length;
    const residueCounters = {};
    receptorSequences.forEach(receptor => {
        residueCounters[receptor.geneName] = 0;
    });
    const accumulatedMappings = [];
    const referenceGeneName = receptorSequences[0].geneName;

    for (let i = 0; i < sequenceLength; i++) {
        const mapping = {};

        receptorSequences.forEach(receptor => {
            const aa = receptor.sequence[i];
            if (aa !== '-') {
                residueCounters[receptor.geneName] += 1;
                mapping[`${receptor.geneName}_resNum`] = residueCounters[receptor.geneName].toString();
                mapping[`${receptor.geneName}_AA`] = aa;
                if (
                    conservationDataMap[receptor.geneName] &&
                    conservationDataMap[receptor.geneName][residueCounters[receptor.geneName].toString()]
                ) {
                    mapping[`${receptor.geneName}_Conservation`] =
                        conservationDataMap[receptor.geneName][residueCounters[receptor.geneName].toString()]
                            .conservation.toFixed(2) + '%';
                    mapping[`${receptor.geneName}_Conserved_AA`] =
                    conservationDataMap[receptor.geneName][residueCounters[receptor.geneName].toString()].conservedAA;
                        
                    // For the reference receptor, add region and gpcrdb fields
                    if (receptor.geneName === referenceGeneName) {
                        mapping[`${receptor.geneName}_region`] =
                            conservationDataMap[receptor.geneName][residueCounters[receptor.geneName].toString()].region;
                        mapping[`${receptor.geneName}_gpcrdb`] =
                            conservationDataMap[receptor.geneName][residueCounters[receptor.geneName].toString()].gpcrdb;
                    }
                } else {
                    mapping[`${receptor.geneName}_Conservation`] = '-';
                    mapping[`${receptor.geneName}_Conserved_AA`] = '-';
                    if (receptor.geneName === referenceGeneName) {
                        mapping[`${receptor.geneName}_region`] = '-';
                        mapping[`${receptor.geneName}_gpcrdb`] = '-';
                    }
                }
            } else {
                mapping[`${receptor.geneName}_resNum`] = '-';
                mapping[`${receptor.geneName}_AA`] = '-';
                mapping[`${receptor.geneName}_Conservation`] = '-';
                mapping[`${receptor.geneName}_Conserved_AA`] = '-';
                if (receptor.geneName === referenceGeneName) {
                    mapping[`${receptor.geneName}_region`] = '-';
                    mapping[`${receptor.geneName}_gpcrdb`] = '-';
                }
            }
        });

        // Include mapping only if the reference receptor has a residue (not a gap)
        if (mapping[`${referenceGeneName}_resNum`] !== '-') {
            accumulatedMappings.push(mapping);
        }
    }

    console.log("Accumulated Mappings (All Receptors):", accumulatedMappings);
    return accumulatedMappings;
}

/**
 * Handles the form submission for residue mapping.
 * Retrieves sequences, conservation data, maps residues, creates a dataframe, and displays it.
 */
async function residueMap_handleFormSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    const referenceInputValue = referenceInput.value.trim();
    const targetInputValue = targetInput.value.trim();
    const residueInputValue = residueInput.value.trim(); // Residue numbers input
    const includeConservation = conservationCheckbox.checked; // Checkbox state

    // Parse target receptor names
    const targetReceptorNames = targetInputValue.split(",").map(name => name.trim()).filter(name => name !== "");

    // Parse residue numbers if provided
    let residueNumbers = [];
    if (residueInputValue) {
        residueNumbers = residueInputValue.split(",").map(num => num.trim()).filter(num => num !== "").map(num => parseInt(num, 10));
        const invalidNumbers = residueNumbers.filter(num => isNaN(num) || num <= 0);
        if (invalidNumbers.length > 0) {
            resultDiv.innerHTML = "<div class='alert alert-warning'>Please enter valid positive integers for residue numbers, separated by commas.</div>";
            return;
        }
        residueNumbers = [...new Set(residueNumbers)];
    }

    // Basic validation
    if (!referenceInputValue) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please select a reference receptor.</div>";
        return;
    }
    if (targetReceptorNames.length === 0) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Please select at least one target receptor.</div>";
        return;
    }
    if (targetReceptorNames.includes(referenceInputValue)) {
        resultDiv.innerHTML = "<div class='alert alert-warning'>Target receptors must be different from the reference receptor.</div>";
        return;
    }

    // Retrieve receptor data from receptorsData loaded from receptor.json
    const referenceReceptor = receptorsData.find(r => r.geneName.toLowerCase() === referenceInputValue.toLowerCase());
    const targetReceptors = targetReceptorNames.map(name =>
        receptorsData.find(r => r.geneName.toLowerCase() === name.toLowerCase())
    );

    if (!referenceReceptor) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: Reference receptor not found.</div>";
        console.error("Reference receptor data not found for:", referenceInputValue);
        return;
    }
    if (targetReceptors.includes(undefined)) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: One or more target receptors not found.</div>";
        console.error("Target receptor data not found for:", targetReceptorNames);
        return;
    }

    // Ensure all receptors belong to the same class
    const receptorClass = referenceReceptor.class;
    const allSameClass = targetReceptors.every(r => r.class === receptorClass);
    if (!allSameClass) {
        resultDiv.innerHTML = "<div class='alert alert-danger'>Error: All receptors must belong to the same class as the reference receptor.</div>";
        console.error("Mismatched classes between reference and target receptors.");
        return;
    }

    // File path for the alignment FASTA file
    const fastaFilePath = `${ALIGNMENT_DIR}/class${receptorClass}_humans_MSA.fasta`;

    try {
        // Fetch and process alignment data
        const sequences = await residueMap_readFastaFile(fastaFilePath);
        const receptorNames = [referenceReceptor.geneName, ...targetReceptorNames];
        const receptorSequences = [referenceReceptor, ...targetReceptors].map(r => {
            const seq = sequences[r.geneName];
            if (!seq) {
                throw new Error(`Sequence for ${r.geneName} not found in the FASTA file.`);
            }
            return { geneName: r.geneName, sequence: seq, conservationFile: r.conservationFile };
        });

        let conservationDataMap = {};
        if (includeConservation) {
            // Load conservation data using each receptor's conservationFile property from receptor.json
            const conservationPromises = receptorSequences.map(receptor => {
                const conservationFilePath = receptor.conservationFile;
                return readConservationData(conservationFilePath)
                    .then(data => ({ geneName: receptor.geneName, data }))
                    .catch(error => {
                        console.warn(`Conservation data for ${receptor.geneName} could not be loaded.`);
                        return { geneName: receptor.geneName, data: {} };
                    });
            });

            const conservationResults = await Promise.all(conservationPromises);
            conservationResults.forEach(result => {
                conservationDataMap[result.geneName] = result.data;
            });
        }

        // Map residues using the updated function (includes region and gpcrdb for reference)
        const accumulatedData = residueMap_mapResiduesAllReceptors(receptorSequences, conservationDataMap);

        // Filter accumulated data based on residue numbers if provided
        let filteredData = accumulatedData;
        if (residueNumbers.length > 0) {
            filteredData = accumulatedData.filter(row => {
                const refResNum = parseInt(row[`${referenceReceptor.geneName}_resNum`], 10);
                return residueNumbers.includes(refResNum);
            });
            if (filteredData.length === 0) {
                resultDiv.innerHTML = "<div class='alert alert-info'>No residues matched the specified residue numbers.</div>";
                return;
            }
        }

        // Create the dataframe (includes extra columns for Region and GPCRdb for the reference receptor)
        const dataframe = residueMap_createResidueDataframe(filteredData, receptorNames, includeConservation);
        // Display the dataframe using Tabulator with unified styling
        residueMap_displayDataframe(dataframe, receptorNames, includeConservation);

    } catch (error) {
        resultDiv.innerHTML = `<div class='alert alert-danger'>Error: ${error.message}</div>`;
        console.error(error);
    }
}

/**
 * Reads aligned sequences from a FASTA file.
 * Parses headers to extract gene names.
 */
function residueMap_readFastaFile(fastaFilePath) {
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
                    // Split the header by "|" and then by "_"
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
            console.log("Parsed Sequences:", sequences);
            return sequences;
        });
}

/**
 * Creates a dataframe mapping residues, amino acids, and conservation data.
 * If conservation data is included, extra columns for Region and GPCRdb of the reference receptor are added.
 */
function residueMap_createResidueDataframe(accumulatedData, receptorNames, includeConservation) {
    const dataframe = [];

    accumulatedData.forEach(row => {
        const dataframeRow = {};

        if (includeConservation) {
            // Add extra columns for the reference receptor (assumed to be the first)
            const refReceptor = receptorNames[0];
            dataframeRow[`${refReceptor}_Region`] = row[`${refReceptor}_region`] || "-";
            dataframeRow[`${refReceptor}_GPCRdb`] = row[`${refReceptor}_gpcrdb`] || "-";
        }

        receptorNames.forEach(receptor => {
            dataframeRow[`${receptor}_resNum`] = row[`${receptor}_resNum`];
            dataframeRow[`${receptor}_AA`] = row[`${receptor}_AA`];
            dataframeRow[`${receptor}_Conservation (%)`] = row[`${receptor}_Conservation`];
            dataframeRow[`${receptor}_Conserved_AA`] = row[`${receptor}_Conserved_AA`];
        });

        dataframe.push(dataframeRow);
    });

    console.log("Dataframe Created:", dataframe);
    return dataframe;
}

/**
 * Displays the dataframe in the resultDiv using Tabulator.
 * Includes extra columns for Region and GPCRdb for the reference receptor if conservation data is included.
 */
function residueMap_displayDataframe(dataframe, receptorNames, includeConservation) {
    // Clear previous results and create a container for Tabulator
    resultDiv.innerHTML = "<div id='results-table'></div>";

    if (dataframe.length === 0) {
        resultDiv.innerHTML = "<div class='alert alert-info'>No residues were mapped.</div>";
        return;
    }

    let columns = [];
        if (includeConservation) {
            const refReceptor = receptorNames[0];
            columns.push({
                title: "Region",
                field: refReceptor + "_Region",
                headerFilter: "input",
                headerSort: false

            });
            columns.push({
                title: "GPCRdb #",
                field: refReceptor + "_GPCRdb",
                headerFilter: "input",
                headerSort: false
            });
        }
        
        receptorNames.forEach(receptor => {
            // Create a combined "Residue" column with a dedicated field.
            columns.push({
                title: receptor + " Residue",
                field: receptor + "_Residue", // New field to hold the combined value
                headerFilter: "input",
                headerSort: false,
                mutator: function(value, data) {
                    // Combine amino acid and residue number
                    return data[receptor + "_AA"] + data[receptor + "_resNum"];
                },
                formatter: "plaintext"
            });
        
            if (includeConservation) {
                // Create a combined "Conservation" column with a dedicated field.
                columns.push({
                    title: "Conservation",
                    field: receptor + "_Conservation", // New field for combined conservation info
                    headerFilter: "input",
                    headerSort: false,
                    mutator: function(value, data) {
                        // Combine conserved AA and conservation percentage with a space
                        return data[receptor + "_Conserved_AA"] + " " + data[receptor + "_Conservation (%)"];
                    },
                    formatter: "plaintext"
                });
            }
        });


    let table = new Tabulator("#results-table", {
        data: dataframe,
        columns: columns,
        layout: "fitDataStretch",
        height: "50vh"
    });

    const downloadButton = document.createElement("button");
    downloadButton.innerText = "Download Results as TSV";
    downloadButton.classList.add("btn", "btn-primary", "mb-3");
    downloadButton.style.cursor = "pointer";
    downloadButton.addEventListener("click", function () {
        table.download("csv", "residue_mapping_results.tsv", {
            delimiter: "\t", // use tab as the delimiter

        });
    });

    resultDiv.insertBefore(downloadButton, document.getElementById("results-table"));
}

// Assign the event listener for the form submission
mappingForm.addEventListener("submit", residueMap_handleFormSubmit);

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", residueMap_initializeApp);
